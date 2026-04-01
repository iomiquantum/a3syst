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

    const { conversation_id, clinic_id, triggered_by = "manual", channel: requestChannel, draft_only = false, custom_prompt, skip_already_replied = false } = await req.json();
    const isFollowUp = triggered_by === "follow_up";
    const isDraft = draft_only === true;
    console.log("ai-agent-reply called:", { conversation_id, clinic_id, triggered_by, isFollowUp, isDraft, requestChannel, authSource: auth.source });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const isManualTrigger = triggered_by === "manual" || isFollowUp;

    // Fetch AI agent config for this clinic
    const { data: agentConfig } = await supabase
      .from("ai_agent_config")
      .select("*")
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (!agentConfig || !agentConfig.enabled) {
      return new Response(JSON.stringify({ error: "AI agent not configured or disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch clinic info including working_schedule for deriving working days
    const { data: clinicInfo } = await supabase
      .from("clinics")
      .select("name, timezone, working_schedule")
      .eq("id", clinic_id)
      .single();

    // Fetch all branches with their schedules
    const { data: branchesData } = await supabase
      .from("branches")
      .select("name, address, full_address, phone, email, whatsapp, google_maps_url, arrival_instructions, preparation_notes, working_schedule")
      .eq("clinic_id", clinic_id)
      .eq("active", true)
      .order("created_at");

    // Fetch blocked days (global only for AI context calendar)
    const { data: blockedDaysRaw } = await supabase
      .from("blocked_days")
      .select("date, reason, branch_id")
      .eq("clinic_id", clinic_id);
    const blockedDatesSet = new Set(
      (blockedDaysRaw || []).filter((b: any) => b.branch_id === null).map((b: any) => b.date)
    );

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id, channel, visitor_contact, contact_id, chatbot_active, follow_up_count, last_inbound_at, appointment_flow_active, appointment_flow_step, appointment_flow_data, pipeline_tab, appointment_confirmed, seguimiento_last_completed_s, seguimiento_is_recurrente, seguimiento_recurrente_count")
      .eq("id", conversation_id)
      .eq("clinic_id", clinic_id)
      .single();

    if (conversationError || !conversationData) throw conversationError || new Error("Conversation not found");

    // ====== APPOINTMENT FLOW: If active, delegate to appointment-flow function ======
    const appointmentFlowEnabledForConversation = conversationData.appointment_flow_active === true;

    if (appointmentFlowEnabledForConversation && !isDraft && !isFollowUp) {
      // Get the latest inbound message
      const { data: lastInbound } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conversation_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const patientMessage = lastInbound?.content || "";

      const flowResp = await fetch(`${supabaseUrl}/functions/v1/appointment-flow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "guided_flow",
          conversation_id,
          clinic_id,
          patient_message: patientMessage,
        }),
      });

      const flowResult = await flowResp.json();
      console.log("Appointment flow result:", JSON.stringify(flowResult));

      if (flowResult.response_text) {
        // Send the appointment flow response
        const reply = flowResult.response_text;
        let savedMsg: unknown = null;

        if (conversationData.channel === "whatsapp") {
          let toNumber = conversationData.visitor_contact;
          if (!toNumber && conversationData.contact_id) {
            const { data: contactData } = await supabase.from("contacts").select("phone").eq("id", conversationData.contact_id).maybeSingle();
            toNumber = contactData?.phone || null;
          }
          if (toNumber) {
            const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
               body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: reply, conversation_id, origin: `appointment_flow|${conversationData.pipeline_tab || "inbox"}` }),
            });
            savedMsg = await sendResponse.json().catch(() => null);
          }
        } else {
          const { data: insertedMessage } = await supabase.from("messages").insert({
            conversation_id, clinic_id, direction: "outbound", content: reply, message_type: "text", status: "sent", origin: `appointment_flow|${conversationData.pipeline_tab || "inbox"}`,
          }).select().single();
          savedMsg = insertedMessage;
          await supabase.from("conversations").update({
            last_message_at: new Date().toISOString(),
            last_message_preview: reply.substring(0, 100),
          }).eq("id", conversation_id);
        }

        // If flow completed (confirmed appointment), the appointment-flow function already updated the conversation
        return new Response(JSON.stringify({
          reply,
          message: savedMsg,
          appointment_flow: true,
          flow_complete: flowResult.confirmed || false,
          appointment: flowResult.appointment || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // If flow returned error or no text, fall through to normal AI
      if (flowResult.flow_cancelled) {
        const cancelReply = flowResult.response_text || "Sin problema. Cuando quieras agendar, aquí estoy. 😊";
        // Send cancel message
        if (conversationData.channel === "whatsapp") {
          let toNumber = conversationData.visitor_contact;
          if (!toNumber && conversationData.contact_id) {
            const { data: contactData } = await supabase.from("contacts").select("phone").eq("id", conversationData.contact_id).maybeSingle();
            toNumber = contactData?.phone || null;
          }
          if (toNumber) {
            await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
              body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: cancelReply, conversation_id, origin: `appointment_flow|${conversationData.pipeline_tab || "escalados"}` }),
            });
          }
        } else {
          await supabase.from("messages").insert({
            conversation_id, clinic_id, direction: "outbound", content: cancelReply, message_type: "text", status: "sent", origin: `appointment_flow|${conversationData.pipeline_tab || "escalados"}`,
          });
          await supabase.from("conversations").update({
            last_message_at: new Date().toISOString(), last_message_preview: cancelReply.substring(0, 100),
          }).eq("id", conversation_id);
        }

        // If escalated by circuit breaker, ensure conversation is in escalados with chatbot off
        if (flowResult.escalated) {
          await supabase.from("conversations").update({
            pipeline_tab: "escalados",
            chatbot_active: false,
            escalado_at: new Date().toISOString(),
            escalado_reason: flowResult.escalado_reason || "Escalado automático desde flujo de agendamiento",
          }).eq("id", conversation_id);
        }

        return new Response(JSON.stringify({ reply: cancelReply, appointment_flow: true, flow_cancelled: true, escalated: flowResult.escalated || false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ====== APPOINTMENT CONFIRMATION DETECTION (for agendados) ======
    if (conversationData.pipeline_tab === "agendados" && !conversationData.appointment_confirmed && !isDraft && !isFollowUp) {
      const { data: lastInbound } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conversation_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastInbound?.content) {
        const detectResp = await fetch(`${supabaseUrl}/functions/v1/appointment-flow`, {
          method: "POST",
          headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "detect_response",
            conversation_id,
            clinic_id,
            patient_message: lastInbound.content,
          }),
        });

        const detectResult = await detectResp.json();
        console.log("Appointment response detection:", JSON.stringify(detectResult));

        if (detectResult.send_response && detectResult.response_text) {
          const reply = detectResult.response_text;

          if (conversationData.channel === "whatsapp") {
            let toNumber = conversationData.visitor_contact;
            if (!toNumber && conversationData.contact_id) {
              const { data: contactData } = await supabase.from("contacts").select("phone").eq("id", conversationData.contact_id).maybeSingle();
              toNumber = contactData?.phone || null;
            }
            if (toNumber) {
              await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
              body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: reply, conversation_id, origin: `ai_auto|${conversationData.pipeline_tab || "inbox"}` }),
              });
            }
          } else {
            await supabase.from("messages").insert({
              conversation_id, clinic_id, direction: "outbound", content: reply, message_type: "text", status: "sent", origin: `ai_auto|${conversationData.pipeline_tab || "inbox"}`,
            });
            await supabase.from("conversations").update({
              last_message_at: new Date().toISOString(), last_message_preview: reply.substring(0, 100),
            }).eq("id", conversation_id);
          }

          // If reschedule was triggered, the flow is now active — return
          if (detectResult.flow_reactivated) {
            return new Response(JSON.stringify({ reply, appointment_flow: true, reschedule: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // For CONFIRMED and CANCEL, return the response
          if (detectResult.intent === "CONFIRMED" || detectResult.intent === "CANCEL") {
            return new Response(JSON.stringify({ reply, appointment_flow: true, intent: detectResult.intent }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        // For OTHER intent, fall through to normal AI reply
      }
    }

    // ====== NORMAL AI REPLY FLOW (unchanged) ======
    if (!isManualTrigger) {
      // Check channel-level autopilot
      const convChannel = conversationData.channel || requestChannel || "web_chat";
      const { data: channelPromptCheck } = await supabase
        .from("ai_agent_channel_prompts")
        .select("enabled")
        .eq("clinic_id", clinic_id)
        .eq("channel", convChannel)
        .maybeSingle();

      if (channelPromptCheck && channelPromptCheck.enabled === false) {
        return new Response(JSON.stringify({ skipped: true, reason: "channel autopilot disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: claimed, error: claimError } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id)
        .eq("clinic_id", clinic_id)
        .eq("chatbot_active", true)
        .select("id")
        .single();

      if (claimError || !claimed) {
        return new Response(JSON.stringify({ skipped: true, reason: "claim failed or chatbot inactive" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: latestInbound } = await supabase
        .from("messages")
        .select("created_at")
        .eq("conversation_id", conversation_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: latestOutbound } = await supabase
        .from("messages")
        .select("created_at")
        .eq("conversation_id", conversation_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestInbound?.[0] && latestOutbound?.[0] && !skip_already_replied) {
        const inboundTime = new Date(latestInbound[0].created_at).getTime();
        const outboundTime = new Date(latestOutbound[0].created_at).getTime();
        if (outboundTime > inboundTime) {
          return new Response(JSON.stringify({ skipped: true, reason: "already replied" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch messages for context — truncated to prevent token overflow
    // Draft/custom gets more context, normal gets last 20 messages max
    const contextLimit = (isDraft || custom_prompt) ? 30 : 20;
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("direction, content, origin, created_at, message_type")
      .eq("conversation_id", conversation_id)
      .not("message_type", "eq", "system_note")
      .order("created_at", { ascending: false })
      .limit(contextLimit);

    if (recentMessages) recentMessages.reverse();

    // Build system prompt from agent config
    const services = (agentConfig.services || []) as { name: string; price: string; description: string }[];
    const langLabel = agentConfig.language === "es" ? "Español" : agentConfig.language === "en" ? "English" : "Português";

    // Build schedule & location text from branches
    const dayLabels: Record<string, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };
    let branchesBlock = "";
    if (branchesData && branchesData.length > 0) {
      branchesBlock = branchesData.map((b: any) => {
        const parts: string[] = [`📍 SEDE: ${b.name}`];
        if (b.full_address || b.address) parts.push(`Dirección: ${b.full_address || b.address}`);
        if (b.phone) parts.push(`Teléfono: ${b.phone}`);
        if (b.email) parts.push(`Email: ${b.email}`);
        if (b.whatsapp) parts.push(`WhatsApp: ${b.whatsapp}`);
        if (b.google_maps_url) parts.push(`Google Maps: ${b.google_maps_url}`);
        if (b.arrival_instructions) parts.push(`Instrucciones de llegada: ${b.arrival_instructions}`);
        if (b.preparation_notes) parts.push(`Notas de preparación: ${b.preparation_notes}`);
        // Schedule
        const ws = b.working_schedule as Record<string, { enabled: boolean; open: string; close: string }> | null;
        if (ws) {
          const lines = Object.entries(dayLabels).map(([k, l]) => ws[k]?.enabled ? `  • ${l}: ${ws[k].open} a ${ws[k].close}` : `  • ${l}: CERRADO`);
          parts.push(`Horario:\n${lines.join("\n")}`);
        } else {
          parts.push(`Horario: (no configurado para esta sede)`);
        }
        return parts.join("\n");
      }).join("\n\n");
    } else {
      branchesBlock = "(sin sedes configuradas)";
    }

    // Use clinic timezone for today's date — robust Intl.DateTimeFormat approach
    const clinicTz = (clinicInfo as any)?.timezone || "America/Guayaquil";
    const todayLocal = getLocalDateInfoReply(clinicTz);
    const todayDate = todayLocal.iso;
    const todayDay = todayLocal.dayNameES;
    const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

    // Derive working day indices from branches' working_schedule
    // Map day keys to JS weekday indices: domingo=0, lunes=1, ..., sabado=6
    const dayKeyToIndex: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
    const workingDayIndices = new Set<number>();
    if (branchesData && branchesData.length > 0) {
      for (const b of branchesData as any[]) {
        const ws = b.working_schedule as Record<string, { enabled: boolean }> | null;
        if (ws) {
          for (const [key, val] of Object.entries(ws)) {
            if (val?.enabled && dayKeyToIndex[key] !== undefined) {
              workingDayIndices.add(dayKeyToIndex[key]);
            }
          }
        }
      }
    }
    // If no branches have schedule configured, assume all days are working
    if (workingDayIndices.size === 0) {
      for (let i = 0; i < 7; i++) workingDayIndices.add(i);
    }

    const calendarRef = Array.from({ length: 21 }, (_, index) => {
      const d = addDaysReply(todayLocal, index);
      let marker = "";
      if (!workingDayIndices.has(d.weekday)) marker = " ❌ CERRADO";
      else if (blockedDatesSet.has(d.iso)) marker = " 🔒 BLOQUEADO";
      return `${dayNames[d.weekday]} ${d.dd}/${d.mm}/${d.year} → ${d.iso}${marker}`;
    }).join("\n");

    let systemPrompt = `Eres "${agentConfig.agent_name}", un asistente virtual del negocio.
Idioma: ${langLabel}
Tono: ${agentConfig.tone}

NEGOCIO: ${clinicInfo?.name || ""}

SEDES Y HORARIOS DE ATENCIÓN:
${branchesBlock}

IMPORTANTE: Solo puedes agendar citas en los días y horarios habilitados de cada sede. Si un día está marcado como CERRADO, NO ofrezcas citas ese día. Sugiere el siguiente día hábil disponible.
Si hay varias sedes, pregunta al cliente en cuál sede prefiere su cita.

FECHA DE HOY: ${todayDate} (${todayDay})
ZONA HORARIA: ${clinicTz}
CALENDARIO DE REFERENCIA (próximos 21 días):
${calendarRef}

OBJETIVO:
${agentConfig.objective}

SERVICIOS DISPONIBLES:
${services.map(s => `• ${s.name} — $${s.price} — ${s.description}`).join("\n") || "(sin servicios configurados)"}`;

    if (agentConfig.treatments_text) {
      systemPrompt += `\n\nTRATAMIENTOS DISPONIBLES:\n${agentConfig.treatments_text}`;
    }
    if (agentConfig.prices_text) {
      systemPrompt += `\n\nPRECIOS / RANGOS DE PRECIOS:\n${agentConfig.prices_text}`;
    }
    if (agentConfig.locations_text) {
      systemPrompt += `\n\nUBICACIONES / SUCURSALES:\n${agentConfig.locations_text}`;
    }
    if (agentConfig.professionals_text) {
      systemPrompt += `\n\nPROFESIONALES / ESPECIALISTAS:\n${agentConfig.professionals_text}`;
    }

    systemPrompt += `\n\nINSTRUCCIONES ESPECIALES:\n${agentConfig.special_instructions}

REGLAS OBLIGATORIAS:
- Responde de forma breve y directa (máximo 2-3 oraciones).
- Usa emojis con moderación.
- Si no sabes algo, sugiere contactar al negocio directamente.
- NUNCA inventes información sobre servicios, precios, horarios o datos que no estén explícitamente listados arriba.
- NUNCA ofrezcas citas en días fuera del horario de atención. Si el cliente pide un día no laborable, sugiere el siguiente día hábil.
- Si el cliente ya recibió un mensaje de bienvenida, NO repitas el saludo ni te presentes de nuevo. Ve directo a responder.
- Cuando el cliente pregunte sobre un servicio o tema específico, responde directamente sobre eso. No des respuestas genéricas.
- PRIORIDAD DE HORARIOS: Si las INSTRUCCIONES ESPECIALES contienen horarios de atención específicos (días, horas), USA ESOS horarios. Las instrucciones especiales SIEMPRE prevalecen sobre el HORARIO DE ATENCIÓN genérico mostrado arriba.
- Si mencionas una fecha o un día de la semana, DEBES verificarlo contra el CALENDARIO DE REFERENCIA antes de responder.
- Basa tu respuesta EXCLUSIVAMENTE en la información proporcionada en este prompt. No agregues datos, servicios, horarios, direcciones ni detalles que no aparezcan explícitamente aquí.`;

    // Follow-up mode — VALUE-FIRST philosophy
    if (isFollowUp) {
      const followUpCount = (conversationData.follow_up_count || 0) + 1;
      const lastInbound = conversationData.last_inbound_at;
      const timeSince = lastInbound
        ? Math.floor((Date.now() - new Date(lastInbound).getTime()) / 60000)
        : 0;
      const timeLabel = timeSince >= 1440
        ? `${Math.floor(timeSince / 1440)} días`
        : timeSince >= 60
          ? `${Math.floor(timeSince / 60)} horas`
          : `${timeSince} minutos`;

      systemPrompt += `\n\n=== MODO SEGUIMIENTO — VALOR PRIMERO (Contacto #${followUpCount} de 4 automáticos) ===
El contacto no ha respondido en ${timeLabel}.

FILOSOFÍA FUNDAMENTAL:
Tu objetivo NO es vender ni presionar para agendar. Tu objetivo es ENAMORAR al cliente con valor real.
El cliente debe sentir: "esta empresa genuinamente quiere ayudarme y sabe de lo que habla".
Si el cliente se siente cuidado e informado, la venta llegará sola.

INSTRUCCIONES PARA EL CONTACTO:
- Contacto #${followUpCount}: ${followUpCount === 1 ? "Es el primer re-contacto. PRIORIZA responder la duda que tenía o darle valor educativo sobre lo que preguntó. NO menciones agendar." : followUpCount === 2 ? "Ya intentamos una vez. Comparte un dato nuevo o personaliza la info. Al final puedes agregar algo sutil como 'recuerda que puedes agendar cuando quieras o preguntarme cualquier duda 😊'." : followUpCount === 3 ? "Tercer contacto. Combina valor con recordatorio natural: 'estoy aquí para resolver tus dudas o ayudarte a agendar cuando te sientas listo/a'." : "Último contacto automático. Ofrece ayuda genuina + recordatorio cálido de que puede agendar o preguntar lo que necesite."}
- Varía el enfoque y la información en cada contacto. NO repitas el mismo contenido.

REGLAS OBLIGATORIAS:
- Máximo 3 oraciones y 250 caracteres.
- NUNCA menciones "llamadas" ni "videollamadas" — todo es por mensajes o citas presenciales.
- NUNCA inventes servicios, cupos, promociones, estudios ni datos que no estén configurados arriba.
- NO repitas el mismo contenido de mensajes anteriores. Varía el enfoque y la información.
- Basa TODA la información en los servicios, tratamientos y datos REALES del negocio listados arriba.`;
    }
    const resolvedChannel = requestChannel || conversationData.channel || "web_chat";
    const { data: channelPrompt } = await supabase
      .from("ai_agent_channel_prompts")
      .select("*")
      .eq("clinic_id", clinic_id)
      .eq("channel", resolvedChannel)
      .eq("enabled", true)
      .maybeSingle();

    if (channelPrompt && channelPrompt.additional_prompt) {
      systemPrompt += `\n\n=== INSTRUCCIONES ESPECÍFICAS PARA ESTE CANAL ===\n${channelPrompt.additional_prompt}`;
    }
    if (channelPrompt && channelPrompt.max_response_length) {
      systemPrompt += `\n\nIMPORTANTE: Responde en máximo ${channelPrompt.max_response_length} caracteres.`;
    }

    if (custom_prompt) {
      systemPrompt += `\n\n=== INSTRUCCIÓN DEL OPERADOR ===\nEl operador humano te pide que generes una respuesta con estas indicaciones: "${custom_prompt}"\nGenera una respuesta apropiada basándote en el contexto del chat y estas instrucciones.`;
    }

    // Build messages array, consolidating consecutive same-role messages
    // Replace [Audio] placeholders so the AI doesn't get confused about audio capability
    const rawMsgs = (recentMessages || []).map((m) => {
      let content = m.content || "";
      // If it's an audio message placeholder, annotate it so AI doesn't respond about audio capability
      if (content === "[Audio]" || m.message_type === "audio") {
        content = "(el cliente envió un mensaje de voz que ya fue procesado)";
      }
      return {
        role: m.direction === "inbound" ? "user" as const : "assistant" as const,
        content,
      };
    });

    const consolidatedMsgs: { role: string; content: string }[] = [];
    for (const msg of rawMsgs) {
      if (!msg.content.trim()) continue;
      const last = consolidatedMsgs[consolidatedMsgs.length - 1];
      if (last && last.role === msg.role) {
        last.content += "\n" + msg.content;
      } else {
        consolidatedMsgs.push({ ...msg });
      }
    }

    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...consolidatedMsgs,
    ];

    const lastRole = aiMessages[aiMessages.length - 1]?.role;
    if (lastRole !== "user") {
      aiMessages.push({
        role: "user",
        content: custom_prompt
          ? `[Instrucción del operador]: ${custom_prompt}. Por favor genera una respuesta apropiada para enviar al cliente.`
          : "[Instrucción del sistema]: Genera un mensaje de seguimiento corto y apropiado para este cliente, basándote en el contexto de la conversación anterior. Responde directamente con el mensaje, sin explicaciones.",
      });
    } else if (custom_prompt) {
      aiMessages.push({
        role: "user",
        content: `[Instrucción adicional del operador]: ${custom_prompt}`,
      });
      const prev = aiMessages[aiMessages.length - 2];
      if (prev && prev.role === "user") {
        prev.content += "\n" + aiMessages.pop()!.content;
      }
    }

    console.log("AI messages count:", aiMessages.length, "last role:", aiMessages[aiMessages.length - 1]?.role, "isDraft:", isDraft);

    // Try primary model, fallback if null response — with timeout
    const tryModel = async (model: string): Promise<{ reply: string | null; data: any }> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout
      let resp: Response;
      try {
        resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages: aiMessages, stream: false, max_tokens: 500 }),
          signal: controller.signal,
        });
      } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === "AbortError") throw { status: 504, message: "AI response timeout (25s)" };
        throw e;
      }
      clearTimeout(timeout);

      if (!resp.ok) {
        const status = resp.status;
        if (status === 429) throw { status: 429, message: "Rate limit exceeded. Try again later." };
        if (status === 402) throw { status: 402, message: "AI credits exhausted. Add funds in Settings." };
        const errorText = await resp.text();
        console.error("AI gateway error:", status, errorText);
        throw { status: 500, message: "AI gateway error" };
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      return { reply: content && content.trim() ? content.trim() : null, data };
    };

    let reply: string | null = null;
    let aiData: any = null;

    try {
      const result = await tryModel("google/gemini-2.5-flash");
      reply = result.reply;
      aiData = result.data;
    } catch (e: any) {
      if (e.status === 429 || e.status === 402 || e.status === 504) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: e.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    if (!reply) {
      console.warn("Primary model returned null, trying fallback model...");
      try {
        const result = await tryModel("openai/gpt-5-mini");
        reply = result.reply;
        aiData = result.data;
      } catch (e) {
        console.error("Fallback model also failed:", e);
      }
    }

    if (!reply) {
      console.error("AI returned empty response after retry:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "La IA no pudo generar una respuesta. Intenta de nuevo o responde manualmente." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usage = aiData?.usage || {};
    const tokensInput = usage.prompt_tokens || 0;
    const tokensOutput = usage.completion_tokens || 0;
    const modelUsed = aiData?.model || "google/gemini-2.5-flash";

    // Draft mode
    if (isDraft) {
      await supabase.from("ai_agent_usage").insert({
        clinic_id, conversation_id, tokens_input: tokensInput, tokens_output: tokensOutput,
        model: modelUsed, triggered_by: "manual_draft",
      });
      return new Response(JSON.stringify({ reply, draft: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let savedMsg: unknown = null;

    if (conversationData.channel === "whatsapp") {
      let toNumber = conversationData.visitor_contact;
      if (!toNumber && conversationData.contact_id) {
        const { data: contactData } = await supabase.from("contacts").select("phone").eq("id", conversationData.contact_id).maybeSingle();
        toNumber = contactData?.phone || null;
      }
      if (!toNumber) throw new Error("WhatsApp conversation has no destination phone number");

      const pipelineTab = conversationData.pipeline_tab || "inbox";
      const isS5S6 = pipelineTab === "seguimiento_s5" || pipelineTab === "seguimiento_s6";
      const autoOrigin = isS5S6 ? `ai_auto_${pipelineTab.replace("seguimiento_", "")}|${pipelineTab}` : `ai_auto|${pipelineTab}`;
      const followUpOrigin = `follow_up_s${(conversationData.follow_up_count || 0) + 1}|${pipelineTab}`;

      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: reply, conversation_id, origin: isFollowUp ? followUpOrigin : autoOrigin }),
      });

      const sendPayload = await sendResponse.json().catch(() => null);
      console.log("AI reply delivery response:", JSON.stringify(sendPayload));
      if (!sendResponse.ok || sendPayload?.error) {
        throw new Error(`WhatsApp send failed: ${JSON.stringify(sendPayload || { status: sendResponse.status })}`);
      }
      savedMsg = sendPayload;
    } else {
      const nonWaPipelineTab = conversationData.pipeline_tab || "inbox";
      const nonWaIsS5S6 = nonWaPipelineTab === "seguimiento_s5" || nonWaPipelineTab === "seguimiento_s6";
      const nonWaAutoOrigin = nonWaIsS5S6 ? `ai_auto_${nonWaPipelineTab.replace("seguimiento_", "")}|${nonWaPipelineTab}` : `ai_auto|${nonWaPipelineTab}`;
      const nonWaFollowUpOrigin = `follow_up_s${(conversationData.follow_up_count || 0) + 1}|${nonWaPipelineTab}`;
      const { data: insertedMessage, error: msgError } = await supabase.from("messages").insert({
        conversation_id, clinic_id, direction: "outbound", content: reply, message_type: "text", status: "sent",
        origin: isFollowUp ? nonWaFollowUpOrigin : nonWaAutoOrigin,
      }).select().single();
      if (msgError) throw msgError;
      savedMsg = insertedMessage;

      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: reply.substring(0, 100),
      }).eq("id", conversation_id);
    }

    // === PIPELINE: Start inactivity timer after AI response ===
    const { data: convState } = await supabase
      .from("conversations")
      .select("pipeline_tab, seguimiento_last_completed_s, seguimiento_is_recurrente, seguimiento_recurrente_count")
      .eq("id", conversation_id)
      .single();

    if (convState?.pipeline_tab === "resueltos_ia") {
      await supabase.from("conversations").update({
        inactivity_timer_start: new Date().toISOString(),
      }).eq("id", conversation_id);
    }

    // === DISPOSITION ANALYSIS: Determine if contact is fully informed or needs more info ===
    // Only run for non-follow-up auto replies on contacts that have been through at least one seguimiento cycle
    const hasBeenThroughSeguimiento = (convState?.seguimiento_last_completed_s || 0) >= 1 || (convState?.seguimiento_is_recurrente === true);
    if (!isFollowUp && !isDraft && triggered_by === "auto" && conversationData.contact_id && hasBeenThroughSeguimiento && convState?.pipeline_tab === "resueltos_ia") {
      try {
        const { data: fullHistory } = await supabase
          .from("messages")
          .select("direction, content")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: true })
          .limit(20);

        const chatSummary = (fullHistory || []).map(m =>
          `${m.direction === "inbound" ? "CLIENTE" : "NEGOCIO"}: ${m.content}`
        ).join("\n");

        const dispositionResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Analiza esta conversación entre un negocio y un cliente. Determina:

1. ¿El cliente ya recibió la información que necesitaba? (precios, servicios, detalles)
2. ¿Mostró interés real en los servicios?
3. ¿Indicó que no quiere agendar AHORA pero sí en el futuro? (ej: "en abril", "después te aviso", "luego les escribo")
4. ¿Tiene dudas pendientes sin resolver?

SERVICIOS DEL NEGOCIO:
${services.map(s => `• ${s.name} — $${s.price}`).join("\n") || "(sin servicios)"}

Clasifica:
- "fully_informed": Cliente recibió info, mostró interés, pero no quiere cerrar ahora. No necesita más seguimiento automático.
- "needs_more_info": Cliente aún tiene preguntas, no recibió toda la info, o la conversación fue cortada. Necesita seguimiento.
- "not_applicable": Conversación muy corta o sin contexto suficiente para decidir.

Si es "fully_informed", genera un resumen de 2-3 líneas del contexto.`,
              },
              { role: "user", content: chatSummary },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "classify_disposition",
                  description: "Classify conversation disposition",
                  parameters: {
                    type: "object",
                    properties: {
                      disposition: { type: "string", enum: ["fully_informed", "needs_more_info", "not_applicable"] },
                      interested: { type: "boolean", description: "Did the client show real interest?" },
                      summary: { type: "string", description: "2-3 line summary of what happened" },
                      reason: { type: "string", description: "Why this disposition was chosen" },
                    },
                    required: ["disposition", "interested", "summary", "reason"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "classify_disposition" } },
            stream: false,
            max_tokens: 300,
          }),
        });

        if (dispositionResp.ok) {
          const dispositionData = await dispositionResp.json();
          // Log disposition analysis usage
          try {
            const dUsage = dispositionData.usage;
            const dIn = dUsage?.prompt_tokens || 0;
            const dOut = dUsage?.completion_tokens || 0;
            const dCost = (dIn * 0.075 + dOut * 0.30) / 1_000_000; // flash-lite pricing
            await supabase.from("ai_token_usage").insert({
              clinic_id, user_id: null,
              generator_type: "agent_disposition", model: "google/gemini-2.5-flash-lite",
              tokens_input: dIn, tokens_output: dOut, cost_usd: dCost,
              action_label: "Análisis de disposición del contacto",
            });
          } catch (logErr) { console.error("[DISPOSITION] Usage log error:", logErr); }
          const toolCall = dispositionData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            console.log("[DISPOSITION]", JSON.stringify(parsed));

            if (parsed.disposition === "fully_informed") {
              // Move to S6 (manual review) instead of restarting S1
              await supabase.from("conversations").update({
                pipeline_tab: "seguimiento_s6",
                seguimiento_contact_number: 6,
                seguimiento_next_s: 6,
                inactivity_timer_start: null,
                seguimiento_next_contact_at: null,
              }).eq("id", conversation_id);

              // Add INTERESADO tag
              const { data: contactData } = await supabase
                .from("contacts")
                .select("tags, notes")
                .eq("id", conversationData.contact_id)
                .single();

              if (contactData) {
                const currentTags = contactData.tags || [];
                if (!currentTags.includes("INTERESADO")) {
                  await supabase.from("contacts").update({
                    tags: [...currentTags, "INTERESADO"],
                  }).eq("id", conversationData.contact_id);
                }

                // Add summary note
                const today = new Date().toISOString().split("T")[0];
                const noteEntry = `\n[${today}] 🟡 Análisis IA: ${parsed.summary}`;
                await supabase.from("contacts").update({
                  notes: (contactData.notes || "") + noteEntry,
                }).eq("id", conversationData.contact_id);
              }

              // Log pipeline history
              await supabase.from("conversation_pipeline_history").insert({
                conversation_id,
                clinic_id,
                from_tab: "resueltos_ia",
                to_tab: "seguimiento_s6",
                moved_by: "ai_disposition",
                reason: `IA: ${parsed.reason}`,
              });

              console.log(`[DISPOSITION] Contact moved to S6 (fully_informed): ${parsed.reason}`);
            }
            // needs_more_info → normal flow continues (S1 will trigger via inactivity)
          }
        }
      } catch (e) {
        console.error("[DISPOSITION] Non-blocking error:", e);
      }
    }

    // If follow-up, update follow_up_count and contact funnel_stage
    if (isFollowUp) {
      const newCount = (conversationData.follow_up_count || 0) + 1;
      await supabase.from("conversations").update({ follow_up_count: newCount }).eq("id", conversation_id);
      if (conversationData.contact_id && newCount <= 5) {
        await supabase.from("contacts").update({ funnel_stage: `contacto_${newCount}` }).eq("id", conversationData.contact_id);
      }
    }

    // Log usage
    await supabase.from("ai_agent_usage").insert({
      clinic_id, conversation_id, tokens_input: tokensInput, tokens_output: tokensOutput,
      model: modelUsed, triggered_by: triggered_by || "manual",
    });

    const costUsd = estimateTokenCost(modelUsed, tokensInput, tokensOutput);
    await supabase.from("ai_token_usage").insert({
      clinic_id, user_id: null, generator_type: "agent", model: modelUsed,
      tokens_input: tokensInput, tokens_output: tokensOutput, cost_usd: costUsd,
      action_label: isFollowUp ? `Seguimiento contacto ${(conversationData.follow_up_count || 0) + 1}` : `Respuesta automática agente`,
    });

    // ====== POST-REPLY: Extract contact data (email, alternative phone) ======
    if (!isFollowUp && !isDraft && conversationData.contact_id) {
      const { data: lastInbound } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conversation_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastInbound?.content) {
        try {
          const { data: currentContact } = await supabase
            .from("contacts")
            .select("phone, email, alternative_phone, notes")
            .eq("id", conversationData.contact_id)
            .single();

          if (currentContact) {
            const extractResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content: `Analiza el mensaje del paciente. ¿Contiene un correo electrónico o un número de teléfono diferente al que usa en WhatsApp?

Teléfono actual de WhatsApp: ${currentContact.phone}

Reglas:
- Un email es cualquier texto con formato usuario@dominio.com
- Un teléfono diferente es cualquier número que NO sea ${currentContact.phone}
- Si el paciente dice "mi número es ${currentContact.phone}" (el mismo de WhatsApp), NO es diferente
- Si menciona un número en contexto de servicio o precio (ej: "cuesta 25 dólares"), NO es teléfono
- Si menciona un código postal, edad, cantidad, hora, NO es teléfono
- El contexto del teléfono es para qué lo usa: "celular personal", "fijo de casa", "oficina", etc.`,
                  },
                  { role: "user", content: lastInbound.content },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "extract_contact_data",
                      description: "Extract email and alternative phone from patient message",
                      parameters: {
                        type: "object",
                        properties: {
                          has_email: { type: "boolean" },
                          email: { type: "string" },
                          has_different_phone: { type: "boolean" },
                          different_phone: { type: "string" },
                          phone_context: { type: "string" },
                        },
                        required: ["has_email", "has_different_phone"],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: { type: "function", function: { name: "extract_contact_data" } },
                stream: false,
                max_tokens: 150,
              }),
            });

            if (extractResp.ok) {
              const extractData = await extractResp.json();
              // Log extraction usage
              try {
                const eUsage = extractData.usage;
                const eIn = eUsage?.prompt_tokens || 0;
                const eOut = eUsage?.completion_tokens || 0;
                const eCost = (eIn * 0.075 + eOut * 0.30) / 1_000_000;
                await supabase.from("ai_token_usage").insert({
                  clinic_id, user_id: null,
                  generator_type: "agent_extraction", model: "google/gemini-2.5-flash-lite",
                  tokens_input: eIn, tokens_output: eOut, cost_usd: eCost,
                  action_label: "Extracción datos de contacto",
                });
              } catch (logErr) { console.error("[EXTRACT] Usage log error:", logErr); }
              const toolCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
              if (toolCall?.function?.arguments) {
                const parsed = JSON.parse(toolCall.function.arguments);
                console.log("[CONTACT EXTRACT]", JSON.stringify(parsed));

                const updates: Record<string, any> = {};

                if (parsed.has_email && parsed.email) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (emailRegex.test(parsed.email)) {
                    updates.email = parsed.email.toLowerCase().trim();
                    console.log(`[CONTACT] Email updated: ${updates.email}`);
                  }
                }

                if (parsed.has_different_phone && parsed.different_phone) {
                  const cleanPhone = parsed.different_phone.replace(/[\s\-\(\)]/g, "");
                  const currentClean = currentContact.phone.replace(/[\s\-\(\)]/g, "");
                  
                  if (cleanPhone !== currentClean && cleanPhone.length >= 7) {
                    if (!currentContact.alternative_phone) {
                      updates.alternative_phone = cleanPhone;
                      updates.alternative_phone_label = parsed.phone_context || "Teléfono alternativo";
                      console.log(`[CONTACT] Alternative phone saved: ${cleanPhone}`);
                    } else {
                      const existingClean = currentContact.alternative_phone.replace(/[\s\-\(\)]/g, "");
                      if (existingClean !== cleanPhone) {
                        const today = new Date().toISOString().split("T")[0];
                        const noteEntry = `\n[${today}] Número adicional: ${cleanPhone} (${parsed.phone_context || "sin contexto"})`;
                        updates.notes = (currentContact.notes || "") + noteEntry;
                        console.log(`[CONTACT] Additional phone added to notes: ${cleanPhone}`);
                      }
                    }
                  }
                }

                if (Object.keys(updates).length > 0) {
                  updates.updated_at = new Date().toISOString();
                  await supabase.from("contacts").update(updates).eq("id", conversationData.contact_id);
                  console.log(`[CONTACT] Updated fields: ${Object.keys(updates).join(", ")}`);
                }
              }
            }
          }
        } catch (e) {
          console.error("[CONTACT EXTRACT] Non-blocking error:", e);
        }

        // ====== POST-REPLY: Detect appointment intent ======
        if (triggered_by === "auto" && convState?.pipeline_tab !== "agendados") {
          try {
            const detectResp = await fetch(`${supabaseUrl}/functions/v1/appointment-flow`, {
              method: "POST",
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "detect_intent",
                conversation_id,
                clinic_id,
                patient_message: lastInbound.content,
              }),
            });
            const detectResult = await detectResp.json();
            console.log("Appointment intent detection:", JSON.stringify(detectResult));
          } catch (e) {
            console.error("Appointment intent detection failed (non-blocking):", e);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      reply, message: savedMsg,
      follow_up_count: isFollowUp ? (conversationData.follow_up_count || 0) + 1 : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-agent-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function estimateTokenCost(model: string, tokensInput: number, tokensOutput: number): number {
  const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    "gemini-3-flash-preview": { input: 0.15, output: 0.60 },
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "gemini-2.5-pro": { input: 1.25, output: 10.0 },
    "gemini-3-pro-preview": { input: 1.25, output: 10.0 },
  };
  const modelKey = model.split("/").pop() || model;
  const pricing = MODEL_PRICING[modelKey];
  if (!pricing) return (tokensInput * 0.15 + tokensOutput * 0.60) / 1_000_000;
  return (tokensInput * pricing.input + tokensOutput * pricing.output) / 1_000_000;
}

// === Robust timezone helpers (same approach as appointment-flow) ===
type LocalDateReply = { year: number; month: number; day: number; weekday: number; iso: string; dd: string; mm: string; dayNameES: string };

function getLocalDateInfoReply(timeZone: string, source = new Date()): LocalDateReply {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(source)
      .filter(p => p.type !== "literal")
      .map(p => [p.type, p.value])
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = d.getUTCDay();
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return {
    year, month, day, weekday,
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    dd: String(day).padStart(2, "0"),
    mm: String(month).padStart(2, "0"),
    dayNameES: dayNames[weekday],
  };
}

function addDaysReply(base: LocalDateReply, days: number): LocalDateReply {
  const d = new Date(Date.UTC(base.year, base.month - 1, base.day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekday = d.getUTCDay();
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return {
    year, month, day, weekday,
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    dd: String(day).padStart(2, "0"),
    mm: String(month).padStart(2, "0"),
    dayNameES: dayNames[weekday],
  };
}
