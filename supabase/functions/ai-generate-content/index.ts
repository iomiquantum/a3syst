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

// Expert-level platform-specific image generation instructions
function getExpertInstructions(platform?: string, sizeLabel?: string, w?: number, h?: number, aspectRatio?: string | null, orientation?: string): string {
  if (!platform || !w || !h) return "";

  const ratio = w / h;
  const isVertical = ratio < 0.9;
  const isSquare = ratio >= 0.9 && ratio <= 1.1;
  const isHorizontal = ratio > 1.1;
  const isStoryReel = isVertical && h >= 1900;

  let instructions = "";

  // Universal safe-zone rules for Stories/Reels
  if (isStoryReel) {
    instructions += `\n\n📱 STORIES/REELS SAFE ZONE RULES (9:16 format):
- Leave the TOP area (approximately 13% of the image height) completely free of important text or elements (phone status bar, app header area).
- Leave the BOTTOM area (approximately 18% of the image height) completely free (like/comment/share buttons overlay here).
- The SAFE creative area is the middle zone.
- Place your main headline, key visuals, and CTA in this safe middle zone.
- Background imagery and ambient colors CAN extend to edges, but key content must stay in the safe zone.
- Design for MOBILE-FIRST: large readable text, high contrast, bold visuals.
- CRITICAL: Do NOT render any pixel measurements, dimension labels, margin indicators, ruler marks, or technical annotations on the image. The image must be completely clean and production-ready with NO visible safe zone markers or pixel values like "250px" or "340px".`;
  }

  // Platform-specific rules
  if (platform === "Instagram" || platform === "Facebook") {
    if (isVertical && !isStoryReel) {
      instructions += `\n\n📐 META FEED VERTICAL (4:5) BEST PRACTICES:
- This is THE dominant mobile feed format. Design for thumb-stopping impact.
- Use the full vertical space: hero visual in the top 60%, text/CTA in the bottom 40%.
- Ensure text is large enough to read on mobile (minimum apparent 24pt).
- High contrast colors; avoid small details that get lost on phone screens.`;
    }
    if (isSquare) {
      instructions += `\n\n📐 META FEED SQUARE (1:1) BEST PRACTICES:
- Standard format for carousels and catalog ads. Balanced, centered compositions work well.
- Keep the design clean and focused — one hero element, one clear message.
- Ensure brand elements are visible but not overwhelming.`;
    }
    if (isHorizontal) {
      instructions += `\n\n📐 META LANDSCAPE (1.91:1) BEST PRACTICES:
- Used for link ads, search results, and right column placements.
- Place key visual on the LEFT and text/CTA on the RIGHT (reading flow).
- This format competes with text-heavy feeds — make the image eye-catching and simple.
- Avoid clutter; one strong visual + one message.`;
    }
  }

  if (platform === "Facebook" && sizeLabel) {
    if (sizeLabel.includes("Right Column")) {
      instructions += `\n\n📐 FACEBOOK RIGHT COLUMN (1:1, 1200x1200):
- Very small display area on desktop. Use LARGE text and simple graphics.
- Maximum 1-2 words headline, prominent logo, high contrast.`;
    }
    if (sizeLabel.includes("Marketplace")) {
      instructions += `\n\n📐 FACEBOOK MARKETPLACE (1:1, 1080x1080):
- Product-focused. Clean white/neutral background preferred.
- Show the product/service prominently with clear pricing if applicable.`;
    }
  }

  if (platform === "TikTok") {
    instructions += `\n\n📱 TIKTOK DESIGN RULES:
- STRICTLY 9:16 vertical format. Never design for square or landscape — TikTok penalizes with black bars.
- Design for total immersion: edge-to-edge visuals, no borders or frames.
- Bold, Gen-Z aesthetic: bright colors, dynamic compositions, trending visual styles.
- Text should be punchy, short (max 5-7 words), and placed in the center-safe zone.
- The sweet spot for ad content is 9-15 seconds feel — design the static to feel like a frame from a dynamic video.`;
  }

  if (platform === "WhatsApp") {
    if (sizeLabel?.includes("Portada") || sizeLabel?.includes("cover")) {
      instructions += `\n\n📱 WHATSAPP BUSINESS COVER (16:9, 1211x681):
- Professional business header. Show brand identity, tagline, and contact info.
- Clean, corporate design with readable text at small sizes.`;
    }
    if (sizeLabel?.includes("catálogo") || sizeLabel?.includes("Catálogo") || sizeLabel?.includes("Producto")) {
      instructions += `\n\n📱 WHATSAPP CATALOG (1:1, 1080x1080):
- E-commerce style: clean background, product prominently displayed.
- Include price tag area if applicable. Professional product photography style.`;
    }
    if (sizeLabel?.includes("Estado") || sizeLabel?.includes("Status")) {
      instructions += `\n\n📱 WHATSAPP STATUS (9:16, 1080x1920):
- Same safe-zone rules as Stories. Quick, impactful visual for ephemeral content.
- Bold text, clear CTA, brand colors. Designed to capture attention in 3 seconds.`;
    }
    if (sizeLabel?.includes("Anuncio") || sizeLabel?.includes("Ad")) {
      instructions += `\n\n📱 CLICK-TO-WHATSAPP ADS:
- Uses Meta Feed formats (1:1 or 4:5). Design must include a clear "Message us" CTA.
- Show WhatsApp green accent to signal the messaging intent.`;
    }
  }

  // Universal quality rules
  instructions += `\n\n🛠 TECHNICAL QUALITY REQUIREMENTS:
- Output must be PNG-quality crisp with no compression artifacts.
- Text in the image must be spelled correctly and perfectly legible.
- Colors should be vibrant and optimized for mobile OLED screens (high saturation, deep blacks).
- If the design includes text overlay, use proper typographic hierarchy (headline > subhead > body).
- All visual elements must respect the exact ${aspectRatio} aspect ratio — no stretching, no padding, no letterboxing.
- ABSOLUTELY DO NOT render any pixel measurements, dimension numbers, margin indicators, safe zone labels, ruler marks, or ANY technical annotations on the image. The output must be a clean, production-ready creative with ZERO visible technical metadata.`;

  return instructions;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, tone, platform, type, width, height, imageModel, sizeLabel, expertMode, referenceImageUrl } = await req.json();
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
      const aspectRatio = getClosestAspectRatio(width, height);
      const orientationHint = width && height
        ? width > height
          ? "horizontal/landscape"
          : height > width
            ? "vertical/portrait (taller than wide)"
            : "square"
        : "";

      // Build expert-level platform-specific instructions
      const expertInstructions = getExpertInstructions(platform, sizeLabel, width, height, aspectRatio, orientationHint);

      const sizeInstruction = width && height
        ? ` CRITICAL LAYOUT REQUIREMENT: This image MUST be designed as a ${orientationHint} composition with ${aspectRatio} aspect ratio. Distribute ALL visual elements, text, and graphics to fill the ENTIRE ${orientationHint} canvas naturally. Do NOT center everything in a square area — use the full ${orientationHint} space from edge to edge, top to bottom.${expertInstructions}`
        : "";
      const antiMeasurementsRule = `

ABSOLUTE PROHIBITION — READ THIS CAREFULLY:
You MUST NOT, under ANY circumstances, render, print, display, or include ANY of the following on the generated image:
- Pixel measurements (e.g., "250px", "340px", "1080x1920")
- Dimension labels or numbers
- Margin indicators or safe zone markers
- Ruler marks, guides, or grid lines
- Technical annotations of any kind
- The letters "px" next to any number
- Any text that describes image dimensions or spacing
The final image must be 100% CLEAN — as if it were a real advertisement ready to publish. NO technical overlays. NO measurement text. ZERO exceptions. If you add any measurement text, the image is INVALID.`;

      const imagePrompt = `${prompt}${sizeInstruction}${antiMeasurementsRule}`;

      console.log("Image generation - model:", imageModel || "pro", "- requested:", width, "x", height, "-> aspectRatio:", aspectRatio);

      // Build messages: if we have a reference image, send it as visual context
      const userContent: any[] = [];
      if (referenceImageUrl) {
        userContent.push({ type: "image_url", image_url: { url: referenceImageUrl } });
        userContent.push({ type: "text", text: `INSTRUCCIÓN CRÍTICA: La imagen adjunta es la imagen ORIGINAL. Debes generar una imagen IDÉNTICA en contenido, textos, colores, composición, estilo y diseño. La ÚNICA diferencia debe ser el formato/aspecto adaptado a ${aspectRatio || "las nuevas dimensiones"}. NO cambies NADA del diseño original.\n\n${imagePrompt}` });
      } else {
        userContent.push({ type: "text", text: imagePrompt });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: imageModel === "flash" ? "google/gemini-2.5-flash-image" : "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: userContent }],
          modalities: ["image", "text"],
          ...(aspectRatio ? { aspect_ratio: aspectRatio, image_generation_config: { aspectRatio } } : {}),
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
