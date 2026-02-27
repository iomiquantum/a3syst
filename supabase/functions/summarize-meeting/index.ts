import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { meeting_id, clinic_id, transcript_text, summary_types } = await req.json();

    if (!meeting_id || !clinic_id || !transcript_text) {
      throw new Error("meeting_id, clinic_id y transcript_text son requeridos");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build the summary type instructions
    const types = summary_types || ["executive", "action_items", "decisions", "key_topics"];
    const typeDescriptions: Record<string, string> = {
      executive: "Un resumen ejecutivo conciso de toda la reunión (máximo 300 palabras)",
      action_items: "Lista de tareas/acciones concretas mencionadas, con la persona responsable si se menciona. Cada item debe tener: task (descripción de la tarea), assignee (persona asignada o null), priority (high/medium/low basado en urgencia mencionada)",
      decisions: "Lista de decisiones tomadas durante la reunión",
      key_topics: "Lista de temas principales discutidos (máximo 8 temas, cada uno en 2-4 palabras)",
      sentiment: "Análisis del sentimiento general de la reunión: positivo, neutral, negativo, o mixto",
    };

    const requestedDescriptions = types.map((t: string) => `- ${t}: ${typeDescriptions[t] || t}`).join("\n");

    const systemPrompt = `Eres un asistente experto en análisis de reuniones de trabajo. Tu rol es analizar transcripciones y generar resúmenes estructurados de alta calidad en español.

INSTRUCCIONES:
1. Analiza la transcripción proporcionada
2. Genera los siguientes tipos de análisis:
${requestedDescriptions}

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "executive_summary": "string con el resumen ejecutivo",
  "action_items": [
    {"task": "descripción de la tarea", "assignee": "nombre o null", "priority": "high|medium|low"}
  ],
  "decisions": ["decisión 1", "decisión 2"],
  "key_topics": ["tema 1", "tema 2"],
  "sentiment": "positivo|neutral|negativo|mixto"
}

REGLAS:
- Responde SOLO con el JSON, sin texto adicional ni markdown
- Si un tipo de análisis no fue solicitado, incluye un array vacío o null
- Los action_items deben ser lo más específicos y accionables posible
- Identifica quién debe hacer cada tarea basándote en el contexto de la conversación
- Usa español para todo el contenido`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcripción de la reunión:\n\n${transcript_text}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Límite de IA excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const usage = data.usage || {};

    // Parse the JSON response - handle potential markdown wrapping
    let parsed: any;
    try {
      const cleanJson = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("La IA no devolvió un formato válido. Intenta de nuevo.");
    }

    // Upsert the summary
    const { error: summaryError } = await supabaseAdmin
      .from("meeting_summaries")
      .upsert({
        meeting_id,
        clinic_id,
        executive_summary: parsed.executive_summary || null,
        action_items: parsed.action_items || [],
        decisions: parsed.decisions || [],
        key_topics: parsed.key_topics || [],
        sentiment: parsed.sentiment || "neutral",
      }, { onConflict: "meeting_id" });

    if (summaryError) {
      console.error("Error saving summary:", summaryError);
      throw new Error("Error al guardar el resumen: " + summaryError.message);
    }

    // Update meeting status to completed
    await supabaseAdmin
      .from("meetings")
      .update({ status: "completed" })
      .eq("id", meeting_id);

    // Log token usage
    const costUsd = estimateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0);
    await supabaseAdmin.from("ai_token_usage").insert({
      clinic_id,
      generator_type: "meeting_summary",
      model: data.model || "google/gemini-2.5-flash",
      tokens_input: usage.prompt_tokens || 0,
      tokens_output: usage.completion_tokens || 0,
      cost_usd: costUsd,
      action_label: "Resumen de reunión",
    });

    return new Response(JSON.stringify({
      summary: parsed,
      usage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-meeting error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function estimateCost(input: number, output: number): number {
  // gemini-2.5-flash pricing per 1M tokens
  return (input * 0.15 + output * 0.60) / 1_000_000;
}
