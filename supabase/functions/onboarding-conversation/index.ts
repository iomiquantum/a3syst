const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Eres el asistente de onboarding de A3SYST, una plataforma que crea negocios digitales con landing page y chatbot IA.

Tu trabajo es tener una CONVERSACIÓN NATURAL con el usuario para recopilar la información de su negocio. NO eres un formulario — eres un entrevistador amigable y profesional que se adapta a lo que el usuario dice.

REGLAS:
1. Haz preguntas NATURALES, no interrogatorios. Si el usuario en una sola respuesta te dice el nombre, ubicación y tipo de negocio, no vuelvas a preguntar eso.
2. Puedes extraer MÚLTIPLES datos de una sola respuesta. Si dice 'Tengo una clínica dental en Quito que se llama Sonrisa Perfecta', ya tienes nombre, tipo Y ciudad.
3. Adapta tu tono al tipo de negocio. Si es un spa, sé más cálido. Si es una clínica médica, más profesional. Si es una tienda, más dinámico.
4. Cuando preguntes sobre servicios, profundiza naturalmente: '¡Qué interesante! ¿Y cuánto cobras por ese tratamiento? ¿Cuánto dura aproximadamente?'
5. Genera 3-4 SUGERENCIAS de respuestas/temas que el usuario podría querer responder a continuación. Estas deben ser RELEVANTES al contexto.
6. Cuando ya tengas suficiente información (nombre, tipo, ubicación, contacto, al menos 2 servicios con precio), incluye la sugerencia '✅ Ya di toda mi información' como primera opción.
7. Si el usuario dice algo irrelevante o confuso, redirige amablemente.
8. Nunca repitas una pregunta sobre algo que ya sabes.
9. Sé breve en tus respuestas — máximo 2-3 oraciones + la pregunta.
10. IMPORTANTE: Cada respuesta tuya debe tener EXACTAMENTE la estructura JSON indicada (nada más).

RESPONDE ÚNICAMENTE CON EL JSON. Sin texto adicional, sin markdown, sin backticks. Solo el JSON puro.

El campo "can_finish" debe ser true SOLO cuando tengas al menos:
- business_name
- business_type
- city O ubicación
- whatsapp O algún contacto
- Al menos 2 servicios con precio

Cuando can_finish sea true, SIEMPRE incluye "✅ Ya di toda mi información" como primera opción en suggested_questions.

Si el usuario dice que ya terminó pero faltan datos críticos, pregunta específicamente lo que falta de forma amable.

Si user_message es "INICIO_ONBOARDING", genera un saludo amigable y pregunta abierta para empezar.

Si user_message es "PARSE_EXTERNAL", el usuario pegó texto de una IA externa. Extrae toda la info posible del texto que viene en el campo external_text.

Tu respuesta debe ser EXACTAMENTE este JSON:
{
  "message": "string (tu respuesta conversacional)",
  "extracted_data": {
    "business_name": "string o null",
    "business_type": "string o null",
    "description": "string o null",
    "city": "string o null",
    "whatsapp": "string o null",
    "opening_hour": "string o null (formato HH:00)",
    "closing_hour": "string o null (formato HH:00)",
    "working_days": ["Lun","Mar",...] o null,
    "services": [{"name":"","price":null,"duration":null,"description":""}],
    "additional_info": "string",
    "agent_name": "string o null",
    "agent_tone": "string o null"
  },
  "suggested_questions": ["string","string","string"],
  "summary_card": {
    "show": false,
    "title": "string",
    "items": [{"label":"string","value":"string"}]
  },
  "progress_percentage": 0,
  "is_complete": false,
  "can_finish": false
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_message, collected_data, conversation_history, missing_fields, progress_percentage, external_text } = body;

    if (!user_message) {
      return new Response(JSON.stringify({ error: "user_message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextMessage = `
DATOS YA RECOPILADOS:
${JSON.stringify(collected_data || {}, null, 2)}

CAMPOS QUE FALTAN:
${JSON.stringify(missing_fields || [])}

PROGRESO ACTUAL: ${progress_percentage || 0}%

HISTORIAL DE CONVERSACIÓN:
${(conversation_history || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join("\n")}

${external_text ? `TEXTO EXTERNO A PARSEAR:\n${external_text}\n` : ""}

MENSAJE DEL USUARIO:
${user_message}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

    const response = await fetch("https://lovable.dev/api/ai-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "x-supabase-project-ref": projectRef,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI proxy error:", response.status, errText);
      throw new Error(`AI proxy error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Onboarding conversation error:", err.message);
    return new Response(JSON.stringify({
      message: "Hubo un problema procesando tu respuesta. ¿Puedes intentar de nuevo?",
      extracted_data: {},
      suggested_questions: ["Cuéntame sobre tu negocio", "¿Qué servicios ofreces?"],
      summary_card: { show: false, title: "", items: [] },
      progress_percentage: 0,
      is_complete: false,
      can_finish: false,
      error: err.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
