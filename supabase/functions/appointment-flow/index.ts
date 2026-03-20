import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, conversation_id, clinic_id, patient_message } = await req.json();
    console.log("appointment-flow called:", { action, conversation_id, clinic_id });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ====== ACTION: DETECT INTENT ======
    if (action === "detect_intent") {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, appointment_flow_active, pipeline_tab, appointment_date, contact_id")
        .eq("id", conversation_id)
        .single();

      if (!conv) throw new Error("Conversation not found");

      // Skip if already in appointment flow or already has an active appointment
      if (conv.appointment_flow_active) {
        return jsonResponse({ already_in_flow: true });
      }

      // If already agendado, check for reschedule
      if (conv.pipeline_tab === "agendados" && conv.appointment_date) {
        // Detect confirmation/cancel/reschedule instead
        return jsonResponse({ skip: true, reason: "already_agendado" });
      }

      // Fetch last 10 messages for context
      const { data: messages } = await supabase
        .from("messages")
        .select("direction, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages) messages.reverse();
      const msgContext = (messages || []).map(m =>
        `${m.direction === "inbound" ? "Cliente" : "Agente"}: ${m.content}`
      ).join("\n");

      const detectPrompt = `Analiza el mensaje del paciente en contexto de la conversación.

CONVERSACIÓN:
${msgContext}

MENSAJE: "${patient_message}"

¿Quiere agendar una cita?

SÍ: "Quiero agendar", "Me gustaría una cita", "¿Puedo ir mañana?",
"Sí agéndame", "Ok cuándo puedo ir", "Dale reserva", "Para cuándo hay espacio"

NO: Solo preguntar precios, pedir info general, "lo voy a pensar",
preguntar horarios sin intención de reservar

Responde SOLO JSON válido:
{
  "wants_appointment": true/false,
  "has_date": true/false, "date_mentioned": "2026-03-25" o null,
  "has_time": true/false, "time_mentioned": "10:00" o null,
  "has_service": true/false, "service_mentioned": "consulta general" o null,
  "confidence": 0.0-1.0
}`;

      const aiResp = await callAI(LOVABLE_API_KEY, detectPrompt, "Analiza el mensaje.");
      let parsed: any = {};
      try {
        const cleaned = aiResp.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse intent detection:", aiResp);
        return jsonResponse({ wants_appointment: false, confidence: 0, raw: aiResp });
      }

      // If confidence >= 0.7, activate flow
      if (parsed.wants_appointment && parsed.confidence >= 0.7) {
        const flowData: any = {};
        if (parsed.has_service) flowData.service = parsed.service_mentioned;
        if (parsed.has_date) flowData.date = parsed.date_mentioned;
        if (parsed.has_time) flowData.time = parsed.time_mentioned;

        const missingFields = [];
        if (!flowData.service) missingFields.push("service");
        if (!flowData.date) missingFields.push("date");
        if (!flowData.time) missingFields.push("time");

        const step = missingFields.length === 0 ? "confirm" : missingFields[0];

        await supabase.from("conversations").update({
          appointment_flow_active: true,
          appointment_flow_step: step,
          appointment_flow_data: flowData,
        }).eq("id", conversation_id);

        return jsonResponse({
          wants_appointment: true,
          confidence: parsed.confidence,
          flow_activated: true,
          flow_data: flowData,
          next_step: step,
        });
      }

      return jsonResponse({
        wants_appointment: parsed.wants_appointment || false,
        confidence: parsed.confidence || 0,
        needs_confirmation: parsed.confidence >= 0.4 && parsed.confidence < 0.7,
      });
    }

    // ====== ACTION: GUIDED FLOW (collect data step by step) ======
    if (action === "guided_flow") {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, clinic_id, contact_id, appointment_flow_active, appointment_flow_step, appointment_flow_data, pipeline_tab, channel, visitor_contact")
        .eq("id", conversation_id)
        .single();

      if (!conv || !conv.appointment_flow_active) {
        return jsonResponse({ error: "Flow not active" });
      }

      // Fetch clinic services
      const { data: services } = await supabase
        .from("clinic_services")
        .select("name, description, duration_minutes, price")
        .eq("clinic_id", clinic_id)
        .eq("is_active", true);

      // Fetch branches
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, address, google_maps_url")
        .eq("clinic_id", clinic_id)
        .eq("active", true);

      // Fetch agent config
      const { data: agentConfig } = await supabase
        .from("ai_agent_config")
        .select("agent_name")
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", clinic_id)
        .single();

      const flowData = (conv.appointment_flow_data || {}) as Record<string, any>;
      const agentName = agentConfig?.agent_name || "Asistente";
      const clinicName = clinic?.name || "nuestro negocio";

      const servicesText = (services || []).map(s =>
        `• ${s.name}${s.price ? ` — $${s.price}` : ""}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}`
      ).join("\n") || "(sin servicios configurados)";

      const branchesText = (branches || []).map(b => `• ${b.name}: ${b.address || ""}`)
        .join("\n") || "(sin sucursales)";

      const guidedPrompt = `Eres ${agentName} de ${clinicName}. Ayudas a agendar una cita.

DATOS RECOPILADOS HASTA AHORA:
- Servicio: ${flowData.service || "❌ Sin definir"}
- Fecha: ${flowData.date || "❌ Sin definir"}
- Hora: ${flowData.time || "❌ Sin definir"}

SERVICIOS DISPONIBLES:
${servicesText}

SUCURSALES:
${branchesText}

PASO ACTUAL: ${conv.appointment_flow_step}
MENSAJE DEL PACIENTE: "${patient_message}"

INSTRUCCIONES:
1. Extrae datos nuevos del mensaje del paciente
2. Si tienes los 3 datos (servicio + fecha + hora): pide confirmación resumiendo la cita
3. Si falta algún dato: pregunta SOLO lo que falta de forma amable
4. Si el paciente quiere cancelar el agendamiento: respétalo
5. No aceptes fechas en el pasado
6. Tono cálido y breve (máximo 2-3 oraciones)

Responde SOLO JSON válido:
{
  "response_text": "mensaje para el paciente",
  "updated_data": { "service": "valor o null", "date": "YYYY-MM-DD o null", "time": "HH:MM o null" },
  "flow_complete": false,
  "patient_cancelled": false
}`;

      const aiResp = await callAI(LOVABLE_API_KEY, guidedPrompt, patient_message);
      let parsed: any = {};
      try {
        const cleaned = aiResp.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse guided flow:", aiResp);
        return jsonResponse({ error: "AI parse error", raw: aiResp });
      }

      // Merge updated data
      const updated = parsed.updated_data || {};
      if (updated.service) flowData.service = updated.service;
      if (updated.date) flowData.date = updated.date;
      if (updated.time) flowData.time = updated.time;

      // Validate date not in past
      if (flowData.date) {
        const dateObj = new Date(flowData.date + "T23:59:59");
        if (dateObj < new Date()) {
          flowData.date = null;
          parsed.response_text = "Esa fecha ya pasó. ¿Qué día te funciona?";
          parsed.flow_complete = false;
        }
      }

      if (parsed.patient_cancelled) {
        await supabase.from("conversations").update({
          appointment_flow_active: false,
          appointment_flow_step: null,
          appointment_flow_data: {},
        }).eq("id", conversation_id);

        return jsonResponse({
          response_text: parsed.response_text || "Sin problema. Cuando quieras agendar, aquí estoy. 😊",
          flow_cancelled: true,
        });
      }

      // Determine next step
      const missingFields = [];
      if (!flowData.service) missingFields.push("service");
      if (!flowData.date) missingFields.push("date");
      if (!flowData.time) missingFields.push("time");
      const nextStep = missingFields.length === 0 ? "confirm" : missingFields[0];

      await supabase.from("conversations").update({
        appointment_flow_step: nextStep,
        appointment_flow_data: flowData,
      }).eq("id", conversation_id);

      // If flow complete (patient confirmed all 3 and AI says complete)
      if (parsed.flow_complete && missingFields.length === 0) {
        return await confirmAppointment(supabase, supabaseUrl, supabaseKey, conv, flowData, clinic_id, agentName, clinicName, branches);
      }

      return jsonResponse({
        response_text: parsed.response_text,
        flow_data: flowData,
        next_step: nextStep,
        flow_complete: false,
      });
    }

    // ====== ACTION: CONFIRM (patient says yes to summary) ======
    if (action === "confirm") {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, clinic_id, contact_id, appointment_flow_data, pipeline_tab, channel, visitor_contact")
        .eq("id", conversation_id)
        .single();

      if (!conv) throw new Error("Conversation not found");

      const flowData = (conv.appointment_flow_data || {}) as Record<string, any>;
      if (!flowData.service || !flowData.date || !flowData.time) {
        return jsonResponse({ error: "Incomplete data", flow_data: flowData });
      }

      const { data: agentConfig } = await supabase.from("ai_agent_config")
        .select("agent_name").eq("clinic_id", clinic_id).maybeSingle();
      const { data: clinic } = await supabase.from("clinics").select("name").eq("id", clinic_id).single();
      const { data: branches } = await supabase.from("branches")
        .select("id, name, address, google_maps_url").eq("clinic_id", clinic_id).eq("active", true);

      return await confirmAppointment(
        supabase, supabaseUrl, supabaseKey, conv, flowData, clinic_id,
        agentConfig?.agent_name || "Asistente", clinic?.name || "el negocio", branches,
      );
    }

    // ====== ACTION: DETECT CONFIRMATION/CANCEL/RESCHEDULE (for agendados) ======
    if (action === "detect_response") {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, clinic_id, contact_id, pipeline_tab, appointment_confirmed, appointment_date, appointment_time, appointment_service")
        .eq("id", conversation_id)
        .single();

      if (!conv || conv.pipeline_tab !== "agendados") {
        return jsonResponse({ skip: true, reason: "not_agendado" });
      }

      if (conv.appointment_confirmed) {
        return jsonResponse({ already_confirmed: true });
      }

      const detectPrompt = `El paciente tiene una cita agendada:
- Servicio: ${conv.appointment_service || "no especificado"}
- Fecha: ${conv.appointment_date || "no especificada"}
- Hora: ${conv.appointment_time || "no especificada"}

El paciente responde: "${patient_message}"

¿Qué intención tiene?
- CONFIRMED: confirma que asistirá ("sí", "confirmo", "ahí estaré", "ok", "listo")
- CANCEL: quiere cancelar ("no puedo", "cancela", "no voy a ir")
- RESCHEDULE: quiere cambiar fecha/hora ("puedo otro día", "cambiar la hora")
- OTHER: pregunta algo diferente, no relacionado con confirmar/cancelar

Responde SOLO JSON: { "intent": "CONFIRMED|CANCEL|RESCHEDULE|OTHER" }`;

      const aiResp = await callAI(LOVABLE_API_KEY, detectPrompt, "Analiza la intención.");
      let parsed: any = { intent: "OTHER" };
      try {
        const cleaned = aiResp.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch { /* default to OTHER */ }

      const intent = parsed.intent || "OTHER";

      if (intent === "CONFIRMED") {
        await supabase.from("conversations").update({
          appointment_confirmed: true,
          appointment_confirmed_at: new Date().toISOString(),
          appointment_status: "confirmado",
        }).eq("id", conversation_id);

        // Send location info
        const { data: branches } = await supabase.from("branches")
          .select("name, full_address, address, google_maps_url, arrival_instructions, preparation_notes")
          .eq("clinic_id", clinic_id)
          .eq("active", true)
          .limit(1)
          .maybeSingle();

        let locationMsg = "¡Perfecto, te esperamos! 🎉";
        if (branches) {
          locationMsg = `¡Genial, tu cita está confirmada! 🎉\n\n📍 ${branches.name || "Nuestra ubicación"}`;
          if (branches.full_address || branches.address) {
            locationMsg += `\n${branches.full_address || branches.address}`;
          }
          if (branches.google_maps_url) {
            locationMsg += `\n🗺️ ${branches.google_maps_url}`;
          }
          if (branches.arrival_instructions) {
            locationMsg += `\n\n📌 ${branches.arrival_instructions}`;
          }
          if (branches.preparation_notes) {
            locationMsg += `\n\n📋 ${branches.preparation_notes}`;
          }
        }

        await supabase.from("conversation_pipeline_history").insert({
          conversation_id, clinic_id,
          from_tab: "agendados", to_tab: "agendados",
          moved_by: "system", reason: "Paciente confirmó asistencia",
        });

        return jsonResponse({ intent: "CONFIRMED", response_text: locationMsg, send_response: true });
      }

      if (intent === "CANCEL") {
        return jsonResponse({
          intent: "CANCEL",
          response_text: "Entiendo. ¿Te gustaría reagendar para otro momento? 😊",
          send_response: true,
        });
      }

      if (intent === "RESCHEDULE") {
        // Reactivate flow
        await supabase.from("conversations").update({
          appointment_flow_active: true,
          appointment_flow_step: "date",
          appointment_flow_data: { service: conv.appointment_service },
          appointment_reminder_1_sent: false,
          appointment_reminder_2_sent: false,
          appointment_reminder_1_sent_at: null,
          appointment_reminder_2_sent_at: null,
          appointment_confirmed: false,
          appointment_status: "agendado",
        }).eq("id", conversation_id);

        // Cancel pending reminders in queue
        await supabase.from("pipeline_message_queue").update({
          status: "cancelled",
          last_error: "Patient rescheduling",
        }).eq("conversation_id", conversation_id).in("status", ["pending", "retry"]);

        return jsonResponse({
          intent: "RESCHEDULE",
          response_text: "¡Claro! ¿Qué día y hora te funcionan mejor?",
          flow_reactivated: true,
          send_response: true,
        });
      }

      return jsonResponse({ intent: "OTHER", send_response: false });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("appointment-flow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ====== HELPERS ======

async function callAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
      max_tokens: 400,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI error: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function confirmAppointment(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  conv: any,
  flowData: Record<string, any>,
  clinicId: string,
  agentName: string,
  clinicName: string,
  branches: any[] | null,
) {
  const previousTab = conv.pipeline_tab;
  const branch = branches?.[0];

  // Get contact name
  let contactName = "amigo/a";
  if (conv.contact_id) {
    const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
    if (contact?.name) contactName = contact.name.split(" ")[0];
  }

  // 1. Move to agendados
  await supabase.from("conversations").update({
    pipeline_tab: "agendados",
    appointment_date: flowData.date,
    appointment_time: flowData.time,
    appointment_service: flowData.service,
    appointment_branch_id: branch?.id || null,
    appointment_status: "agendado",
    appointment_flow_active: false,
    appointment_flow_step: null,
    appointment_flow_data: {},
    appointment_confirmed: false,
    appointment_attended: null,
    appointment_had_sale: null,
    appointment_reminder_1_sent: false,
    appointment_reminder_2_sent: false,
    appointment_reminder_1_sent_at: null,
    appointment_reminder_2_sent_at: null,
    appointment_confirmation_message_sent: false,
    seguimiento_next_contact_at: null,
    seguimiento_contact_number: 0,
    inactivity_timer_start: null,
  }).eq("id", conv.id);

  // 2. Cancel queue messages
  await supabase.from("pipeline_message_queue").update({
    status: "cancelled",
    last_error: "Appointment confirmed, queue cleared",
  }).eq("conversation_id", conv.id).in("status", ["pending", "retry", "processing"]);

  // 3. Build confirmation message
  const dateFormatted = formatDateES(flowData.date);
  const confirmMsg = `¡Listo ${contactName}! Tu cita está agendada 🎉\n\n📅 ${dateFormatted}\n🕐 ${flowData.time}\n💼 ${flowData.service}${branch ? `\n🏥 ${branch.name}` : ""}\n\nTe enviaremos un recordatorio antes de tu cita. ¡Te esperamos!`;

  // 4. Log history
  await supabase.from("conversation_pipeline_history").insert({
    conversation_id: conv.id,
    clinic_id: clinicId,
    from_tab: previousTab || "resueltos_ia",
    to_tab: "agendados",
    moved_by: "system",
    reason: `Agendado automáticamente desde ${previousTab || "desconocido"}: ${flowData.service} el ${flowData.date} a las ${flowData.time}`,
  });

  return jsonResponse({
    confirmed: true,
    response_text: confirmMsg,
    send_response: true,
    appointment: {
      date: flowData.date,
      time: flowData.time,
      service: flowData.service,
      branch: branch?.name || null,
    },
  });
}

function formatDateES(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return dateStr;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Content-Type": "application/json",
    },
  });
}
