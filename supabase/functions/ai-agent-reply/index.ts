import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, clinic_id, triggered_by = "manual", channel: requestChannel, draft_only = false, custom_prompt, skip_already_replied = false } = await req.json();
    const isFollowUp = triggered_by === "follow_up";
    const isDraft = draft_only === true;
    console.log("ai-agent-reply called:", { conversation_id, clinic_id, triggered_by, isFollowUp, isDraft, requestChannel });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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

    // Fetch clinic schedule info
    const { data: clinicInfo } = await supabase
      .from("clinics")
      .select("name, working_days, opening_hour, closing_hour")
      .eq("id", clinic_id)
      .single();

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id, channel, visitor_contact, contact_id, chatbot_active, follow_up_count, last_inbound_at, appointment_flow_active, appointment_flow_step, appointment_flow_data, pipeline_tab, appointment_confirmed")
      .eq("id", conversation_id)
      .eq("clinic_id", clinic_id)
      .single();

    if (conversationError || !conversationData) throw conversationError || new Error("Conversation not found");

    // ====== APPOINTMENT FLOW: If active, delegate to appointment-flow function ======
    if (conversationData.appointment_flow_active && !isDraft && !isFollowUp) {
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
               body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: reply, conversation_id, origin: "appointment_flow" }),
            });
            savedMsg = await sendResponse.json().catch(() => null);
          }
        } else {
          const { data: insertedMessage } = await supabase.from("messages").insert({
            conversation_id, clinic_id, direction: "outbound", content: reply, message_type: "text", status: "sent", origin: "appointment_flow",
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
        // Send cancel message and continue normal flow
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
              body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: cancelReply, conversation_id, origin: "appointment_flow" }),
            });
          }
        } else {
          await supabase.from("messages").insert({
            conversation_id, clinic_id, direction: "outbound", content: cancelReply, message_type: "text", status: "sent",
          });
          await supabase.from("conversations").update({
            last_message_at: new Date().toISOString(), last_message_preview: cancelReply.substring(0, 100),
          }).eq("id", conversation_id);
        }
        return new Response(JSON.stringify({ reply: cancelReply, appointment_flow: true, flow_cancelled: true }), {
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
                body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: reply, conversation_id }),
              });
            }
          } else {
            await supabase.from("messages").insert({
              conversation_id, clinic_id, direction: "outbound", content: reply, message_type: "text", status: "sent",
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

    // Fetch recent messages for context (last 6 to save tokens)
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("direction, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(6);

    if (recentMessages) recentMessages.reverse();

    // Build system prompt from agent config
    const services = (agentConfig.services || []) as { name: string; price: string; description: string }[];
    const langLabel = agentConfig.language === "es" ? "Español" : agentConfig.language === "en" ? "English" : "Português";

    let systemPrompt = `Eres "${agentConfig.agent_name}", un asistente virtual del negocio.
Idioma: ${langLabel}
Tono: ${agentConfig.tone}

NEGOCIO: ${clinicInfo?.name || ""}
HORARIO DE ATENCIÓN: ${(clinicInfo?.working_days || []).length > 0 ? `${(clinicInfo.working_days as string[]).join(", ")}. ${clinicInfo.opening_hour || ""} a ${clinicInfo.closing_hour || ""}` : "(sin horario configurado)"}
FECHA DE HOY: ${new Date().toISOString().split("T")[0]} (${new Date().toLocaleDateString("es", { weekday: "long" })})

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

IMPORTANTE:
- Responde de forma breve y directa (máximo 2-3 oraciones).
- Usa emojis con moderación.
- Si no sabes algo, sugiere contactar al negocio directamente.
- Nunca inventes información sobre servicios o precios que no estén listados arriba.
- NUNCA ofrezcas citas en días fuera del horario de atención configurado. Si el cliente pide un día no laborable, sugiere el siguiente día hábil.
- Si el cliente ya recibió un mensaje de bienvenida, NO repitas el saludo ni te presentes de nuevo. Ve directo a responder su pregunta o consulta.
- Cuando el cliente pregunte sobre un servicio o tema específico, responde directamente sobre eso. No des respuestas genéricas.`;

    // Follow-up mode
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

      systemPrompt += `\n\n=== MODO SEGUIMIENTO (Contacto ${followUpCount}) ===
Este es un mensaje de seguimiento #${followUpCount}. El contacto no ha respondido en ${timeLabel}.
- Genera un mensaje amable y persuasivo para que el contacto retome la conversación.
- NO repitas el mismo mensaje anterior, varía el enfoque.
- Contacto ${followUpCount <= 2 ? ": Sé amable y recuerda los beneficios del servicio." : followUpCount <= 4 ? ": Crea urgencia moderada, menciona disponibilidad limitada o promociones." : ": Último intento, ofrece ayuda directa o alternativas de contacto."}
- Mantén el mensaje corto (1-2 oraciones máximo).`;
    }

    // Fetch channel-specific instructions
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
    const rawMsgs = (recentMessages || []).map((m) => ({
      role: m.direction === "inbound" ? "user" as const : "assistant" as const,
      content: m.content || "",
    }));

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

    // Try primary model, fallback if null response
    const tryModel = async (model: string): Promise<{ reply: string | null; data: any }> => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages: aiMessages, stream: false, max_tokens: 500 }),
      });

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
      if (e.status === 429 || e.status === 402) {
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

      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id, to_number: toNumber, message_type: "text", content: reply, conversation_id }),
      });

      const sendPayload = await sendResponse.json().catch(() => null);
      console.log("AI reply delivery response:", JSON.stringify(sendPayload));
      if (!sendResponse.ok || sendPayload?.error) {
        throw new Error(`WhatsApp send failed: ${JSON.stringify(sendPayload || { status: sendResponse.status })}`);
      }
      savedMsg = sendPayload;
    } else {
      const { data: insertedMessage, error: msgError } = await supabase.from("messages").insert({
        conversation_id, clinic_id, direction: "outbound", content: reply, message_type: "text", status: "sent",
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
      .select("pipeline_tab")
      .eq("id", conversation_id)
      .single();

    if (convState?.pipeline_tab === "resueltos_ia") {
      await supabase.from("conversations").update({
        inactivity_timer_start: new Date().toISOString(),
      }).eq("id", conversation_id);
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
