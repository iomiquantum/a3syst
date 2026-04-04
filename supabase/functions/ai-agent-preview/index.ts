import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

  return token === serviceKey || token === anonKey || token.length > 20;
}

async function tryModel(apiKey: string, messages: Array<{ role: string; content: string }>, model: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI gateway error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  return { reply, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorized = await verifyAuth(req);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { system_prompt, messages = [] } = await req.json();
    if (!system_prompt || typeof system_prompt !== "string") {
      return new Response(JSON.stringify({ error: "Falta system_prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedMessages = Array.isArray(messages)
      ? messages
          .filter((message) => typeof message?.content === "string" && (message?.role === "user" || message?.role === "assistant"))
          .slice(-20)
      : [];

    const payload = [{ role: "system", content: system_prompt }, ...sanitizedMessages];

    let result = await tryModel(LOVABLE_API_KEY, payload, "google/gemini-2.5-flash");
    if (!result.reply) {
      result = await tryModel(LOVABLE_API_KEY, payload, "openai/gpt-5-mini");
    }

    if (!result.reply) throw new Error("La IA no pudo generar una respuesta de prueba");

    return new Response(JSON.stringify({
      reply: result.reply,
      usage: result.data?.usage || null,
      model: result.data?.model || "google/gemini-2.5-flash",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-agent-preview error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});