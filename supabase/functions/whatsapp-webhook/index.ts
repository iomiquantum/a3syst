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
      console.log("Webhook POST received:", JSON.stringify(body).substring(0, 500));

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
      const incomingMessages = value.messages;
      const statusUpdates = value.statuses;

      // Handle status updates (sent, delivered, read, failed)
      if (statusUpdates && statusUpdates.length > 0) {
        for (const statusUpdate of statusUpdates) {
          const waMessageId = statusUpdate.id;
          const newStatus = statusUpdate.status; // sent, delivered, read, failed
          
          if (waMessageId && newStatus) {
            const mappedStatus = newStatus === "failed" ? "failed" : newStatus;
            const { error: updateError } = await supabase
              .from("messages")
              .update({ status: mappedStatus })
              .eq("whatsapp_message_id", waMessageId);
            
            if (updateError) {
              console.error("Error updating message status:", updateError);
            }

            // Also update whatsapp_messages table
            await supabase
              .from("whatsapp_messages")
              .update({ status: mappedStatus })
              .eq("wa_message_id", waMessageId);
          }
        }

        if (!incomingMessages || incomingMessages.length === 0) {
          return new Response(JSON.stringify({ status: "ok", note: "status update processed" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (!incomingMessages || incomingMessages.length === 0) {
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
      if (!clinicId) {
        console.error("No clinic found for phone_number_id:", phoneNumberId);
        return new Response(JSON.stringify({ status: "ok", note: "no clinic" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert each message
      for (const msg of incomingMessages) {
        const fromNumber = msg.from;
        const messageText = msg.text?.body || msg.caption || `[${msg.type || "message"}]`;

        // 1. Insert into whatsapp_messages (raw storage)
        const { error: insertError } = await supabase
          .from("whatsapp_messages")
          .insert({
            clinic_id: clinicId,
            phone_number_id: phoneNumberId,
            direction: "inbound",
            from_number: fromNumber,
            to_number: displayPhoneNumber || phoneNumberId,
            message_type: msg.type || "text",
            content: msg,
            wa_message_id: msg.id,
            status: "received",
          });

        if (insertError) {
          console.error("Error inserting whatsapp_message:", insertError);
        }

        // 2. Find or create contact
        let contactId: string | null = null;
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("phone", fromNumber)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          // Also try with + prefix
          const { data: existingContact2 } = await supabase
            .from("contacts")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("phone", `+${fromNumber}`)
            .maybeSingle();

          if (existingContact2) {
            contactId = existingContact2.id;
          } else {
            // Get contact name from WhatsApp profile if available
            const contactProfile = value.contacts?.[0];
            const contactName = contactProfile?.profile?.name || fromNumber;

            const { data: newContact, error: contactError } = await supabase
              .from("contacts")
              .insert({
                clinic_id: clinicId,
                name: contactName,
                phone: fromNumber,
                source: "whatsapp",
                funnel_stage: "nuevos",
              })
              .select("id")
              .single();

            if (contactError) {
              console.error("Error creating contact:", contactError);
            } else {
              contactId = newContact.id;
            }
          }
        }

        if (!contactId) {
          console.error("Could not find or create contact for:", fromNumber);
          continue;
        }

        // 3. Find or create conversation
        let conversationId: string | null = null;
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("contact_id", contactId)
          .eq("channel", "whatsapp")
          .maybeSingle();

        if (existingConv) {
          conversationId = existingConv.id;
          // Update conversation metadata
          await supabase
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              last_message_preview: messageText.substring(0, 100),
              unread_count: supabase.rpc ? 1 : 1, // Will increment below
              status: "open",
            })
            .eq("id", conversationId);

          // Increment unread count
          const { data: convData } = await supabase
            .from("conversations")
            .select("unread_count")
            .eq("id", conversationId)
            .single();

          if (convData) {
            await supabase
              .from("conversations")
              .update({ unread_count: (convData.unread_count || 0) + 1 })
              .eq("id", conversationId);
          }
        } else {
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              clinic_id: clinicId,
              contact_id: contactId,
              channel: "whatsapp",
              status: "open",
              last_message_at: new Date().toISOString(),
              last_message_preview: messageText.substring(0, 100),
              unread_count: 1,
              chatbot_active: false,
              visitor_contact: fromNumber,
            })
            .select("id")
            .single();

          if (convError) {
            console.error("Error creating conversation:", convError);
          } else {
            conversationId = newConv.id;
          }
        }

        if (!conversationId) {
          console.error("Could not find or create conversation");
          continue;
        }

        // 4. Insert into messages table (for Mensajes panel)
        const { error: msgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            clinic_id: clinicId,
            direction: "inbound",
            content: messageText,
            message_type: msg.type || "text",
            media_url: msg.image?.link || msg.document?.link || msg.video?.link || msg.audio?.link || null,
            whatsapp_message_id: msg.id,
            status: "received",
          });

        if (msgError) {
          console.error("Error inserting message:", msgError);
        }

        console.log("Message processed:", { fromNumber, conversationId, contactId });
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Webhook error:", err);
      return new Response(JSON.stringify({ status: "ok", error: String(err) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
