import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map width/height to closest Gemini-supported aspect ratio
function getClosestAspectRatio(w?: number, h?: number): string | null {
  if (!w || !h) return null;
  const ratio = w / h;
  const supported = [
    { r: 1,        label: "1:1" },
    { r: 3 / 4,    label: "3:4" },
    { r: 4 / 3,    label: "4:3" },
    { r: 9 / 16,   label: "9:16" },
    { r: 16 / 9,   label: "16:9" },
  ];
  let closest = supported[0];
  let minDiff = Math.abs(ratio - closest.r);
  for (const s of supported) {
    const diff = Math.abs(ratio - s.r);
    if (diff < minDiff) { closest = s; minDiff = diff; }
  }
  return closest.label;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, tone, platform, type, width, height } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // --- COPY GENERATION ---
    if (type === "copy") {
      const systemPrompt = `Eres un experto en marketing digital y copywriting para redes sociales. Genera contenido profesional, atractivo y optimizado para la plataforma ${platform}. 
Tono: ${tone}.
Reglas:
- Usa emojis relevantes pero sin exceso
- Incluye un call-to-action claro
- Optimiza la longitud para ${platform} (Instagram: 2200 chars max, Facebook: más largo OK, TikTok: corto y directo)
- Si aplica, sugiere hashtags relevantes al final
- Escribe en español
- Responde SOLO con el texto de la publicación, sin explicaciones adicionales`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Límite excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- IMAGE GENERATION ---
    if (type === "image") {
      const sizeInstruction = width && height
        ? ` The image MUST be designed for exactly ${width}x${height} pixels. Compose and layout all elements for this exact aspect ratio and dimensions.`
        : "";
      const imagePrompt = `${prompt}${sizeInstruction}`;
      const aspectRatio = getClosestAspectRatio(width, height);

      console.log("Image generation - requested:", width, "x", height, "-> aspectRatio:", aspectRatio);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
          ...(aspectRatio ? { image_generation_config: { aspectRatio } } : {}),
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Límite excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = data.choices?.[0]?.message?.content || "";

      if (!imageData) {
        return new Response(JSON.stringify({ content: textContent || "No se pudo generar la imagen", imageUrl: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upload base64 image to storage
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const base64Content = imageData.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
      
      const fileName = `ai-generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("content-media")
        .upload(fileName, imageBytes, { contentType: "image/png" });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(JSON.stringify({ content: textContent, imageUrl: imageData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData } = supabaseAdmin.storage.from("content-media").getPublicUrl(fileName);

      return new Response(JSON.stringify({ content: textContent, imageUrl: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Tipo no soportado" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
