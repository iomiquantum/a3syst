import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { styleId, imageUrls } = await req.json();

    if (!imageUrls || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // Build multi-modal message with all images
    const content: any[] = [
      {
        type: "text",
        text: `Eres un director de arte y experto en branding. Analiza las siguientes ${imageUrls.length} imágenes de referencia de una marca/negocio y extrae:

1. PALETA DE COLORES: Identifica los 5-8 colores dominantes usados en las imágenes. Para cada color devuelve su código HEX y un nombre descriptivo corto en español (ej: "Azul marino", "Rosa pastel", "Dorado").

2. DESCRIPCIÓN DEL ESTILO VISUAL: Describe en 2-3 oraciones el estilo visual general: tipografía (sans-serif moderna, serif elegante, etc.), composición (minimalista, cargada, simétrica), tono visual (clínico, cálido, lujoso, juvenil), uso de elementos gráficos, y cualquier patrón recurrente.

RESPONDE EXCLUSIVAMENTE en JSON con este formato exacto (sin markdown, sin backticks):
{
  "palette": [
    {"hex": "#2C3E50", "name": "Azul oscuro"},
    {"hex": "#E74C3C", "name": "Rojo coral"}
  ],
  "description": "Estilo minimalista con tipografía sans-serif moderna..."
}`
      }
    ];

    // Add each image as a multi-modal part
    for (const url of imageUrls.slice(0, 10)) {
      content.push({
        type: "image_url",
        image_url: { url }
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle possible markdown wrapping)
    let parsed: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse AI response:", rawText);
      throw new Error("Could not parse AI analysis");
    }

    return new Response(JSON.stringify({
      palette: parsed.palette || [],
      description: parsed.description || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
