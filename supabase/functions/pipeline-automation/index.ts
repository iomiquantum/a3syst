import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculateHumanDelay(responseText: string): number {
  const length = responseText.length;
  let base: number, range: number;

  if (length < 50) {
    base = 8; range = 3;
  } else if (length < 150) {
    base = 15; range = 5;
  } else if (length < 300) {
    base = 25; range = 7;
  } else {
    base = 35; range = 10;
  }

  const delay = Math.floor(base + (Math.random() * range * 2) - range);
  return Math.min(Math.max(delay, 5), 45) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const errors: { conversation_id: string; error: string }[] = [];
  let tarea1Count = 0, tarea2Sent = 0, tarea2NoResponden = 0, tarea3Fixed = 0;
  let tarea5Reminder1 = 0, tarea5Reminder2 = 0;

  // === ACQUIRE LOCK ===
  const { data: lockRow } = await supabase
    .from("pipeline_execution_lock")
    .update({ is_running: true, started_at: new Date().toISOString() })
    .eq("id", 1)
    .eq("is_running", false)
    .select()
    .maybeSingle();

  if (!lockRow) {
    const { data: staleLock } = await supabase
      .from("pipeline_execution_lock")
      .select("started_at")
      .eq("id", 1)
      .eq("is_running", true)
      .single();

    if (staleLock?.started_at) {
      const elapsed = Date.now() - new Date(staleLock.started_at).getTime();
      if (elapsed > 10 * 60 * 1000) {
        console.warn("[PIPELINE] Stale lock detected, forcing unlock");
        await supabase.from("pipeline_execution_lock").update({ is_running: true, started_at: new Date().toISOString() }).eq("id", 1);
      } else {
        return jsonResponse({ status: "skipped", reason: "another execution in progress" });
      }
    } else {
      return jsonResponse({ status: "skipped", reason: "lock acquisition failed" });
    }
  }

  try {
    // === LOAD GLOBAL RULES ===
    const { data: rulesRows } = await supabase.from("pipeline_global_rules").select("rule_key, rule_value");
    const rules: Record<string, any> = {};
    (rulesRows || []).forEach((r: { rule_key: string; rule_value: unknown }) => {
      rules[r.rule_key] = r.rule_value;
    });

    const inactivityTimeout = Number(rules["inactivity_timeout_minutes"]) || 15;
    const maxAutoContacts = Number(rules["max_auto_contacts"]) || 10;
    const sendWindowStart = Number(rules["send_window_start_hour"]) || 8;
    const sendWindowEnd = Number(rules["send_window_end_hour"]) || 21;
    const humanDelayEnabled = rules["human_delay_enabled"] !== "false" && rules["human_delay_enabled"] !== false;
    const globalAgentName = (typeof rules["ai_agent_name"] === "string" ? rules["ai_agent_name"].replace(/^"|"$/g, "") : "Sofía") || "Sofía";

    // Build delay map for S1-S8
    const delayMap: Record<number, number> = {};
    for (let i = 1; i <= 8; i++) {
      delayMap[i] = Number(rules[`s${i}_delay_minutes`]) || [15, 30, 30, 60, 120, 240, 720, 30][i - 1];
    }

    // === LOAD STRATEGIES ===
    const { data: strategiesRows } = await supabase
      .from("seguimiento_strategies")
      .select("*")
      .order("contact_number", { ascending: true });
    const strategiesMap: Record<number, any> = {};
    (strategiesRows || []).forEach((s: any) => { strategiesMap[s.contact_number] = s; });

    // Check business hours
    const nowHour = new Date().getHours();
    const isWithinSendWindow = nowHour >= sendWindowStart && nowHour < sendWindowEnd;

    // ========== TAREA 1: Inactivity timeout ==========
    console.log("[PIPELINE] TAREA 1: Checking inactivity timeout...");
    const cutoff = new Date(Date.now() - inactivityTimeout * 60 * 1000).toISOString();
    const { data: inactiveConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, inactivity_timer_start, seguimiento_next_s")
      .eq("pipeline_tab", "resueltos_ia")
      .eq("chatbot_active", true)
      .not("inactivity_timer_start", "is", null)
      .lt("inactivity_timer_start", cutoff);

    for (const conv of inactiveConvs || []) {
      try {
        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab, seguimiento_next_s").eq("id", conv.id).single();
        if (fresh?.pipeline_tab !== "resueltos_ia") continue;

        // Determine which S to move to (never retrocede)
        const nextS = Math.max(fresh.seguimiento_next_s || 1, 1);
        const targetTab = `seguimiento_s${nextS}`;

        // Get delay for this S from clinic overrides or global
        let contactDelay = delayMap[nextS] || 15;
        const { data: clinicRule } = await supabase
          .from("clinic_pipeline_rules").select("rule_value")
          .eq("clinic_id", conv.clinic_id).eq("rule_key", `s${nextS}_delay_minutes`).maybeSingle();
        if (clinicRule) contactDelay = Number(clinicRule.rule_value) || contactDelay;

        const nextContactAt = new Date(Date.now() + contactDelay * 60 * 1000).toISOString();
        await supabase.from("conversations").update({
          pipeline_tab: targetTab,
          seguimiento_contact_number: nextS,
          seguimiento_next_contact_at: nextContactAt,
          inactivity_timer_start: null,
        }).eq("id", conv.id);

        await supabase.from("conversation_pipeline_history").insert({
          conversation_id: conv.id, clinic_id: conv.clinic_id,
          from_tab: "resueltos_ia", to_tab: targetTab,
          moved_by: "system", reason: `Inactividad de ${inactivityTimeout} minutos → S${nextS}`,
        });
        tarea1Count++;
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 2: Follow-up messages (S1-S10) ==========
    console.log("[PIPELINE] TAREA 2: Sending follow-up messages...");
    const now = new Date().toISOString();
    const seguimientoTabs = Array.from({ length: 10 }, (_, i) => `seguimiento_s${i + 1}`);
    const { data: followUpConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, seguimiento_last_completed_s, seguimiento_next_s, seguimiento_responded_at_s, seguimiento_is_recurrente, seguimiento_recurrente_count, contact_id, channel, visitor_contact")
      .in("pipeline_tab", seguimientoTabs)
      .not("seguimiento_next_contact_at", "is", null)
      .lt("seguimiento_next_contact_at", now);

    for (const conv of followUpConvs || []) {
      try {
        if (!isWithinSendWindow) {
          console.log(`[PIPELINE] Outside send window (${sendWindowStart}-${sendWindowEnd}), skipping conv ${conv.id}`);
          continue;
        }

        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab, seguimiento_contact_number").eq("id", conv.id).single();
        if (!fresh || !fresh.pipeline_tab?.startsWith("seguimiento_s")) continue;

        const contactNumber = fresh.seguimiento_contact_number || conv.seguimiento_contact_number || 1;
        const isManualStep = contactNumber >= 9;

        // S9-S10 are manual — don't send auto messages, just wait
        if (isManualStep) {
          console.log(`[PIPELINE] S${contactNumber} is manual, skipping auto-send for conv ${conv.id}`);
          continue;
        }

        // Get strategy for this contact number
        const strategy = strategiesMap[contactNumber];

        // Get clinic agent name override
        let agentName = globalAgentName;
        const { data: nameOverride } = await supabase
          .from("clinic_pipeline_rules").select("rule_value")
          .eq("clinic_id", conv.clinic_id).eq("rule_key", "ai_agent_name").maybeSingle();
        if (nameOverride?.rule_value) {
          agentName = String(nameOverride.rule_value).replace(/^"|"$/g, "") || agentName;
        }

        // Get clinic name
        const { data: clinic } = await supabase.from("clinics").select("name").eq("id", conv.clinic_id).single();
        const clinicName = clinic?.name || "el negocio";

        // Get contact name
        let contactName = "cliente";
        if (conv.contact_id) {
          const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
          if (contact?.name) contactName = contact.name.split(" ")[0];
        }

        // Get last 20 messages for context
        const { data: recentMessages } = await supabase
          .from("messages").select("direction, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false }).limit(20);
        if (recentMessages) recentMessages.reverse();

        const messagesContext = (recentMessages || [])
          .map(m => `${m.direction === "inbound" ? "Cliente" : agentName}: ${m.content}`)
          .join("\n");

        // Check if last pipeline move was manual (for context)
        let manualMoveContext = "";
        const { data: lastMove } = await supabase
          .from("conversation_pipeline_history")
          .select("from_tab, to_tab, moved_by, reason, metadata")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMove && lastMove.moved_by !== "system") {
          const meta = lastMove.metadata as Record<string, any> | null;
          manualMoveContext = `
CONTEXTO DE MOVIMIENTO:
- Esta conversación fue movida manualmente por un agente de '${lastMove.from_tab}' a '${lastMove.to_tab}'
- Razón: ${lastMove.reason || "Sin razón especificada"}
- El agente que lo movió: ${meta?.agent_name || "Agente"}
- Esto significa que debes adaptar tu mensaje al nuevo contexto sin ignorar la historia previa.
- Si el cliente ya fue atendido antes, reconócelo sutilmente.
- Si el cliente ya visitó el negocio, no lo trates como nuevo.`;
        }

        // Build strategy-enhanced prompt
        let followUpPrompt: string;
        if (strategy) {
          followUpPrompt = `Eres ${agentName}, asistente de ${clinicName}. Estás dando seguimiento a un paciente que dejó de responder.

CONVERSACIÓN COMPLETA (últimos 20 mensajes):
${messagesContext}

INFORMACIÓN DEL CONTACTO:
- Nombre: ${contactName}
- Es recurrente (ya pasó por seguimiento antes): ${conv.seguimiento_is_recurrente} (veces: ${conv.seguimiento_recurrente_count})
- Respondió por última vez en S${conv.seguimiento_responded_at_s}
${manualMoveContext}

CONTACTO ACTUAL: S${contactNumber} de 10
ESTRATEGIA: ${strategy.strategy_name} — ${strategy.strategy_description}
INSTRUCCIÓN: ${strategy.prompt_instruction}
REGLAS DE ESTA ESTRATEGIA: ${strategy.rules}
BARRERA QUE DEBES RESOLVER: ${strategy.barrier_it_solves}
PRINCIPIO PSICOLÓGICO: ${strategy.psychological_principle}

REGLAS GLOBALES INQUEBRANTABLES:
1. Genera UN solo mensaje corto (máximo 2 oraciones, máximo 160 caracteres)
2. Adapta la estrategia al CONTEXTO REAL de la conversación
3. Retoma lo ÚLTIMO que se habló, NUNCA repitas información ya dada
4. Suena como una persona real llamada ${agentName}, NO como bot ni vendedora
5. Usa el nombre del cliente: ${contactName}
6. Si es S1: preséntate brevemente ("Hola ${contactName}, soy ${agentName} de ${clinicName}")
7. Si es S2-S8: NO repitas tu nombre, ya te presentaste
8. NUNCA menciones que eres bot, IA, sistema automatizado, o que esto es un "seguimiento automático"
9. NUNCA uses frases como "sistema de seguimiento", "mensaje programado", "recordatorio automático"
10. Si el cliente es recurrente, sé más directa y familiar (ya te conoce)
11. Si es S7 o S8: el tono es empático y de despedida, SIN preguntas

Responde SOLO con el texto del mensaje. Sin comillas, sin explicación, sin "Aquí tienes el mensaje:".`;
        } else {
          followUpPrompt = `Genera un mensaje de seguimiento #${contactNumber} para ${contactName}. Contexto: ${messagesContext}. ${manualMoveContext} Máximo 2 oraciones.`;
        }

        // Generate with AI
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          console.error("[PIPELINE] LOVABLE_API_KEY not configured, skipping AI generation");
          continue;
        }

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: followUpPrompt },
              { role: "user", content: "Genera el mensaje de seguimiento." },
            ],
            stream: false,
            max_tokens: 200,
          }),
        });

        if (!aiResp.ok) {
          console.error(`[PIPELINE] AI generation failed for conv ${conv.id}:`, await aiResp.text());
          continue;
        }

        const aiData = await aiResp.json();
        const messageContent = aiData.choices?.[0]?.message?.content?.trim();
        if (!messageContent) {
          console.error(`[PIPELINE] Empty AI response for conv ${conv.id}`);
          continue;
        }

        // Human delay
        if (humanDelayEnabled) {
          const delayMs = calculateHumanDelay(messageContent);
          console.log(`[PIPELINE] Human delay: ${delayMs}ms for S${contactNumber} conv ${conv.id}`);
          await sleep(delayMs);
        }

        // Send message
        const channel = conv.channel || "whatsapp";
        if (channel === "whatsapp" && conv.visitor_contact) {
          const sendResp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
            body: JSON.stringify({ clinic_id: conv.clinic_id, to_number: conv.visitor_contact, message_type: "text", content: messageContent, conversation_id: conv.id }),
          });
          if (!sendResp.ok) {
            console.error(`[PIPELINE] WhatsApp send failed for conv ${conv.id}`);
          }
        } else {
          await supabase.from("messages").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            direction: "outbound", content: messageContent, message_type: "text", status: "sent",
          });
        }

        tarea2Sent++;
        console.log(`[PIPELINE] S${contactNumber} (${strategy?.strategy_name || "generic"}) sent for conv ${conv.id}`);

        // Log token usage
        const usage = aiData?.usage || {};
        await supabase.from("ai_token_usage").insert({
          clinic_id: conv.clinic_id,
          generator_type: "agent",
          model: aiData?.model || "google/gemini-2.5-flash",
          tokens_input: usage.prompt_tokens || 0,
          tokens_output: usage.completion_tokens || 0,
          cost_usd: 0,
          action_label: `Seguimiento S${contactNumber} — ${strategy?.strategy_name || "generic"}`,
        });

        // Advance pipeline
        const nextContactNumber = contactNumber + 1;
        if (nextContactNumber > maxAutoContacts) {
          await supabase.from("conversations").update({
            pipeline_tab: "no_responden",
            seguimiento_next_contact_at: null,
            seguimiento_last_contact_at: now,
            seguimiento_last_completed_s: contactNumber,
          }).eq("id", conv.id);
          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: `seguimiento_s${contactNumber}`, to_tab: "no_responden",
            moved_by: "system", reason: `Sin respuesta después de ${maxAutoContacts} contactos`,
          });
          tarea2NoResponden++;
        } else {
          const nextDelay = delayMap[nextContactNumber] || 30;
          const { data: clinicDelay } = await supabase
            .from("clinic_pipeline_rules").select("rule_value")
            .eq("clinic_id", conv.clinic_id).eq("rule_key", `s${nextContactNumber}_delay_minutes`).maybeSingle();
          const actualDelay = clinicDelay ? Number(clinicDelay.rule_value) || nextDelay : nextDelay;

          await supabase.from("conversations").update({
            pipeline_tab: `seguimiento_s${nextContactNumber}`,
            seguimiento_contact_number: nextContactNumber,
            seguimiento_next_contact_at: new Date(Date.now() + actualDelay * 60 * 1000).toISOString(),
            seguimiento_last_contact_at: now,
            seguimiento_last_completed_s: contactNumber,
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: `seguimiento_s${contactNumber}`, to_tab: `seguimiento_s${nextContactNumber}`,
            moved_by: "system", reason: `S${contactNumber} (${strategy?.strategy_name || "generic"}) enviado`,
          });
        }

        await supabase.from("conversations").update({ last_message_at: now, last_message_preview: messageContent.substring(0, 100) }).eq("id", conv.id);
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 3: Cleanup inconsistencies ==========
    console.log("[PIPELINE] TAREA 3: Cleanup...");
    const { data: inconsistent } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, seguimiento_last_contact_at")
      .like("pipeline_tab", "seguimiento_%")
      .is("seguimiento_next_contact_at", null);

    for (const conv of inconsistent || []) {
      try {
        const cn = conv.seguimiento_contact_number || 1;
        const delay = delayMap[cn] || 15;
        const base = conv.seguimiento_last_contact_at || new Date().toISOString();
        await supabase.from("conversations").update({
          seguimiento_next_contact_at: new Date(new Date(base).getTime() + delay * 60 * 1000).toISOString(),
        }).eq("id", conv.id);
        tarea3Fixed++;
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 5: APPOINTMENT REMINDERS ==========
    console.log("[PIPELINE] TAREA 5: Appointment reminders...");

    if (!isWithinSendWindow) {
      console.log("[PIPELINE] Outside send window, skipping appointment reminders");
    } else {
      const { data: reminderConfigs } = await supabase
        .from("appointment_reminder_config")
        .select("*")
        .eq("is_active", true);

      if (reminderConfigs && reminderConfigs.length > 0) {
        const configByClinic: Record<string, any[]> = {};
        for (const rc of reminderConfigs) {
          if (!configByClinic[rc.clinic_id]) configByClinic[rc.clinic_id] = [];
          configByClinic[rc.clinic_id].push(rc);
        }

        const nowDate = new Date();

        // REMINDER 1
        const { data: reminder1Convs } = await supabase
          .from("conversations")
          .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed")
          .eq("pipeline_tab", "agendados")
          .eq("appointment_reminder_1_sent", false)
          .not("appointment_date", "is", null)
          .gt("appointment_date", nowDate.toISOString());

        for (const conv of reminder1Convs || []) {
          try {
            if (conv.appointment_confirmed) continue;
            const clinicConfigs = configByClinic[conv.clinic_id];
            const r1Config = clinicConfigs?.find((c: any) => c.reminder_number === 1);
            if (!r1Config) continue;

            const appointmentDate = new Date(conv.appointment_date);
            const hoursUntil = (appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            if (hoursUntil > r1Config.hours_before_appointment) continue;

            let contactName = "cliente";
            if (conv.contact_id) {
              const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
              if (contact?.name) contactName = contact.name.split(" ")[0];
            }

            const fecha = appointmentDate.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
            const hora = conv.appointment_time || appointmentDate.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
            const servicio = conv.appointment_service || "tu cita";

            const message = (r1Config.message_template || "")
              .replace(/\{\{nombre\}\}/g, contactName)
              .replace(/\{\{fecha\}\}/g, fecha)
              .replace(/\{\{hora\}\}/g, hora)
              .replace(/\{\{servicio\}\}/g, servicio);

            if (humanDelayEnabled) await sleep(calculateHumanDelay(message));

            if (conv.channel === "whatsapp" && conv.visitor_contact) {
              await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
                body: JSON.stringify({ clinic_id: conv.clinic_id, to_number: conv.visitor_contact, message_type: "text", content: message, conversation_id: conv.id }),
              });
            } else {
              await supabase.from("messages").insert({
                conversation_id: conv.id, clinic_id: conv.clinic_id,
                direction: "outbound", content: message, message_type: "text", status: "sent",
              });
            }

            await supabase.from("conversations").update({
              appointment_reminder_1_sent: true,
              appointment_reminder_1_sent_at: nowDate.toISOString(),
              appointment_status: "reminder_1_sent",
            }).eq("id", conv.id);

            await supabase.from("conversation_pipeline_history").insert({
              conversation_id: conv.id, clinic_id: conv.clinic_id,
              from_tab: "agendados", to_tab: "agendados",
              moved_by: "system", reason: "Recordatorio 1 enviado",
            });

            tarea5Reminder1++;
          } catch (e) {
            errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
          }
        }

        // REMINDER 2
        const { data: reminder2Convs } = await supabase
          .from("conversations")
          .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed")
          .eq("pipeline_tab", "agendados")
          .eq("appointment_reminder_1_sent", true)
          .eq("appointment_reminder_2_sent", false)
          .eq("appointment_confirmed", false)
          .not("appointment_date", "is", null)
          .gt("appointment_date", nowDate.toISOString());

        for (const conv of reminder2Convs || []) {
          try {
            const clinicConfigs = configByClinic[conv.clinic_id];
            const r2Config = clinicConfigs?.find((c: any) => c.reminder_number === 2);
            if (!r2Config) continue;

            const appointmentDate = new Date(conv.appointment_date);
            const hoursUntil = (appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            if (hoursUntil > r2Config.hours_before_appointment) continue;

            let contactName = "cliente";
            if (conv.contact_id) {
              const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
              if (contact?.name) contactName = contact.name.split(" ")[0];
            }

            const fecha = appointmentDate.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
            const hora = conv.appointment_time || appointmentDate.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
            const servicio = conv.appointment_service || "tu cita";

            const message = (r2Config.message_template || "")
              .replace(/\{\{nombre\}\}/g, contactName)
              .replace(/\{\{fecha\}\}/g, fecha)
              .replace(/\{\{hora\}\}/g, hora)
              .replace(/\{\{servicio\}\}/g, servicio);

            if (humanDelayEnabled) await sleep(calculateHumanDelay(message));

            if (conv.channel === "whatsapp" && conv.visitor_contact) {
              await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
                body: JSON.stringify({ clinic_id: conv.clinic_id, to_number: conv.visitor_contact, message_type: "text", content: message, conversation_id: conv.id }),
              });
            } else {
              await supabase.from("messages").insert({
                conversation_id: conv.id, clinic_id: conv.clinic_id,
                direction: "outbound", content: message, message_type: "text", status: "sent",
              });
            }

            await supabase.from("conversations").update({
              appointment_reminder_2_sent: true,
              appointment_reminder_2_sent_at: nowDate.toISOString(),
              appointment_status: "reminder_2_sent",
            }).eq("id", conv.id);

            await supabase.from("conversation_pipeline_history").insert({
              conversation_id: conv.id, clinic_id: conv.clinic_id,
              from_tab: "agendados", to_tab: "agendados",
              moved_by: "system", reason: "Recordatorio 2 enviado",
            });

            tarea5Reminder2++;
          } catch (e) {
            errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
    }

  } finally {
    await supabase.from("pipeline_execution_lock").update({
      is_running: false,
      last_completed_at: new Date().toISOString(),
    }).eq("id", 1);
  }

  const result = {
    executed_at: new Date().toISOString(),
    tarea1_moved_to_seguimiento: tarea1Count,
    tarea2_messages_sent: tarea2Sent,
    tarea2_moved_to_no_responden: tarea2NoResponden,
    tarea3_inconsistencies_fixed: tarea3Fixed,
    tarea5_reminder1_sent: tarea5Reminder1,
    tarea5_reminder2_sent: tarea5Reminder2,
    errors,
  };

  await supabase.from("pipeline_execution_log").insert({
    moved_to_seguimiento: tarea1Count,
    messages_sent: tarea2Sent,
    moved_to_no_responden: tarea2NoResponden,
    inconsistencies_fixed: tarea3Fixed,
    errors: errors.length > 0 ? JSON.stringify(errors) : "[]",
    duration_ms: Date.now() - startTime,
  });

  console.log("[PIPELINE] Execution complete:", JSON.stringify(result));
  return jsonResponse(result);
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
