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

  // --- GET: Webhook verification (per-connection token) ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      // Look up connection by its unique webhook_verify_token
      const { data: connection } = await supabase
        .from("whatsapp_connections")
        .select("id, clinic_id, business_name")
        .eq("webhook_verify_token", token)
        .maybeSingle();

      if (connection) {
        await supabase.from("whatsapp_connections")
          .update({ webhook_configured: true, status: "active" })
          .eq("id", connection.id);
        console.log("[WA-Webhook] Verified for:", connection.business_name);
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }

      // Fallback: check global WHATSAPP_VERIFY_TOKEN for backward compatibility
      const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
      if (token === expectedToken) {
        console.log("[WA-Webhook] Verified with global token");
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
    }

    console.warn("[WA-Webhook] Verification failed", { mode, token });
    return new Response("Forbidden", { status: 403 });
  }

  // --- POST: Receive inbound messages & status updates ---
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[WA-Webhook] POST:", JSON.stringify(body).substring(0, 500));

      const entry = body?.entry?.[0];
      if (!entry) return respondOk("no entry");

      const changes = entry.changes?.[0];
      const value = changes?.value;
      if (!value) return respondOk("no value");

      const phoneNumberId = value.metadata?.phone_number_id;
      const displayPhoneNumber = value.metadata?.display_phone_number;
      if (!phoneNumberId) return respondOk("no phone_number_id");

      // Look up connection by phone_number_id
      const { data: connection, error: connError } = await supabase
        .from("whatsapp_connections")
        .select("id, clinic_id, access_token, business_name")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (connError) console.error("[WA-Webhook] Connection lookup error:", connError);
      if (!connection) {
        console.error("[WA-Webhook] No connection for phone_number_id:", phoneNumberId);
        return respondOk("no connection");
      }

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
          // Update in whatsapp_messages
          await supabase.from("whatsapp_messages").update(updateData).eq("wa_message_id", s.id);
          // Also update unified messages table
          await supabase.from("messages").update({ status: s.status }).eq("whatsapp_message_id", s.id);
        }
      }

      // --- Handle inbound messages ---
      if (value.messages?.length > 0) {
        for (const msg of value.messages) {
          const contactInfo = value.contacts?.[0];
          const contactPhone = msg.from;
          const contactName = contactInfo?.profile?.name || contactPhone;

          // Upsert conversation
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
            case "video": content = msg.video?.caption || "[Video]"; mediaUrl = msg.video?.id; mediaMimeType = msg.video?.mime_type; break;
            case "document": content = msg.document?.filename || "[Documento]"; mediaUrl = msg.document?.id; mediaMimeType = msg.document?.mime_type; break;
            case "location": content = `📍 ${msg.location?.latitude}, ${msg.location?.longitude}`; break;
            case "sticker": content = "[Sticker]"; mediaUrl = msg.sticker?.id; break;
            case "reaction": content = msg.reaction?.emoji || "👍"; break;
            case "button": content = msg.button?.text || "[Botón]"; break;
            case "interactive": content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Interactivo]"; break;
            default: content = `[${messageType}]`;
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
            media_url: mediaUrl,
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

          await syncToUnifiedMessaging(supabase, clinicId, contactPhone, contactName, content, messageType, msg.id);

          console.log("[WA-Webhook] Message processed:", { contactPhone, conversationId: conversation.id });

          // --- AUTO-RESPUESTA DEL AGENTE IA ---
          if (messageType === "text" && content) {
            try {
              const { data: agentConfig } = await supabase
                .from("ai_agent_config")
                .select("enabled")
                .eq("clinic_id", clinicId)
                .eq("enabled", true)
                .maybeSingle();

              const { data: channelConfig } = await supabase
                .from("ai_agent_channel_prompts")
                .select("enabled")
                .eq("clinic_id", clinicId)
                .eq("channel", "whatsapp")
                .eq("enabled", true)
                .maybeSingle();

              if (agentConfig && channelConfig) {
                // Find unified conversation for ai-agent-reply
                const { data: unifiedConv } = await supabase
                  .from("conversations")
                  .select("id")
                  .eq("clinic_id", clinicId)
                  .eq("channel", "whatsapp")
                  .eq("visitor_contact", contactPhone)
                  .maybeSingle();

                if (unifiedConv) {
                  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
                      }),
                    }
                  );

                  const agentResult = await agentResponse.json().catch(() => null);
                  console.log("[WA-Webhook] AI Agent response:", agentResult?.reply ? "OK" : "no reply");
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
  waMessageId: string
) {
  try {
    // Find or create contact
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("clinic_id", clinicId)
      .or(`phone.eq.${contactPhone},phone.eq.+${contactPhone}`)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({ clinic_id: clinicId, name: contactName, phone: contactPhone, source: "whatsapp", funnel_stage: "nuevos" })
        .select("id")
        .single();
      contactId = newContact?.id || null;
    }

    if (!contactId) return;

    // Find or create unified conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("contact_id", contactId)
      .eq("channel", "whatsapp")
      .maybeSingle();

    let conversationId = existingConv?.id;

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          clinic_id: clinicId, contact_id: contactId, channel: "whatsapp",
          status: "open", last_message_at: new Date().toISOString(),
          last_message_preview: content.substring(0, 100),
          unread_count: 1, chatbot_active: false, visitor_contact: contactPhone,
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    } else {
      const { data: convData } = await supabase.from("conversations").select("unread_count").eq("id", conversationId).single();
      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
        unread_count: (convData?.unread_count || 0) + 1,
        status: "open",
      }).eq("id", conversationId);
    }

    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId, clinic_id: clinicId,
        direction: "inbound", content, message_type: messageType,
        whatsapp_message_id: waMessageId, status: "received",
      });
    }
  } catch (err) {
    console.error("[WA-Webhook] Sync to unified error:", err);
  }
}
