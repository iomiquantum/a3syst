import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, clinic_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Fetch recent messages for context (last 20)
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("direction, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build system prompt from agent config
    const services = (agentConfig.services || []) as { name: string; price: string; description: string }[];
    const langLabel = agentConfig.language === "es" ? "Español" : agentConfig.language === "en" ? "English" : "Português";

    const systemPrompt = `Eres "${agentConfig.agent_name}", un asistente virtual de una clínica dental.
Idioma: ${langLabel}
Tono: ${agentConfig.tone}

OBJETIVO:
${agentConfig.objective}

SERVICIOS DISPONIBLES:
${services.map(s => `• ${s.name} — $${s.price} — ${s.description}`).join("\n") || "(sin servicios configurados)"}

INSTRUCCIONES ESPECIALES:
${agentConfig.special_instructions}

IMPORTANTE:
- Responde de forma breve y directa (máximo 2-3 oraciones).
- Usa emojis con moderación.
- Si no sabes algo, sugiere contactar a la clínica directamente.
- Nunca inventes información sobre servicios o precios que no estén listados arriba.`;

    // Build messages array for the AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(recentMessages || []).map(m => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    // Call Lovable AI Gateway (non-streaming for simplicity)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

    // Save the AI reply as an outbound message
    const { data: savedMsg, error: msgError } = await supabase.from("messages").insert({
      conversation_id,
      clinic_id,
      direction: "outbound",
      content: reply,
      message_type: "text",
      status: "sent",
    }).select().single();

    if (msgError) throw msgError;

    // Update conversation preview
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: reply.substring(0, 100),
    }).eq("id", conversation_id);

    return new Response(JSON.stringify({ reply, message: savedMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-agent-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
