import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { business_type, business_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un experto en configuración de sistemas de gestión empresarial. 
Tu trabajo es personalizar los labels/nombres de las secciones de un sistema SaaS según el tipo de negocio.

El sistema tiene estas secciones configurables:
- patients: Sección de personas/clientes del negocio (ej: "Pacientes" para clínicas, "Alumnos" para academias, "Clientes" para tiendas)
- treatments: Sección de servicios/productos (ej: "Tratamientos" para clínicas, "Cursos" para academias, "Productos" para ecommerce)
- professionals: Sección de equipo/staff (ej: "Doctores" para clínicas, "Profesores" para academias, "Vendedores" para retail)
- branches: Sección de ubicaciones (ej: "Sucursales", "Sedes", "Locales", "Consultorios")
- appointments: Sección de citas/reservas (ej: "Citas", "Reservas", "Clases", "Sesiones")
- sales: Sección de ventas/transacciones (ej: "Ventas", "Facturación", "Cobros")
- business: Nombre genérico del negocio (ej: "Clínica", "Academia", "Tienda", "Agencia")
- specialties: Categorías internas (ej: "Especialidades", "Departamentos", "Áreas", "Categorías")

También debes generar una lista de 5-8 servicios/productos iniciales sugeridos para el tipo de negocio.

IMPORTANTE: Responde SOLO con el JSON, sin markdown ni explicaciones.`;

    const userPrompt = `Tipo de negocio: ${business_type}
Nombre del negocio: ${business_name || "Mi Negocio"}

Genera un JSON con esta estructura exacta:
{
  "labels": {
    "patients": "nombre para la sección de clientes/personas",
    "patients_singular": "singular de patients",
    "treatments": "nombre para servicios/productos",
    "treatments_singular": "singular de treatments",
    "professionals": "nombre para el equipo",
    "professionals_singular": "singular de professionals",
    "branches": "nombre para ubicaciones",
    "branches_singular": "singular de branches",
    "appointments": "nombre para citas/reservas",
    "appointments_singular": "singular de appointments",
    "sales": "nombre para ventas",
    "business": "tipo de negocio",
    "specialties": "nombre para categorías"
  },
  "initial_services": [
    { "name": "Servicio 1", "duration": 30, "price": 0, "description": "Descripción breve" },
    { "name": "Servicio 2", "duration": 60, "price": 0, "description": "Descripción breve" }
  ]
}`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "personalize_business",
              description: "Return personalized labels and initial services for the business type",
              parameters: {
                type: "object",
                properties: {
                  labels: {
                    type: "object",
                    properties: {
                      patients: { type: "string" },
                      patients_singular: { type: "string" },
                      treatments: { type: "string" },
                      treatments_singular: { type: "string" },
                      professionals: { type: "string" },
                      professionals_singular: { type: "string" },
                      branches: { type: "string" },
                      branches_singular: { type: "string" },
                      appointments: { type: "string" },
                      appointments_singular: { type: "string" },
                      sales: { type: "string" },
                      business: { type: "string" },
                      specialties: { type: "string" },
                    },
                    required: ["patients", "treatments", "professionals", "branches", "appointments", "sales", "business", "specialties"],
                  },
                  initial_services: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        duration: { type: "number" },
                        price: { type: "number" },
                        description: { type: "string" },
                      },
                      required: ["name", "duration", "price", "description"],
                    },
                  },
                },
                required: ["labels", "initial_services"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "personalize_business" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Error al conectar con la IA");
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se pudo procesar la respuesta de la IA");
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("personalize-business error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
