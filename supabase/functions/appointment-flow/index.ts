import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === DUAL AUTH CHECK ===
async function verifyAuth(req: Request, supabaseUrl: string): Promise<{ authorized: boolean; source: string }> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) return { authorized: true, source: "cron" };
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false, source: "no_header" };
  const token = authHeader.replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (token === serviceKey) return { authorized: true, source: "service_role" };
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (token === anonKey) return { authorized: true, source: "anon_trigger" };
  try {
    const { createClient: cc } = await import("https://esm.sh/@supabase/supabase-js@2");
    const c = cc(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await c.auth.getUser();
    if (error || !data?.user) return { authorized: false, source: "invalid_jwt" };
    return { authorized: true, source: "user_jwt" };
  } catch { return { authorized: false, source: "jwt_error" }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const auth = await verifyAuth(req, supabaseUrl);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, conversation_id, clinic_id, patient_message } = await req.json();
    console.log("appointment-flow called:", { action, conversation_id, clinic_id, authSource: auth.source });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

      // Fetch last 15 messages for context
      const { data: messages } = await supabase
        .from("messages")
        .select("direction, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(15);

      if (messages) messages.reverse();
      const msgContext = (messages || []).map(m =>
        `${m.direction === "inbound" ? "Cliente" : "Agente"}: ${m.content}`
      ).join("\n");

      // Fetch available services to help AI match from context
      const { data: agentCfg } = await supabase
        .from("ai_agent_config")
        .select("services, treatments_text")
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      const availableServices = ((agentCfg?.services || []) as { name: string }[]).map(s => s.name).join(", ");
      const treatmentsRef = agentCfg?.treatments_text || "";

      // Fetch clinic timezone and working days
      const { data: clinicData } = await supabase
        .from("clinics")
        .select("timezone, working_days, opening_hour, closing_hour, working_schedule")
        .eq("id", clinic_id)
        .maybeSingle();
      const tz = clinicData?.timezone || "America/Guayaquil";
      const workingDays: string[] = deriveWorkingDays(clinicData?.working_schedule as any, clinicData?.working_days as any);
      const todayInfo = getLocalDateInfo(tz);
      const today = todayInfo.iso;
      const dayOfWeek = DAY_NAMES_ES[todayInfo.weekday];
      const calRefDetect = buildCalendarReference(todayInfo, 14, workingDays, blockedDaysSet);
      const detectedDateResolution = resolveDateReferenceFromMessage(patient_message, tz);

      // Fetch blocked days (global ones for detection phase — branch-specific checked at confirmation)
      const { data: blockedDaysData } = await supabase
        .from("blocked_days")
        .select("date, reason, branch_id")
        .eq("clinic_id", clinic_id);
      // For calendar display, show globally blocked days (branch_id is null)
      const globalBlocked = (blockedDaysData || []).filter((b: any) => b.branch_id === null);
      const blockedDaysSet = new Set(globalBlocked.map((b: any) => b.date));
      const blockedDaysList = globalBlocked.map((b: any) => `${b.date}${b.reason ? ` (${b.reason})` : ""}`).join(", ");

      // Build non-working days info
      const nonWorkingDaysInfo = buildNonWorkingDaysInfo(workingDays);

      const detectPrompt = `Analiza el mensaje del paciente en contexto de TODA la conversación.

FECHA DE HOY: ${today} (${dayOfWeek})

CALENDARIO (próximos 14 días — los días marcados ❌ NO tienen servicio):
${calRefDetect.join("\n")}
${nonWorkingDaysInfo}
${blockedDaysList ? `\n🚫 DÍAS BLOQUEADOS (NO se pueden agendar citas): ${blockedDaysList}` : ""}
${detectedDateResolution ? `\n${buildDateResolutionInstruction(detectedDateResolution)}\n` : ""}

SERVICIOS DISPONIBLES DEL NEGOCIO:
${availableServices || "(sin servicios)"}
${treatmentsRef ? `\nTRATAMIENTOS:\n${treatmentsRef}` : ""}

CONVERSACIÓN COMPLETA:
${msgContext}

ÚLTIMO MENSAJE: "${patient_message}"

¿Quiere agendar una cita?

SÍ: "Quiero agendar", "Me gustaría una cita", "¿Puedo ir mañana?",
"Sí agéndame", "Ok cuándo puedo ir", "Dale reserva", "Para cuándo hay espacio"

NO: Solo preguntar precios, pedir info general, "lo voy a pensar",
preguntar horarios sin intención de reservar

IMPORTANTE SOBRE EL SERVICIO:
- Revisa TODA la conversación previa. Si el cliente ya preguntó o habló sobre un servicio específico (ej: "¿cuánto cuesta la consulta?", "me interesa el tratamiento X"), ESE es el servicio que quiere agendar.
- Mapea lo que el cliente mencionó al servicio más cercano de los SERVICIOS DISPONIBLES arriba.
- Si el paciente menciona una fecha relativa ("mañana", "el viernes"), resuélvela a YYYY-MM-DD.

Responde SOLO JSON válido:
{
  "wants_appointment": true/false,
  "has_date": true/false, "date_mentioned": "2026-03-25" o null,
  "has_time": true/false, "time_mentioned": "10:00" o null,
  "has_service": true/false, "service_mentioned": "nombre del servicio" o null,
  "confidence": 0.0-1.0
}`;

      const aiResp = await callAI(LOVABLE_API_KEY, detectPrompt, "Analiza el mensaje.");
      await logAppointmentFlowUsage(supabase, clinic_id, "Detección de intención de cita");
      let parsed: any = {};
      try {
        const cleaned = aiResp.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse intent detection:", aiResp);
        return jsonResponse({ wants_appointment: false, confidence: 0, raw: aiResp });
      }

      if (detectedDateResolution?.type === "single") {
        parsed.has_date = true;
        parsed.date_mentioned = detectedDateResolution.iso;
      }

      // If confidence >= 0.7, activate flow
      if (parsed.wants_appointment && parsed.confidence >= 0.7) {
        const flowData: any = {};
        if (parsed.has_service) flowData.service = parsed.service_mentioned;
        if (parsed.has_date) flowData.date = parsed.date_mentioned;
        if (parsed.has_time) flowData.time = parsed.time_mentioned;

        // Validate date against working days
        if (flowData.date && !isWorkingDay(flowData.date, workingDays)) {
          console.log(`[appointment-flow] Date ${flowData.date} is NOT a working day, clearing it`);
          flowData.date = null;
        }

        // Validate date against blocked days
        if (flowData.date && blockedDaysSet.has(flowData.date)) {
          console.log(`[appointment-flow] Date ${flowData.date} is blocked, clearing it`);
          flowData.date = null;
        }

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

      // ====== DETERMINISTIC CONFIRMATION: If step is "confirm" and all data present, check for clear confirmation ======
      const flowDataPre = (conv.appointment_flow_data || {}) as Record<string, any>;
      if (conv.appointment_flow_step === "confirm" && flowDataPre.service && flowDataPre.date && flowDataPre.time) {
        const msgLower = (patient_message || "").toLowerCase().trim().replace(/[.,!¡¿?]/g, "");
        const confirmPatterns = [
          "confirmar", "confirmo", "si", "sí", "ok", "dale", "listo", "perfecto",
          "si por favor", "sí por favor", "va", "claro", "de acuerdo", "bueno",
          "esta bien", "está bien", "genial", "me parece bien", "reserva",
          "agendame", "agéndame", "si quiero", "sí quiero", "afirmativo",
          "correcto", "exacto", "eso", "si confirmo", "sí confirmo",
        ];
        const isConfirmation = confirmPatterns.some(p => msgLower === p || msgLower.startsWith(p + " ") || msgLower.endsWith(" " + p));
        const cancelPatterns = ["no", "cancelar", "cancela", "no quiero", "mejor no", "dejalo", "déjalo"];
        const isCancellation = cancelPatterns.some(p => msgLower === p || msgLower.startsWith(p + " "));

        if (isConfirmation && !isCancellation) {
          console.log("[appointment-flow] Deterministic confirmation detected, booking directly");
          const { data: agentCfgDirect } = await supabase.from("ai_agent_config")
            .select("agent_name, locations_text").eq("clinic_id", clinic_id).maybeSingle();
          const { data: clinicDirect } = await supabase.from("clinics").select("name").eq("id", clinic_id).single();
          const { data: branchesDirect } = await supabase.from("branches")
            .select("id, name, address, google_maps_url").eq("clinic_id", clinic_id).eq("active", true);

          return await confirmAppointment(
            supabase, supabaseUrl, supabaseKey, conv, flowDataPre, clinic_id,
            agentCfgDirect?.agent_name || "Asistente", clinicDirect?.name || "el negocio", branchesDirect,
            agentCfgDirect?.locations_text || null,
          );
        }
      }

      // Fetch recent conversation history for context (last 15 messages)
      const { data: recentMsgs } = await supabase
        .from("messages")
        .select("direction, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (recentMsgs) recentMsgs.reverse();
      const conversationHistory = (recentMsgs || []).map(m =>
        `${m.direction === "inbound" ? "Cliente" : "Agente"}: ${m.content}`
      ).join("\n");

      // Fetch branches
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, address, full_address, phone, whatsapp, google_maps_url, arrival_instructions, preparation_notes, working_schedule")
        .eq("clinic_id", clinic_id)
        .eq("active", true);

      // Fetch agent config (PRIMARY source for services, treatments, prices)
      const { data: agentConfig } = await supabase
        .from("ai_agent_config")
        .select("agent_name, services, treatments_text, prices_text, locations_text, professionals_text, special_instructions")
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      const { data: clinic } = await supabase
        .from("clinics")
        .select("name, timezone, working_days, opening_hour, closing_hour, working_schedule")
        .eq("id", clinic_id)
        .single();
      const guidedWorkingDays: string[] = deriveWorkingDays(clinic?.working_schedule as any, clinic?.working_days as any);

      const flowData = (conv.appointment_flow_data || {}) as Record<string, any>;
      const agentName = agentConfig?.agent_name || "Asistente";
      const clinicName = clinic?.name || "nuestro negocio";

      // Build services text from ai_agent_config (primary source)
      const agentServices = (agentConfig?.services || []) as { name: string; price: string; description: string }[];
      let servicesText = agentServices.map(s =>
        `• ${s.name}${s.price ? ` — $${s.price}` : ""}${s.description ? ` — ${s.description}` : ""}`
      ).join("\n");

      // Add treatments and prices from agent config
      if (agentConfig?.treatments_text) {
        servicesText += (servicesText ? "\n\n" : "") + "TRATAMIENTOS:\n" + agentConfig.treatments_text;
      }
      if (agentConfig?.prices_text) {
        servicesText += (servicesText ? "\n\n" : "") + "PRECIOS:\n" + agentConfig.prices_text;
      }

      if (!servicesText) servicesText = "(sin servicios configurados)";

      // Build locations text with full branch info including schedules
      const dayLabels: Record<string, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };
      let locationsText = agentConfig?.locations_text || "";
      let scheduleText = "";
      if (!locationsText && branches && branches.length > 0) {
        const branchBlocks = branches.map((b: any) => {
          const parts: string[] = [`📍 ${b.name}: ${b.full_address || b.address || ""}`];
          if (b.phone) parts.push(`  Tel: ${b.phone}`);
          if (b.whatsapp) parts.push(`  WA: ${b.whatsapp}`);
          if (b.arrival_instructions) parts.push(`  Llegada: ${b.arrival_instructions}`);
          if (b.preparation_notes) parts.push(`  Preparación: ${b.preparation_notes}`);
          const ws = b.working_schedule as Record<string, { enabled: boolean; open: string; close: string; last_appointment?: string }> | null;
          if (ws) {
            const hasAppointmentCutoff = Object.values(ws).some(v => v?.last_appointment);
            const lines = Object.entries(dayLabels).map(([k, l]) => {
              if (!ws[k]?.enabled) return `    • ${l}: CERRADO`;
              let line = `    • ${l}: ${ws[k].open} a ${ws[k].close}`;
              if (hasAppointmentCutoff && ws[k].last_appointment) {
                line += ` (última cita: ${ws[k].last_appointment})`;
              }
              return line;
            });
            parts.push(`  Horario:\n${lines.join("\n")}`);
            if (hasAppointmentCutoff) {
              parts.push(`  ⚠️ Las citas solo se agendan hasta la hora de "última cita".`);
            }
          }
          return parts.join("\n");
        });
        locationsText = branchBlocks.join("\n\n");
        // Build combined schedule from all branches for validation
        scheduleText = "SEDES Y HORARIOS:\n" + locationsText;
      } else {
        locationsText = locationsText || "(sin ubicaciones configuradas)";
        scheduleText = "(sin horario configurado — revisar sedes)";
      }

      // Include special_instructions if they contain schedule overrides
      const specialInstructions = agentConfig?.special_instructions || "";
      const professionalsText = agentConfig?.professionals_text || "";

      // Compute local date info for this clinic
      const clinicTz = clinic?.timezone || "America/Guayaquil";
      const todayLocalInfo = getLocalDateInfo(clinicTz);
      const todayStr = todayLocalInfo.iso;
      const dayOfWeekStr = DAY_NAMES_ES[todayLocalInfo.weekday];

      // Fetch blocked days — include ALL (global + branch-specific)
      const { data: blockedDaysData } = await supabase
        .from("blocked_days")
        .select("date, reason, branch_id")
        .eq("clinic_id", clinic_id);
      // For calendar display and validation, use ALL blocked days (global + any branch)
      const allBlockedDates = new Set((blockedDaysData || []).map((b: any) => b.date));
      const globalBlocked2 = (blockedDaysData || []).filter((b: any) => b.branch_id === null);
      const blockedDaysSet = new Set(globalBlocked2.map((b: any) => b.date));
      const blockedDaysList = (blockedDaysData || []).map((b: any) => {
        const branchNote = b.branch_id ? " (sede específica)" : " (global)";
        return `${b.date}${b.reason ? ` (${b.reason})` : ""}${branchNote}`;
      }).join(", ");

      // Safety net: hard limit at 6 messages in the CURRENT flow session (last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { count: flowMsgCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation_id)
        .eq("direction", "outbound")
        .like("origin", "appointment_flow%")
        .gte("created_at", twoHoursAgo);

      if ((flowMsgCount || 0) > 6) {
        return await escalateConversation(
          supabase, conversation_id, clinic_id,
          conv.pipeline_tab || "resueltos_ia",
          "El flujo de agendamiento no pudo completarse después de múltiples intentos."
        );
      }

      const calendarRef = buildCalendarReference(todayLocalInfo, 14, guidedWorkingDays);
      const resolvedDate = resolveDateReferenceFromMessage(patient_message, clinicTz);
      const dateInstruction = buildDateResolutionInstruction(resolvedDate);
      const guidedNonWorkingInfo = buildNonWorkingDaysInfo(guidedWorkingDays);

      const guidedPrompt = `Eres ${agentName} de ${clinicName}. Estás ayudando a un paciente a agendar una cita.

FECHA DE HOY: ${todayStr} (${dayOfWeekStr})
ZONA HORARIA: ${clinicTz}

CALENDARIO DE REFERENCIA (próximos 14 días — ❌ = cerrado):
${calendarRef.join("\n")}
${guidedNonWorkingInfo}
${blockedDaysList ? `\n🚫 DÍAS BLOQUEADOS (NO AGENDAR en estas fechas): ${blockedDaysList}\nSi el paciente pide un día bloqueado, explica que no hay disponibilidad ese día y sugiere el día hábil más cercano.` : ""}
${dateInstruction ? `\n${dateInstruction}\n` : ""}


${scheduleText}
${specialInstructions ? `\nINSTRUCCIONES ESPECIALES DEL NEGOCIO:\n${specialInstructions}` : ""}

DATOS RECOPILADOS HASTA AHORA:
- Servicio: ${flowData.service || "❌ Sin definir"}
- Fecha: ${flowData.date || "❌ Sin definir"}
- Hora: ${flowData.time || "❌ Sin definir"}

SERVICIOS DISPONIBLES:
${servicesText}

UBICACIONES / DIRECCIÓN:
${locationsText}
${professionalsText ? `\nPROFESIONALES:\n${professionalsText}` : ""}

HISTORIAL RECIENTE DE LA CONVERSACIÓN:
${conversationHistory}

PASO ACTUAL: ${conv.appointment_flow_step}
ÚLTIMO MENSAJE DEL PACIENTE: "${patient_message}"

=== REGLAS CRÍTICAS ===
1. Solo necesitas recopilar 3 datos: SERVICIO, FECHA y HORA. Nada más.
2. NO pidas correo electrónico. Si necesitas nombre o teléfono, el agente general ya se encargó de eso antes de llegar aquí. Los datos del contacto YA están registrados.
3. Si el paciente envía un nombre, email, teléfono o dice "no tengo correo", simplemente ignóralo y pregunta por lo que realmente falta (servicio, fecha u hora). NUNCA escales por esto.
4. INFERIR SERVICIO DEL CONTEXTO: Si el servicio aún no está definido, revisa el HISTORIAL COMPLETO de la conversación. Si el cliente preguntó o habló sobre un servicio/tratamiento específico antes de pedir agendar, ESE es el servicio. No le preguntes de nuevo; confírmalo directamente. Ejemplo: "Perfecto, ¿entonces agendamos tu cita de [servicio inferido]? ¿Qué día y hora te funcionan?"
5. Si hay varios servicios mencionados en el historial y no es claro cuál quiere, pregunta cuál de ellos desea agendar.
6. Si tienes los 3 datos (servicio + fecha + hora): pide confirmación resumiendo la cita.
7. Si falta algún dato: pregunta SOLO lo que falta de forma amable y directa. Idealmente pregunta fecha y hora juntos si ambos faltan.
8. Si el paciente quiere cancelar: respétalo.
9. No aceptes fechas en el pasado.
10. PRIORIDAD DE HORARIOS: Si las INSTRUCCIONES ESPECIALES contienen horarios específicos, USA ESOS. Prevalecen sobre el HORARIO GENÉRICO.
11. NUNCA ofrezcas citas fuera del horario válido. Sugiere el siguiente día hábil si pide un día no laborable.
12. Tono cálido y breve (máximo 2-3 oraciones).
13. Si el paciente menciona fecha relativa ("mañana", "el viernes"), resuélvela a YYYY-MM-DD usando la FECHA DE HOY como referencia. VERIFICA QUE EL DÍA DE LA SEMANA CORRESPONDA A LA FECHA CALCULADA. Ejemplo: si hoy es domingo 23 y dice "el sábado", el próximo sábado es el 29, NO el 28. Haz la aritmética correctamente.
14. NUNCA inventes servicios, precios, horarios ni datos que no aparezcan aquí.
15A. IMPORTANTE: Cuando menciones una fecha al paciente, SIEMPRE verifica que el día de la semana sea correcto para esa fecha. Si dices "sábado 29 de marzo" asegúrate que el 29 de marzo realmente caiga sábado.
15. NO repitas preguntas que ya se respondieron en el historial. Lee el historial antes de preguntar.
16. Si el paciente parece frustrado o repite información, discúlpate brevemente y ve directo al punto.
17. ESCALACIÓN INTELIGENTE: SOLO escala (should_escalate=true) si el paciente EXPLÍCITAMENTE pide hablar con una persona, o pide algo completamente fuera de tu alcance (ej: servicio que no existe). NO escales si el paciente simplemente dice que no tiene correo, no tiene email, da su nombre, o responde algo que no entiendes — simplemente ignora ese dato y pregunta por lo que falta (servicio, fecha, hora). NO escales si el paciente confirma la cita.
18. Si el paso actual es "confirm" y el paciente dice "sí", "confirmo", "dale", "ok", "listo", "confirmar", "si por favor" o similar, DEBES responder con flow_complete=true. No escales por una confirmación.
19. Si el paciente dice "no tengo correo", "no tengo email", o envía datos personales no solicitados, ignóralos completamente y continúa con el flujo normalmente.

Responde SOLO JSON válido:
{
  "response_text": "mensaje para el paciente",
  "updated_data": { "service": "valor o null", "date": "YYYY-MM-DD o null", "time": "HH:MM o null" },
  "flow_complete": false,
  "patient_cancelled": false,
  "should_escalate": false,
  "escalation_reason": null
}`;

      const aiResp = await callAI(LOVABLE_API_KEY, guidedPrompt, patient_message);
      await logAppointmentFlowUsage(supabase, clinic_id, "Flujo guiado de cita");
      let parsed: any = {};
      try {
        const cleaned = aiResp.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse guided flow:", aiResp);
        return jsonResponse({ error: "AI parse error", raw: aiResp });
      }

      // AI-driven escalation
      if (parsed.should_escalate) {
        const reason = parsed.escalation_reason || "La IA detectó que no puede resolver la solicitud del paciente.";
        return await escalateConversation(supabase, conversation_id, clinic_id, conv.pipeline_tab || "resueltos_ia", reason);
      }

      // Merge updated data, but force system-resolved dates when available
      const updated = parsed.updated_data || {};
      if (resolvedDate?.type === "single") {
        updated.date = resolvedDate.iso;
        parsed.response_text = harmonizeResponseDate(parsed.response_text, resolvedDate);
      }

      if (resolvedDate?.type === "ambiguous") {
        const [firstOption, secondOption] = resolvedDate.options;
        parsed.response_text = `Entendido. ¿Te refieres a ${firstOption.label} o a ${secondOption.label}?`;
        parsed.flow_complete = false;
        delete updated.date;
      }

      if (updated.service) flowData.service = updated.service;
      if (updated.date) flowData.date = updated.date;
      if (updated.time) flowData.time = updated.time;

      // Validate date not in past using clinic-local date
      if (flowData.date && flowData.date < todayStr) {
        flowData.date = null;
        parsed.response_text = "Esa fecha ya pasó. ¿Qué día te funciona?";
        parsed.flow_complete = false;
      }

      // Validate date not blocked
      if (flowData.date && blockedDaysSet.has(flowData.date)) {
        const blockedReason = (blockedDaysData || []).find((b: any) => b.date === flowData.date)?.reason;
        flowData.date = null;
        parsed.response_text = `Lo siento, el día que elegiste no está disponible${blockedReason ? ` (${blockedReason})` : ""}. ¿Te funciona otro día?`;
        parsed.flow_complete = false;
      }

      // Validate date is a working day
      if (flowData.date && !isWorkingDay(flowData.date, guidedWorkingDays)) {
        const dayName = getDayNameFromDate(flowData.date);
        flowData.date = null;
        parsed.response_text = `Lo siento, no atendemos los ${dayName}. Nuestros días de atención son de lunes a viernes. ¿Qué otro día te funciona?`;
        parsed.flow_complete = false;
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
        return await confirmAppointment(supabase, supabaseUrl, supabaseKey, conv, flowData, clinic_id, agentName, clinicName, branches, agentConfig?.locations_text || null);
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

      // Validate blocked day at confirmation time (global or branch-specific)
      const { data: blockedEntries } = await supabase
        .from("blocked_days")
        .select("date, reason, branch_id")
        .eq("clinic_id", clinic_id)
        .eq("date", flowData.date);
      const selectedBranch = flowData.branch_id || null;
      const blockedCheck = (blockedEntries || []).find((b: any) =>
        b.branch_id === null || !selectedBranch || b.branch_id === selectedBranch
      );
      if (blockedCheck) {
        // Reactivate flow to pick a new date
        await supabase.from("conversations").update({
          appointment_flow_step: "date",
          appointment_flow_data: { ...flowData, date: null },
        }).eq("id", conversation_id);
        return jsonResponse({
          response_text: `Lo siento, el día ${flowData.date} ya no está disponible${blockedCheck.reason ? ` (${blockedCheck.reason})` : ""}. ¿Qué otro día te funciona?`,
          flow_complete: false,
          blocked_day: true,
        });
      }

      const { data: agentConfig } = await supabase.from("ai_agent_config")
        .select("agent_name, locations_text").eq("clinic_id", clinic_id).maybeSingle();
      const { data: clinic } = await supabase.from("clinics").select("name").eq("id", clinic_id).single();
      const { data: branches } = await supabase.from("branches")
        .select("id, name, address, google_maps_url").eq("clinic_id", clinic_id).eq("active", true);

      return await confirmAppointment(
        supabase, supabaseUrl, supabaseKey, conv, flowData, clinic_id,
        agentConfig?.agent_name || "Asistente", clinic?.name || "el negocio", branches,
        agentConfig?.locations_text || null,
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
      await logAppointmentFlowUsage(supabase, clinic_id, "Detección respuesta a cita");
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

        // Send location info — prioritize ai_agent_config.locations_text, fallback to branches
        const { data: agentCfg } = await supabase.from("ai_agent_config")
          .select("locations_text").eq("clinic_id", clinic_id).maybeSingle();
        const { data: branchData } = await supabase.from("branches")
          .select("name, full_address, address, google_maps_url, arrival_instructions, preparation_notes")
          .eq("clinic_id", clinic_id).eq("active", true).limit(1).maybeSingle();

        let locationMsg = "¡Genial, tu cita está confirmada! 🎉";
        if (branchData) {
          locationMsg += `\n\n📍 ${branchData.name || "Nuestra ubicación"}`;
          if (branchData.full_address || branchData.address) locationMsg += `\n${branchData.full_address || branchData.address}`;
          if (branchData.google_maps_url) locationMsg += `\n🗺️ ${branchData.google_maps_url}`;
          if (branchData.arrival_instructions) locationMsg += `\n\n📌 ${branchData.arrival_instructions}`;
          if (branchData.preparation_notes) locationMsg += `\n\n📋 ${branchData.preparation_notes}`;
        } else if (agentCfg?.locations_text) {
          locationMsg += `\n\n📍 ${agentCfg.locations_text}`;
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
  // Store usage for logging
  callAI._lastUsage = data.usage || null;
  return data.choices?.[0]?.message?.content?.trim() || "";
}
callAI._lastUsage = null as any;

async function logAppointmentFlowUsage(supabase: any, clinicId: string, actionLabel: string) {
  try {
    const usage = callAI._lastUsage;
    const tokensIn = usage?.prompt_tokens || 0;
    const tokensOut = usage?.completion_tokens || 0;
    const costUsd = (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;
    await supabase.from("ai_token_usage").insert({
      clinic_id: clinicId, user_id: null,
      generator_type: "appointment_flow", model: "google/gemini-2.5-flash",
      tokens_input: tokensIn, tokens_output: tokensOut, cost_usd: costUsd,
      action_label: actionLabel,
    });
  } catch (e) { console.error("[APPT-FLOW] Usage log error:", e); }
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
  locationsText?: string | null,
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

  // 2b. Create appointment record in the appointments table
  // Find or create patient from contact
  let patientId: string | null = null;
  if (conv.contact_id) {
    const { data: contact } = await supabase.from("contacts").select("patient_id, name, phone, email").eq("id", conv.contact_id).single();
    if (contact?.patient_id) {
      patientId = contact.patient_id;
    } else if (contact) {
      // Create patient from contact data
      const nameParts = (contact.name || "").split(" ");
      const { data: newPatient } = await supabase.from("patients").insert({
        clinic_id: clinicId,
        first_name: nameParts[0] || "Paciente",
        last_name: nameParts.slice(1).join(" ") || "",
        phone: contact.phone,
        email: contact.email || null,
      }).select("id").single();
      if (newPatient) {
        patientId = newPatient.id;
        // Link patient to contact
        await supabase.from("contacts").update({ patient_id: patientId }).eq("id", conv.contact_id);
      }
    }
  }

  if (patientId) {
    // Find treatment by name match
    let treatmentId: string | null = null;
    const { data: treatment } = await supabase.from("treatments")
      .select("id").eq("clinic_id", clinicId)
      .ilike("name", `%${flowData.service}%`).limit(1).maybeSingle();
    if (treatment) treatmentId = treatment.id;

    await supabase.from("appointments").insert({
      clinic_id: clinicId,
      patient_id: patientId,
      date: flowData.date,
      time: flowData.time,
      treatment_id: treatmentId,
      branch_id: branch?.id || null,
      booking_source: "ai_auto",
      status: "scheduled",
      notes: `Servicio: ${flowData.service}. Agendado automáticamente por IA.`,
    });
  }

  // 3. Build confirmation message with location from agent config or branches
  const dateFormatted = formatDateES(flowData.date);
  let locationLine = "";
  if (branch) {
    locationLine = `\n🏥 ${branch.name}`;
    if (branch.address) locationLine += `\n📍 ${branch.address}`;
  } else if (locationsText) {
    locationLine = `\n📍 ${locationsText.split("\n")[0]}`; // First line of locations
  }
  const confirmMsg = `¡Listo ${contactName}! Tu cita está agendada 🎉\n\n📅 ${dateFormatted}\n🕐 ${flowData.time}\n💼 ${flowData.service}${locationLine}\n\nTe enviaremos un recordatorio antes de tu cita. ¡Te esperamos!`;

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

async function escalateConversation(
  supabase: any,
  conversation_id: string,
  clinic_id: string,
  from_tab: string,
  reason: string,
) {
  console.warn("Escalating conversation:", conversation_id, "Reason:", reason);

  // 1. Update conversation state
  await supabase.from("conversations").update({
    appointment_flow_active: false,
    appointment_flow_step: null,
    appointment_flow_data: {},
    pipeline_tab: "escalados",
    chatbot_active: false,
    escalado_at: new Date().toISOString(),
    escalado_reason: reason,
  }).eq("id", conversation_id);

  // 2. Log pipeline history with reason
  await supabase.from("conversation_pipeline_history").insert({
    conversation_id,
    clinic_id,
    from_tab,
    to_tab: "escalados",
    moved_by: "system",
    reason: `Escalado IA: ${reason}`,
  });

  // 3. Add note to contact
  const { data: conv } = await supabase
    .from("conversations")
    .select("contact_id")
    .eq("id", conversation_id)
    .maybeSingle();

  if (conv?.contact_id) {
    const currentNotes = await supabase
      .from("contacts")
      .select("notes")
      .eq("id", conv.contact_id)
      .maybeSingle();

    // Use clinic timezone for escalation notes — fetch from clinic record
    const { data: clinicTzData } = await supabase.from("clinics").select("timezone").eq("id", clinic_id).maybeSingle();
    const escalationTz = clinicTzData?.timezone || "America/Guayaquil";
    const timestamp = new Date().toLocaleString("es", { timeZone: escalationTz });
    const newNote = `[${timestamp}] 🔴 Escalado IA: ${reason}`;
    const existingNotes = currentNotes?.data?.notes || "";
    const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

    await supabase.from("contacts").update({ notes: updatedNotes }).eq("id", conv.contact_id);
  }

  return jsonResponse({
    response_text: "Entiendo tu consulta. Permíteme conectarte con uno de nuestros asesores que podrá ayudarte mejor. 😊",
    flow_cancelled: true,
    escalated: true,
    escalation_reason: reason,
  });
}


const DAY_NAMES_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const WEEKDAY_ALIASES = [
  { index: 0, labels: ["domingo"] },
  { index: 1, labels: ["lunes"] },
  { index: 2, labels: ["martes"] },
  { index: 3, labels: ["miercoles", "miércoles"] },
  { index: 4, labels: ["jueves"] },
  { index: 5, labels: ["viernes"] },
  { index: 6, labels: ["sabado", "sábado"] },
] as const;

type LocalDateInfo = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  iso: string;
  date: Date;
};

type DateResolution =
  | { type: "single"; iso: string; label: string }
  | { type: "ambiguous"; options: Array<{ iso: string; label: string }> }
  | null;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function createLocalDateInfo(year: number, month: number, day: number): LocalDateInfo {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return {
    year,
    month,
    day,
    weekday: date.getUTCDay(),
    iso: `${year}-${pad2(month)}-${pad2(day)}`,
    date,
  };
}

function getLocalDateInfo(timeZone: string, source = new Date()): LocalDateInfo {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(source).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  return createLocalDateInfo(Number(parts.year), Number(parts.month), Number(parts.day));
}

function addDaysToLocalDate(base: LocalDateInfo, days: number): LocalDateInfo {
  const date = new Date(base.date);
  date.setUTCDate(date.getUTCDate() + days);
  return createLocalDateInfo(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

const WORKING_DAY_MAP: Record<string, number> = {
  "Dom": 0, "Lun": 1, "Mar": 2, "Mié": 3, "Jue": 4, "Vie": 5, "Sáb": 6,
  "Domingo": 0, "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5, "Sábado": 6,
};

const SCHEDULE_KEY_TO_SHORT: Record<string, string> = {
  "domingo": "Dom", "lunes": "Lun", "martes": "Mar", "miercoles": "Mié",
  "jueves": "Jue", "viernes": "Vie", "sabado": "Sáb",
};

/** Derive working days from working_schedule (source of truth from UI), falling back to working_days column */
function deriveWorkingDays(workingSchedule: Record<string, { enabled: boolean }> | null | undefined, workingDaysCol: string[] | null | undefined): string[] {
  if (workingSchedule && typeof workingSchedule === "object") {
    const days: string[] = [];
    for (const [key, val] of Object.entries(workingSchedule)) {
      if (val && val.enabled) {
        const short = SCHEDULE_KEY_TO_SHORT[key];
        if (short) days.push(short);
      }
    }
    if (days.length > 0) return days;
  }
  return (workingDaysCol as string[]) || ["Lun", "Mar", "Mié", "Jue", "Vie"];
}

function getWorkingWeekdayIndices(workingDays: string[]): Set<number> {
  const indices = new Set<number>();
  for (const d of workingDays) {
    const idx = WORKING_DAY_MAP[d];
    if (idx !== undefined) indices.add(idx);
  }
  return indices;
}

function isWorkingDay(dateStr: string, workingDays: string[]): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = date.getUTCDay();
  return getWorkingWeekdayIndices(workingDays).has(weekday);
}

function getDayNameFromDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return DAY_NAMES_ES[date.getUTCDay()];
}

function buildNonWorkingDaysInfo(workingDays: string[]): string {
  const indices = getWorkingWeekdayIndices(workingDays);
  const nonWorking = DAY_NAMES_ES.filter((_, i) => !indices.has(i));
  if (nonWorking.length === 0) return "";
  return `\n⚠️ DÍAS SIN SERVICIO: ${nonWorking.join(", ")}. NUNCA ofrezcas citas estos días.`;
}

function buildCalendarReference(base: LocalDateInfo, totalDays = 14, workingDays?: string[], blockedDates?: Set<string>): string[] {
  const indices = workingDays ? getWorkingWeekdayIndices(workingDays) : null;
  return Array.from({ length: totalDays }, (_, index) => {
    const info = addDaysToLocalDate(base, index);
    let status = "";
    if (indices && !indices.has(info.weekday)) {
      status = " ❌ CERRADO";
    } else if (blockedDates && blockedDates.has(info.iso)) {
      status = " 🔒 BLOQUEADO";
    }
    return `${DAY_NAMES_ES[info.weekday]} ${pad2(info.day)}/${pad2(info.month)}/${info.year} → ${info.iso}${status}`;
  });
}

function formatDateES(dateStr: string): string {
  return formatDateLabelES(dateStr, false);
}

function formatDateLabelES(dateStr: string, includeYear = true): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(includeYear ? { year: "numeric" as const } : {}),
    }).format(date);
  } catch {
    return dateStr;
  }
}

function resolveDateReferenceFromMessage(message: string, timeZone: string): DateResolution {
  const normalized = normalizeText(message || "");
  const today = getLocalDateInfo(timeZone);

  if (/\bpasado manana\b/.test(normalized)) {
    const target = addDaysToLocalDate(today, 2);
    return { type: "single", iso: target.iso, label: formatDateLabelES(target.iso) };
  }

  // Match "mañana" only as "tomorrow", exclude "de la mañana" / "por la mañana" / "en la mañana" (= morning)
  const hasMorningPhrase = /\b(?:de|por|en)\s+la\s+manana\b/.test(normalized) || /\ba\s+las\s+\d{1,2}.*\bmanana\b/.test(normalized);
  const hasTomorrow = /\bmanana\b/.test(normalized);
  if (hasTomorrow && !hasMorningPhrase) {
    const target = addDaysToLocalDate(today, 1);
    return { type: "single", iso: target.iso, label: formatDateLabelES(target.iso) };
  }

  if (/\bhoy\b/.test(normalized)) {
    return { type: "single", iso: today.iso, label: formatDateLabelES(today.iso) };
  }

  for (const weekday of WEEKDAY_ALIASES) {
    const matchedLabel = weekday.labels.find((label) => new RegExp(`\\b${label}\\b`).test(normalized));
    if (!matchedLabel) continue;

    const isNext = new RegExp(`\\bproximo\\s+${matchedLabel}\\b`).test(normalized);
    const isThis = new RegExp(`\\best[ae]\\s+${matchedLabel}\\b`).test(normalized);
    const delta = (weekday.index - today.weekday + 7) % 7;

    if (!isNext && !isThis && delta === 0) {
      const nextWeek = addDaysToLocalDate(today, 7);
      return {
        type: "ambiguous",
        options: [
          { iso: today.iso, label: formatDateLabelES(today.iso) },
          { iso: nextWeek.iso, label: formatDateLabelES(nextWeek.iso) },
        ],
      };
    }

    const daysToAdd = isNext ? (delta === 0 ? 7 : delta) : delta;
    const target = addDaysToLocalDate(today, daysToAdd);
    return { type: "single", iso: target.iso, label: formatDateLabelES(target.iso) };
  }

  return null;
}

function buildDateResolutionInstruction(resolution: DateResolution): string {
  if (!resolution) return "";
  if (resolution.type === "single") {
    return `INTERPRETACIÓN DE FECHA RESUELTA POR SISTEMA:\n- La referencia temporal del paciente corresponde exactamente a ${resolution.iso} (${resolution.label}).\n- Usa ESA fecha exacta y no menciones ninguna otra.`;
  }

  return `ACLARACIÓN DE FECHA OBLIGATORIA:\n- La referencia temporal del paciente es ambigua.\n- SOLO puedes ofrecer estas opciones exactas:\n${resolution.options.map((option) => `  • ${option.iso} (${option.label})`).join("\n")}\n- No menciones ninguna otra fecha.`;
}

function harmonizeResponseDate(responseText: string, resolution: DateResolution): string {
  if (!responseText || !resolution || resolution.type !== "single") return responseText;
  const corrected = formatDateLabelES(resolution.iso, false);
  return responseText
    .replace(/\b(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+de\s+[a-záéíóú]+(?:\s+de\s+\d{4})?/i, corrected)
    .replace(/\b(este|próximo|proximo)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+de\s+[a-záéíóú]+(?:\s+de\s+\d{4})?/i, corrected);
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
