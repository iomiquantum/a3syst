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
      return new Response(
        JSON.stringify({ error: "No active WhatsApp connection found for this clinic" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone_number_id, access_token, phone_number } = connection;

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "Missing access token in WhatsApp connection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize phone number: remove +, spaces, dashes — keep only digits
    const cleanNumber = to_number.replace(/[^0-9]/g, "");
    console.log("Sending to:", cleanNumber, "original:", to_number);

    // Build the message payload for Meta WhatsApp Cloud API
    const type = message_type || "text";
    let messagePayload: Record<string, unknown> = {
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
      // Default: send as-is
      messagePayload[type] = content;
    }

    // Send via Meta Graph API
    const graphUrl = `https://graph.facebook.com/v22.0/${phone_number_id}/messages`;
    const metaResponse = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Meta API error:", metaResult);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: metaResult }),
        { status: metaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = metaResult?.messages?.[0]?.id;

    // Log outbound message
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        clinic_id,
        phone_number_id,
        direction: "outbound",
        from_number: phone_number || phone_number_id,
        to_number,
        message_type: type,
        content: typeof content === "string" ? { body: content } : content,
        wa_message_id: waMessageId,
        status: "sent",
      });

    if (insertError) {
      console.error("Error logging outbound message:", insertError);
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
