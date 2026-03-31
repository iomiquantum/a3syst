import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, user_name, user_role, role_label, clinic_name, clinic_id, current_page, can_read, can_write, can_delete } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Mensajes requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build context-aware system prompt
    const systemPrompt = `Eres el Copiloto a3, el asistente inteligente del sistema a3syst.

CONTEXTO:
- Usuario: ${user_name}
- Rol: ${user_role} (${role_label})
- Negocio: ${clinic_name}
- Página actual: ${current_page}

PERMISOS:
- Puede consultar: ${(can_read || []).join(", ")}
- Puede modificar: ${(can_write || []).join(", ")}
- Puede eliminar: ${(can_delete || []).join(", ")}

REGLAS:
1. Si pide modificar algo fuera de sus permisos: "Esa acción requiere permisos de [rol necesario]. Contacta a tu administrador."
2. NUNCA ejecutar acciones fuera del rol.
3. Responder siempre en español.
4. Ser conciso, máximo 3 párrafos.
5. Si no sabes algo, decirlo honestamente.
6. Solo sugerir acciones que el rol puede ejecutar.
7. Usa markdown para formatear: **negrita**, listas con •, \`código\`.
8. Sé amigable y profesional.
9. Cuando menciones funcionalidades del sistema, indica en qué módulo/sección se encuentran.
10. Si te preguntan sobre datos específicos (citas, pacientes, etc.), explica dónde encontrarlos en el sistema ya que no tienes acceso directo a la base de datos en este momento.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20),
    ];

    // Call Lovable AI Gateway
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: false,
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const status = resp.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta en unos segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta. Intenta de nuevo.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Copilot chat error:", err);
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
