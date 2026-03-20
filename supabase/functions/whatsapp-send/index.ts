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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      clinic_id, to, to_number, message, content,
      type = "text", message_type,
      connection_id, conversation_id,
      template_name, template_language, template_components,
      sent_by, origin,
    } = body;

    const targetNumber = (to || to_number || "").replace(/[^0-9]/g, "");
    const msgType = type || message_type || "text";
    const msgContent = message || content;
    const effectiveClinicId = clinic_id;

    if (!effectiveClinicId || !targetNumber) {
      return jsonResponse({ error: "Missing clinic_id and to/to_number" }, 400);
    }

    // Find active connection
    let connQuery = supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("clinic_id", effectiveClinicId)
      .eq("status", "active");
    if (connection_id) connQuery = connQuery.eq("id", connection_id);
    const { data: connection } = await connQuery.limit(1).maybeSingle();

    if (!connection) {
      return jsonResponse({ error: "No active WhatsApp connection found" }, 404);
    }

    // Resolve access token with fallback
    const dbToken = (connection.access_token || "").trim();
    const envToken = (Deno.env.get("META_ACCESS_TOKEN") || "").trim();
    const accessToken = dbToken || envToken;

    if (!accessToken) {
      return jsonResponse({ error: "Missing access token" }, 400);
    }

    // Build Meta payload
    const metaPayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: targetNumber,
    };

    if (msgType === "template") {
      metaPayload.type = "template";
      metaPayload.template = {
        name: template_name,
        language: { code: template_language || "es" },
      };
      if (template_components) metaPayload.template = { ...metaPayload.template as object, components: template_components };
    } else if (msgType === "text") {
      metaPayload.type = "text";
      metaPayload.text = typeof msgContent === "string" ? { body: msgContent } : msgContent;
    } else {
      metaPayload.type = msgType;
      metaPayload[msgType] = msgContent;
    }

    console.log("[WA-Send] Sending to:", targetNumber, "type:", msgType);

    const graphUrl = `https://graph.facebook.com/v22.0/${connection.phone_number_id}/messages`;
    const metaResponse = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const metaResult = await metaResponse.json();
    console.log("[WA-Send] Meta response:", metaResponse.status, JSON.stringify(metaResult));

    if (!metaResponse.ok) {
      // If token is expired, try env fallback
      if (accessToken === dbToken && envToken && envToken !== dbToken && metaResult?.error?.code === 190) {
        console.warn("[WA-Send] DB token expired, trying env fallback");
        const retryResponse = await fetch(graphUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${envToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(metaPayload),
        });
        const retryResult = await retryResponse.json();
        if (retryResponse.ok) {
          const waMessageId = retryResult?.messages?.[0]?.id;
          await logOutboundMessage(supabase, connection, effectiveClinicId, targetNumber, msgType, msgContent, waMessageId, sent_by, conversation_id, template_name, origin);
          return jsonResponse({ success: true, wa_message_id: waMessageId });
        }
        return jsonResponse({ error: "Failed to send", details: retryResult }, retryResponse.status);
      }

      if (metaResult?.error?.code === 190) {
        await supabase.from("whatsapp_connections").update({ status: "error", last_error: "Token expirado o inválido" }).eq("id", connection.id);
      }
      return jsonResponse({ error: "Failed to send", details: metaResult }, metaResponse.status);
    }

    const waMessageId = metaResult?.messages?.[0]?.id;
    await logOutboundMessage(supabase, connection, effectiveClinicId, targetNumber, msgType, msgContent, waMessageId, sent_by, conversation_id, template_name, origin);

    return jsonResponse({ success: true, wa_message_id: waMessageId });
  } catch (err) {
    console.error("[WA-Send] Error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logOutboundMessage(
  supabase: ReturnType<typeof createClient>,
  connection: Record<string, unknown>,
  clinicId: string,
  toNumber: string,
  msgType: string,
  content: unknown,
  waMessageId: string | undefined,
  sentBy: string | undefined,
  conversationId: string | undefined,
  templateName: string | undefined,
  origin: string | undefined,
) {
  const textContent = msgType === "template"
    ? `📋 Template: ${templateName}`
    : typeof content === "string" ? content : (content as Record<string, string>)?.body || JSON.stringify(content);

  // Log in whatsapp_messages (legacy)
  await supabase.from("whatsapp_messages").insert({
    clinic_id: clinicId,
    phone_number_id: connection.phone_number_id,
    connection_id: connection.id,
    direction: "outbound",
    from_number: connection.phone_number || connection.display_phone_number || connection.phone_number_id,
    to_number: toNumber,
    message_type: msgType,
    content: typeof content === "string" ? { body: content } : content || {},
    text_content: textContent,
    wa_message_id: waMessageId,
    status: "sent",
    sent_by: sentBy || null,
    conversation_id: conversationId || null,
  });

  // Upsert whatsapp_conversation
  const { data: waConv } = await supabase
    .from("whatsapp_conversations")
    .upsert({
      connection_id: connection.id as string,
      clinic_id: clinicId,
      contact_phone: toNumber,
      status: "open",
      last_message_at: new Date().toISOString(),
      last_message_preview: textContent.substring(0, 100),
    }, { onConflict: "connection_id,contact_phone" })
    .select("id")
    .maybeSingle();

  // Also sync to unified messages
  let convId = conversationId || null;
  if (!convId) {
    // Try matching with and without + prefix
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("channel", "whatsapp")
      .or(`visitor_contact.eq.${toNumber},visitor_contact.eq.+${toNumber}`)
      .maybeSingle();
    convId = conv?.id || null;
  }

  if (convId) {
    await supabase.from("messages").insert({
      conversation_id: convId,
      clinic_id: clinicId,
      direction: "outbound",
      content: textContent,
      message_type: msgType,
      whatsapp_message_id: waMessageId,
      status: "sent",
      sent_by: sentBy || null,
      origin: origin || (sentBy ? "human" : "ai_agent"),
    });
    const conversationUpdate: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      last_message_preview: textContent.substring(0, 100),
    };

    if (msgType === "template") {
      conversationUpdate.whatsapp_window_blocked = false;
      conversationUpdate.whatsapp_window_blocked_at = null;
      conversationUpdate.whatsapp_window_blocked_reason = null;
    }

    await supabase.from("conversations").update(conversationUpdate).eq("id", convId);

    // If template was sent manually, resolve any pending queue items and resume seguimiento
    if (msgType === "template" && convId) {
      await supabase.from("pipeline_message_queue").update({
        status: "resolved_manually",
        resolved_manually_at: new Date().toISOString(),
        resolved_manually_by: sentBy || "agent",
      }).eq("conversation_id", convId).eq("status", "pending_manual");
    }
  }
}
