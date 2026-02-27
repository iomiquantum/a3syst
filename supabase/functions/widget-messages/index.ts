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
    const { conversation_id, clinic_id } = await req.json();

    if (!conversation_id || !clinic_id) {
      return new Response(JSON.stringify({ error: "conversation_id and clinic_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the conversation belongs to the given clinic and is a web_widget conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, clinic_id, channel")
      .eq("id", conversation_id)
      .eq("clinic_id", clinic_id)
      .eq("channel", "web_widget")
      .maybeSingle();

    if (convError) throw convError;

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id, content, direction, created_at, message_type")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    return new Response(JSON.stringify({ messages: data || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
