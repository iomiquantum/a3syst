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
    const { clinic_id, to_number, message_type, content } = await req.json();

    if (!clinic_id || !to_number || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: clinic_id, to_number, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup active connection for this clinic
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("phone_number_id, access_token, phone_number")
      .eq("clinic_id", clinic_id)
      .eq("status", "active")
      .maybeSingle();

    if (connError || !connection) {
      console.error("Connection lookup error:", connError);
      return new Response(
        JSON.stringify({ error: "No active WhatsApp connection found for this clinic" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone_number_id, phone_number } = connection;

    // Prioritize env var token (always fresh), fallback to DB token
    const envToken = Deno.env.get("META_ACCESS_TOKEN");
    const dbToken = connection.access_token;
    const accessToken = envToken || dbToken;
    const tokenSource = envToken ? "env" : "db";

    console.log("Token source:", tokenSource, "| phone_number_id:", phone_number_id);

    if (!accessToken) {
      console.error("No access token available from env or database");
      return new Response(
        JSON.stringify({ error: "Missing access token — set META_ACCESS_TOKEN secret or update whatsapp_connections" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize phone number: remove +, spaces, dashes — keep only digits
    const cleanNumber = to_number.replace(/[^0-9]/g, "");
    console.log("Sending to:", cleanNumber, "original:", to_number);

    // Build the message payload for Meta WhatsApp Cloud API
    const type = message_type || "text";
    const messagePayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanNumber,
      type,
    };

    if (type === "text") {
      messagePayload.text = typeof content === "string" ? { body: content } : content;
    } else if (type === "image") {
      messagePayload.image = content;
    } else if (type === "document") {
      messagePayload.document = content;
    } else if (type === "template") {
      messagePayload.template = content;
    } else if (type === "interactive") {
      messagePayload.interactive = content;
    } else {
      messagePayload[type] = content;
    }

    // Send via Meta Graph API
    const graphUrl = `https://graph.facebook.com/v22.0/${phone_number_id}/messages`;
    console.log("Meta API URL:", graphUrl);
    console.log("Payload:", JSON.stringify(messagePayload));

    const metaResponse = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const metaResult = await metaResponse.json();

    // Log FULL response for debugging
    console.log("Meta API Response:", JSON.stringify({
      status: metaResponse.status,
      ok: metaResponse.ok,
      body: metaResult,
      tokenSource,
    }));

    if (!metaResponse.ok) {
      console.error("Meta API error:", JSON.stringify(metaResult));
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: metaResult, tokenSource }),
        { status: metaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = metaResult?.messages?.[0]?.id;

    // Log outbound message in whatsapp_messages
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        clinic_id,
        phone_number_id,
        direction: "outbound",
        from_number: phone_number || phone_number_id,
        to_number: cleanNumber,
        message_type: type,
        content: typeof content === "string" ? { body: content } : content,
        wa_message_id: waMessageId,
        status: "sent",
      });

    if (insertError) {
      console.error("Error logging outbound message:", insertError);
    }

    // Also insert into unified messages table for the Mensajes panel
    const messageText = typeof content === "string" ? content : (content?.body || JSON.stringify(content));

    // Find conversation for this contact
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("channel", "whatsapp")
      .eq("visitor_contact", cleanNumber)
      .maybeSingle();

    if (conv) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        clinic_id,
        direction: "outbound",
        content: messageText,
        message_type: type,
        whatsapp_message_id: waMessageId,
        status: "sent",
      });

      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageText.substring(0, 100),
      }).eq("id", conv.id);
    }

    return new Response(
      JSON.stringify({ success: true, wa_message_id: waMessageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("whatsapp-send error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
