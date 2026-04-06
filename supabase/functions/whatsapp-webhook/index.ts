import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // --- GET: Webhook verification ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("[WA-Webhook][GET] Verification request received", {
      mode,
      token,
      hasChallenge: Boolean(challenge),
    });

    if (mode === "subscribe" && token) {
      const { data: connection, error: connectionError } = await supabase
        .from("whatsapp_connections")
        .select("id, clinic_id, business_name, phone_number_id, webhook_verify_token, status, webhook_configured")
        .eq("webhook_verify_token", token)
        .maybeSingle();

      if (connectionError) {
        console.error("[WA-Webhook][GET] Error looking up token in DB", connectionError);
      }

      if (connection) {
        console.log("[WA-Webhook][GET] Token matched DB connection", {
          business_name: connection.business_name,
          phone_number_id: connection.phone_number_id,
          incoming_token: token,
          db_token: connection.webhook_verify_token,
          status: connection.status,
          webhook_configured: connection.webhook_configured,
        });

        await supabase.from("whatsapp_connections")
          .update({ webhook_configured: true, status: "active" })
          .eq("id", connection.id);

        console.log("[WA-Webhook][GET] Verified for:", connection.business_name);
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }

      const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
      console.warn("[WA-Webhook][GET] Token did not match any DB row", {
        incoming_token: token,
        global_token: expectedToken,
        global_match: token === expectedToken,
      });

      if (token === expectedToken) {
        console.log("[WA-Webhook][GET] Verified with global token");
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
    }

    console.warn("[WA-Webhook][GET] Verification failed", { mode, token });
    return new Response("Forbidden", { status: 403 });
  }

  // --- POST: Receive inbound messages & status updates ---
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[WA-Webhook][POST] Full payload from Meta:", JSON.stringify(body));

      const entry = body?.entry?.[0];
      if (!entry) {
        console.warn("[WA-Webhook][POST] Request arrived without entry", body);
        return respondOk("no entry");
      }

      const changes = entry.changes?.[0];
      const value = changes?.value;
      if (!value) {
        console.warn("[WA-Webhook][POST] Request arrived without value", body);
        return respondOk("no value");
      }

      const phoneNumberId = value.metadata?.phone_number_id;
      const displayPhoneNumber = value.metadata?.display_phone_number;
      console.log("[WA-Webhook][POST] Parsed metadata", {
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        messages_count: value.messages?.length || 0,
        statuses_count: value.statuses?.length || 0,
      });

      if (!phoneNumberId) {
        console.warn("[WA-Webhook][POST] No phone_number_id in payload", body);
        return respondOk("no phone_number_id");
      }

      const { data: connection, error: connError } = await supabase
        .from("whatsapp_connections")
        .select("id, clinic_id, access_token, business_name, phone_number_id, status, webhook_configured")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (connError) console.error("[WA-Webhook][POST] Connection lookup error:", connError);
      if (!connection) {
        console.error("[WA-Webhook][POST] No connection for phone_number_id:", phoneNumberId);
        return respondOk("no connection");
      }

      console.log("[WA-Webhook][POST] Connection matched", {
        connection_id: connection.id,
        business_name: connection.business_name,
        phone_number_id: connection.phone_number_id,
        status: connection.status,
        webhook_configured: connection.webhook_configured,
      });

      const { id: connectionId, clinic_id: clinicId } = connection;

      // --- Handle status updates ---
      if (value.statuses?.length > 0) {
        for (const s of value.statuses) {
          const updateData: Record<string, unknown> = {
            status: s.status,
            status_timestamp: s.timestamp
              ? new Date(parseInt(s.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
          };
          if (s.status === "failed" && s.errors?.length > 0) {
            updateData.error_code = s.errors[0].code?.toString();
            updateData.error_message = s.errors[0].title || s.errors[0].message;
          }
          await supabase.from("whatsapp_messages").update(updateData).eq("wa_message_id", s.id);

          // Update unified messages table with status + timestamp + error details
          const messagesUpdate: Record<string, unknown> = {
            status: s.status,
            delivery_status_updated_at: new Date().toISOString(),
          };
          if (s.status === "failed" && s.errors?.length > 0) {
            messagesUpdate.error_code = s.errors[0].code?.toString();
            messagesUpdate.error_message = s.errors[0].title || s.errors[0].message;
          }
          await supabase.from("messages").update(messagesUpdate).eq("whatsapp_message_id", s.id);

          // Anti-spam: when a seguimiento outbound message is READ, increment counter
          if (s.status === "read") {
            try {
              const { data: readMsg } = await supabase
                .from("messages")
                .select("id, conversation_id, direction")
                .eq("whatsapp_message_id", s.id)
                .eq("direction", "outbound")
                .maybeSingle();

              if (readMsg?.conversation_id) {
                const { data: conv } = await supabase
                  .from("conversations")
                  .select("pipeline_tab, seguimiento_contact_number, seguimiento_consecutive_read_no_reply")
                  .eq("id", readMsg.conversation_id)
                  .single();

                // Only count for conversations in seguimiento S1-S8
                if (conv?.pipeline_tab?.startsWith("seguimiento_s")) {
                  const currentS = conv.seguimiento_contact_number || 0;
                  if (currentS >= 1 && currentS <= 8) {
                    const newCount = (conv.seguimiento_consecutive_read_no_reply || 0) + 1;
                    await supabase.from("conversations").update({
                      seguimiento_consecutive_read_no_reply: newCount,
                    }).eq("id", readMsg.conversation_id);
                    console.log(`[WA-Webhook] Anti-spam counter incremented to ${newCount} for conv ${readMsg.conversation_id} (S${currentS})`);
                  }
                }
              }
            } catch (spamErr) {
              console.error("[WA-Webhook] Anti-spam counter error:", spamErr);
            }
          }
        }
      }

      // --- Handle inbound messages ---
      if (value.messages?.length > 0) {
        for (const msg of value.messages) {
          const contactInfo = value.contacts?.[0];
          const contactPhone = msg.from;
          const contactName = contactInfo?.profile?.name || contactPhone;

          // Upsert WA conversation
          const { data: conversation } = await supabase
            .from("whatsapp_conversations")
            .upsert({
              connection_id: connectionId,
              clinic_id: clinicId,
              contact_phone: contactPhone,
              contact_name: contactName,
              contact_wa_id: contactPhone,
              status: "open",
              last_message_at: new Date().toISOString(),
            }, { onConflict: "connection_id,contact_phone" })
            .select("id, unread_count")
            .maybeSingle();

          if (!conversation) continue;

          // Parse message content
          const messageType = msg.type || "text";
          let content = "", mediaUrl: string | null = null, mediaMimeType: string | null = null, mediaCaption: string | null = null;

          switch (messageType) {
            case "text": content = msg.text?.body || ""; break;
            case "image": content = msg.image?.caption || "[Imagen]"; mediaUrl = msg.image?.id; mediaMimeType = msg.image?.mime_type; mediaCaption = msg.image?.caption; break;
             case "audio": content = "[Audio]"; mediaUrl = msg.audio?.id; mediaMimeType = msg.audio?.mime_type; break;
             case "voice": content = "[Audio]"; mediaUrl = msg.voice?.id || msg.audio?.id; mediaMimeType = msg.voice?.mime_type || msg.audio?.mime_type; break;
            case "video": content = msg.video?.caption || "[Video]"; mediaUrl = msg.video?.id; mediaMimeType = msg.video?.mime_type; break;
            case "document": content = msg.document?.filename || "[Documento]"; mediaUrl = msg.document?.id; mediaMimeType = msg.document?.mime_type; break;
            case "location": content = `📍 ${msg.location?.latitude}, ${msg.location?.longitude}`; break;
            case "sticker": content = "[Sticker]"; mediaUrl = msg.sticker?.id; break;
            case "reaction": content = msg.reaction?.emoji || "👍"; break;
            case "button": content = msg.button?.text || "[Botón]"; break;
            case "interactive": content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Interactivo]"; break;
            default: content = `[${messageType}]`;
          }

          // Download media from Meta API if we have a media ID
          let downloadedMediaUrl: string | null = null;
          let audioBlob: Blob | null = null;
          if (mediaUrl && ["audio", "voice", "image", "video", "document", "sticker"].includes(messageType)) {
            try {
              const accessToken = connection.access_token || Deno.env.get("META_ACCESS_TOKEN");
              if (accessToken) {
                const mediaResp = await fetch(`https://graph.facebook.com/v21.0/${mediaUrl}`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const mediaData = await mediaResp.json();
                
                if (mediaData.url) {
                  const binaryResp = await fetch(mediaData.url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                  
                  if (binaryResp.ok) {
                    const blob = await binaryResp.blob();
                    if (messageType === "audio" || messageType === "voice") {
                      audioBlob = blob;
                    }
                    const ext = mediaMimeType?.split("/")[1]?.replace("ogg", "ogg") || "bin";
                    const fileName = `${clinicId}/${conversation.id}/${msg.id}.${ext}`;
                    
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                      .from("chat-media")
                      .upload(fileName, blob, {
                        contentType: mediaMimeType || "application/octet-stream",
                        upsert: true,
                      });
                    
                    if (!uploadErr && uploadData) {
                      const { data: publicUrl } = supabase.storage.from("chat-media").getPublicUrl(fileName);
                      downloadedMediaUrl = publicUrl.publicUrl;
                      console.log("[WA-Webhook] Media uploaded:", downloadedMediaUrl);
                    } else {
                      console.error("[WA-Webhook] Media upload error:", uploadErr);
                    }
                  }
                }
              }
            } catch (mediaErr) {
              console.error("[WA-Webhook] Media download error:", mediaErr);
            }
          }

          // Transcribe audio/voice notes using Gemini
          let audioTranscription: string | null = null;
          if ((messageType === "audio" || messageType === "voice") && audioBlob) {
            try {
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (LOVABLE_API_KEY) {
                // Convert blob to base64 in chunks to avoid stack overflow on large files
                const arrayBuf = await audioBlob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuf);
                let base64Audio = "";
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                  const chunk = uint8Array.slice(i, i + chunkSize);
                  base64Audio += btoa(String.fromCharCode(...chunk));
                }
                
                const mimeForAI = mediaMimeType || "audio/ogg";

                const transcribeResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [
                      { role: "system", content: "Transcribe the following audio message exactly as spoken in the original language. Return ONLY the transcription text, nothing else. If the audio is unclear or empty, return '[Audio inaudible]'." },
                      { role: "user", content: [
                        { type: "input_audio", input_audio: { data: base64Audio, format: mimeForAI.includes("ogg") ? "ogg" : mimeForAI.includes("mp4") ? "mp4" : "wav" } },
                        { type: "text", text: "Transcribe this voice note:" }
                      ] },
                    ],
                    max_tokens: 500,
                  }),
                });

                if (transcribeResp.ok) {
                  const transcribeData = await transcribeResp.json();
                  const transcribedText = transcribeData.choices?.[0]?.message?.content?.trim();
                  if (transcribedText && transcribedText !== "[Audio inaudible]") {
                    audioTranscription = transcribedText;
                    content = `🎤 Nota de voz transcrita: ${transcribedText}`;
                    console.log("[WA-Webhook] Audio transcribed:", transcribedText.substring(0, 100));
                  } else {
                    console.log("[WA-Webhook] Audio inaudible or empty transcription");
                  }
                  // Log voice transcription usage
                  try {
                    const tUsage = transcribeData.usage;
                    const tIn = tUsage?.prompt_tokens || 0;
                    const tOut = tUsage?.completion_tokens || 0;
                    const tCost = (tIn * 0.15 + tOut * 0.60) / 1_000_000;
                    await supabase.from("ai_token_usage").insert({
                      clinic_id: clinicId, user_id: null,
                      generator_type: "voice_transcription", model: "google/gemini-2.5-flash",
                      tokens_input: tIn, tokens_output: tOut, cost_usd: tCost,
                      action_label: "Transcripción de voz WhatsApp",
                    });
                  } catch (logErr) { console.error("[WA-Webhook] Usage log error:", logErr); }
                } else {
                  const errBody = await transcribeResp.text();
                  console.error("[WA-Webhook] Transcription API error:", transcribeResp.status, errBody);
                }
              } else {
                console.warn("[WA-Webhook] LOVABLE_API_KEY not set — skipping transcription");
              }
            } catch (transcribeErr) {
              console.error("[WA-Webhook] Transcription error:", transcribeErr);
            }
          }

          // Insert into whatsapp_messages
          await supabase.from("whatsapp_messages").upsert({
            conversation_id: conversation.id,
            clinic_id: clinicId,
            connection_id: connectionId,
            phone_number_id: phoneNumberId,
            direction: "inbound",
            from_number: contactPhone,
            to_number: displayPhoneNumber || phoneNumberId,
            message_type: messageType,
            content: { body: content },
            text_content: content,
            wa_message_id: msg.id,
            media_url: downloadedMediaUrl || mediaUrl,
            media_mime_type: mediaMimeType,
            media_caption: mediaCaption,
            status: "received",
            raw_payload: msg,
          }, { onConflict: "wa_message_id" });

          // Update conversation metadata
          await supabase.from("whatsapp_conversations").update({
            last_message_preview: content.substring(0, 100),
            unread_count: (conversation.unread_count || 0) + 1,
            last_message_at: new Date().toISOString(),
          }).eq("id", conversation.id);

          const syncResult = await syncToUnifiedMessaging(supabase, clinicId, contactPhone, contactName, content, messageType, msg.id, downloadedMediaUrl);
          const unifiedConvId = syncResult?.conversationId || null;
          const isNewConversation = syncResult?.isNew || false;

          // === PIPELINE: Handle inbound message transitions ===
          if (unifiedConvId) {
            await handleIncomingMessagePipeline(supabase, unifiedConvId, clinicId);
          }

          console.log("[WA-Webhook] Message processed:", { contactPhone, conversationId: conversation.id, isNewConversation });

          // --- AUTO-RESPUESTA DEL AGENTE IA ---
          if ((messageType === "text" || audioTranscription) && content) {
            try {
              const { data: agentConfig } = await supabase
                .from("ai_agent_config")
                .select("enabled")
                .eq("clinic_id", clinicId)
                .eq("enabled", true)
                .maybeSingle();

              const { data: channelConfig } = await supabase
                .from("ai_agent_channel_prompts")
                .select("enabled, welcome_message, welcome_message_enabled")
                .eq("clinic_id", clinicId)
                .eq("channel", "whatsapp")
                .eq("enabled", true)
                .maybeSingle();

              if (agentConfig && channelConfig && unifiedConvId) {
                const { data: unifiedConv } = await supabase
                  .from("conversations")
                  .select("id, chatbot_active")
                  .eq("id", unifiedConvId)
                  .maybeSingle();

                if (unifiedConv && unifiedConv.chatbot_active !== false) {
                  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

                  // --- WELCOME MESSAGE: Send first if new conversation ---
                  let sentWelcome = false;
                  if (isNewConversation && channelConfig.welcome_message_enabled && channelConfig.welcome_message) {
                    try {
                      console.log("[WA-Webhook] Sending welcome message for new conversation");
                      const welcomeResp = await fetch(
                        `${supabaseUrl}/functions/v1/whatsapp-send`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${serviceKey}`,
                            "apikey": serviceKey,
                          },
                          body: JSON.stringify({
                            clinic_id: clinicId,
                            to_number: contactPhone,
                            message_type: "text",
                            content: channelConfig.welcome_message,
                            conversation_id: unifiedConv.id,
                          }),
                        }
                      );
                      const welcomeResult = await welcomeResp.json().catch(() => null);
                      sentWelcome = !welcomeResult?.error;
                      console.log("[WA-Webhook] Welcome message:", sentWelcome ? "sent OK" : "failed");
                    } catch (welcomeErr) {
                      console.error("[WA-Webhook] Welcome message error:", welcomeErr);
                    }
                  }

                  // --- CONTEXTUAL AI REPLY: Always generate a response to the user's question ---
                  const agentResponse = await fetch(
                    `${supabaseUrl}/functions/v1/ai-agent-reply`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                        "apikey": serviceKey,
                      },
                      body: JSON.stringify({
                        clinic_id: clinicId,
                        channel: "whatsapp",
                        conversation_id: unifiedConv.id,
                        triggered_by: "auto",
                        skip_already_replied: sentWelcome,
                      }),
                    }
                  );

                  const agentResult = await agentResponse.json().catch(() => null);
                  console.log("[WA-Webhook] AI Agent response:", agentResult?.reply ? "OK" : agentResult?.reason || "no reply");
                }
              }
            } catch (agentError) {
              console.log("[WA-Webhook] AI Agent skipped:", (agentError as Error).message);
            }
          }
        }
      }

      return respondOk("processed");
    } catch (err) {
      console.error("[WA-Webhook] Error:", err);
      return respondOk("error: " + String(err));
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

function respondOk(note: string) {
  return new Response(JSON.stringify({ status: "ok", note }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function syncToUnifiedMessaging(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  contactPhone: string,
  contactName: string,
  content: string,
  messageType: string,
  waMessageId: string,
  mediaUrl?: string | null
): Promise<{ conversationId: string; isNew: boolean } | null> {
  try {
    let contactId: string | null = null;
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("id, updated_at")
      .eq("clinic_id", clinicId)
      .or(`phone.eq.${contactPhone},phone.eq.+${contactPhone}`)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingContacts?.[0]) {
      contactId = existingContacts[0].id;
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({ clinic_id: clinicId, name: contactName, phone: contactPhone, source: "whatsapp", funnel_stage: "nuevos" })
        .select("id")
        .single();
      contactId = newContact?.id || null;
    }

    if (!contactId) return null;

    const { data: existingConversations } = await supabase
      .from("conversations")
      .select("id, unread_count, chatbot_active, escalado_reason")
      .eq("clinic_id", clinicId)
      .eq("contact_id", contactId)
      .eq("channel", "whatsapp")
      .order("updated_at", { ascending: false })
      .limit(1);

    const existingConv = existingConversations?.[0] || null;
    let conversationId = existingConv?.id;
    let isNew = false;
    const nowIso = new Date().toISOString();

    if (!conversationId) {
      isNew = true;
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          clinic_id: clinicId, contact_id: contactId, channel: "whatsapp",
          status: "open", last_message_at: nowIso,
          last_message_preview: content.substring(0, 100),
          unread_count: 1, chatbot_active: true, visitor_contact: contactPhone,
          last_inbound_at: nowIso,
          last_client_message_at: nowIso,
          follow_up_count: 0,
          pipeline_tab: "nuevos",
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    } else {
      const shouldRecoverAutoEscalatedChatbot =
        existingConv.chatbot_active === false &&
        existingConv.escalado_reason === "El flujo de agendamiento no pudo completarse después de múltiples intentos.";

      const updatePayload: Record<string, unknown> = {
        last_message_at: nowIso,
        last_message_preview: content.substring(0, 100),
        unread_count: (existingConv.unread_count || 0) + 1,
        status: "open",
        last_inbound_at: nowIso,
        last_client_message_at: nowIso,
        whatsapp_window_blocked: false,
        whatsapp_window_blocked_at: null,
        whatsapp_window_blocked_reason: null,
        follow_up_count: 0,
      };

      if (shouldRecoverAutoEscalatedChatbot) {
        Object.assign(updatePayload, {
          chatbot_active: true,
          escalado_at: null,
          escalado_reason: null,
          appointment_flow_active: false,
          appointment_flow_step: null,
          appointment_flow_data: {},
        });
      }

      await supabase.from("conversations").update(updatePayload).eq("id", conversationId);
    }

    if (conversationId) {
      // Deduplicate: check if this whatsapp_message_id already exists
      const { data: existingMsg } = await supabase
        .from("messages")
        .select("id")
        .eq("whatsapp_message_id", waMessageId)
        .maybeSingle();

      if (!existingMsg) {
        await supabase.from("messages").insert({
          conversation_id: conversationId, clinic_id: clinicId,
          direction: "inbound", content, message_type: messageType,
          whatsapp_message_id: waMessageId, status: "received",
          media_url: mediaUrl || null,
        });
      }
    }

    return conversationId ? { conversationId, isNew } : null;
  } catch (err) {
    console.error("[WA-Webhook] Sync to unified error:", err);
    return null;
  }
}

async function handleIncomingMessagePipeline(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  clinicId: string,
) {
  // === MANUAL FUNNEL MODE ===
  // No automatic pipeline movements. The operator manually assigns stages.
  // This function only resets window/timer flags on inbound messages.
  try {
    await supabase.from("conversations").update({
      whatsapp_window_blocked: false,
      whatsapp_window_blocked_at: null,
      whatsapp_window_blocked_reason: null,
    }).eq("id", conversationId);
    console.log(`[PIPELINE] Manual mode — no auto-move for conv ${conversationId}`);
  } catch (err) {
    console.error("[PIPELINE] handleIncomingMessagePipeline error:", err);
  }
}
