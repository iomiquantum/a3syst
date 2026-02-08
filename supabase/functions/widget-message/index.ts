import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinic_id, name, email, phone, message, conversation_id: existingConvId } = await req.json();

    if (!clinic_id || !message) {
      return new Response(JSON.stringify({ error: "clinic_id and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let conversation: any = null;
    let contact: any = null;

    // If we already have a conversation_id, use it directly (reply flow)
    if (existingConvId) {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", existingConvId)
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", existingConv.contact_id)
          .maybeSingle();
        contact = existingContact;
      }
    }

    // If no existing conversation found, find/create contact and conversation (initial flow)
    if (!conversation) {
      if (!name) {
        return new Response(JSON.stringify({ error: "name is required for initial message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find or create contact by email or phone
      if (email) {
        const { data } = await supabase
          .from("contacts")
          .select("*")
          .eq("clinic_id", clinic_id)
          .eq("email", email)
          .maybeSingle();
        contact = data;
      }
      if (!contact && phone) {
        const { data } = await supabase
          .from("contacts")
          .select("*")
          .eq("clinic_id", clinic_id)
          .eq("phone", phone)
          .maybeSingle();
        contact = data;
      }

      if (!contact) {
        const { data, error } = await supabase.from("contacts").insert({
          clinic_id,
          name,
          email: email || "",
          phone: phone || "",
          source: "web_widget",
          funnel_stage: "nuevos",
        }).select().single();
        if (error) throw error;
        contact = data;
      }

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("contact_id", contact.id)
        .eq("channel", "web_widget")
        .eq("archived", false)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data, error } = await supabase.from("conversations").insert({
          clinic_id,
          contact_id: contact.id,
          channel: "web_widget",
          status: "open",
          chatbot_active: true,
        }).select().single();
        if (error) throw error;
        conversation = data;
      }
    }

    // Insert message
    const { data: msg, error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      clinic_id,
      direction: "inbound",
      content: message,
      message_type: "text",
      status: "delivered",
    }).select().single();
    if (msgError) throw msgError;

    // Update conversation
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: message.substring(0, 100),
      unread_count: (conversation.unread_count || 0) + 1,
    }).eq("id", conversation.id);

    return new Response(JSON.stringify({
      success: true,
      conversation_id: conversation.id,
      contact_id: contact?.id,
      message_id: msg.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
