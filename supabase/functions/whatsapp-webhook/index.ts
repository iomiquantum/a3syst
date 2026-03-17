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

  // --- GET: Webhook verification ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && token === expectedToken) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    console.warn("Webhook verification failed", { mode, token });
    return new Response("Forbidden", { status: 403 });
  }

  // --- POST: Receive inbound messages ---
  if (req.method === "POST") {
    try {
      const body = await req.json();

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const entry = body?.entry?.[0];
      if (!entry) {
        return new Response(JSON.stringify({ status: "ok", note: "no entry" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const changes = entry.changes?.[0];
      const value = changes?.value;
      if (!value) {
        return new Response(JSON.stringify({ status: "ok", note: "no value" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metadata = value.metadata;
      const phoneNumberId = metadata?.phone_number_id;
      const displayPhoneNumber = metadata?.display_phone_number;
      const messages = value.messages;

      if (!messages || messages.length === 0) {
        // Could be a status update (delivery, read receipt, etc.)
        return new Response(JSON.stringify({ status: "ok", note: "no messages" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Lookup clinic by phone_number_id
      const { data: connection, error: connError } = await supabase
        .from("whatsapp_connections")
        .select("clinic_id")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (connError) {
        console.error("Error looking up connection:", connError);
      }

      const clinicId = connection?.clinic_id;

      // Insert each message
      for (const msg of messages) {
        const { error: insertError } = await supabase
          .from("whatsapp_messages")
          .insert({
            clinic_id: clinicId,
            phone_number_id: phoneNumberId,
            direction: "inbound",
            from_number: msg.from,
            to_number: displayPhoneNumber || phoneNumberId,
            message_type: msg.type || "text",
            content: msg,
            wa_message_id: msg.id,
            status: "received",
          });

        if (insertError) {
          console.error("Error inserting message:", insertError);
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Webhook error:", err);
      // Always return 200 to Meta so they don't retry excessively
      return new Response(JSON.stringify({ status: "ok", error: String(err) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
