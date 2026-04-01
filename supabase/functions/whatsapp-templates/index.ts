import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MetaTemplateComponent = {
  type?: string;
  text?: string;
  format?: string;
};

type MetaTemplate = {
  name?: string;
  language?: string;
  category?: string;
  status?: string;
  id?: string;
  components?: MetaTemplateComponent[];
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractVariableIndexes(text: string | undefined) {
  const matches = [...(text || "").matchAll(/\{\{(\d+)\}\}/g)];
  return [...new Set(matches.map((match) => Number(match[1])).filter(Number.isFinite))].sort((a, b) => a - b);
}

function mapTemplate(template: MetaTemplate) {
  const components = (template.components || []).map((component) => ({
    type: (component.type || "BODY").toUpperCase(),
    text: component.text || "",
    format: component.format || null,
    variableIndexes: extractVariableIndexes(component.text),
  }));

  const variableIndexes = [...new Set(components.flatMap((component) => component.variableIndexes))].sort((a, b) => a - b);
  const bodyComponent = components.find((component) => component.type === "BODY");
  const headerComponent = components.find((component) => component.type === "HEADER");

  return {
    id: `${template.name || "template"}:${template.language || "es"}`,
    meta_id: template.id || null,
    name: template.name || "template",
    language: template.language || "es",
    category: template.category || "UTILITY",
    status: template.status || "UNKNOWN",
    preview: bodyComponent?.text || headerComponent?.text || "Template sin vista previa",
    variableIndexes,
    components,
  };
}

async function fetchMetaTemplates(wabaId: string, accessToken: string) {
  const templates: MetaTemplate[] = [];
  let nextUrl: string | null = `https://graph.facebook.com/v22.0/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || "No se pudieron cargar los templates desde Meta");
    }

    templates.push(...(payload?.data || []));
    nextUrl = payload?.paging?.next || null;
  }

  return templates;
}

async function createMetaTemplate(wabaId: string, accessToken: string, body: any) {
  const response = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "No se pudo crear el template en Meta");
  }
  return payload;
}

async function deleteMetaTemplate(wabaId: string, accessToken: string, templateName: string) {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "No se pudo eliminar el template en Meta");
  }
  return payload;
}

async function getConnectionCredentials(clinicId: string, serviceClient: any) {
  const { data: connection } = await serviceClient
    .from("whatsapp_connections")
    .select("business_name, waba_id, access_token, status, phone_number_id")
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!connection) {
    throw new Error("No hay una conexión activa de WhatsApp para este negocio");
  }

  const envWabaId = (Deno.env.get("META_WABA_ID") || "").trim();
  const envToken = (Deno.env.get("META_ACCESS_TOKEN") || "").trim();
  const dbToken = (connection.access_token || "").trim();
  const accessToken = dbToken || (connection.waba_id === envWabaId ? envToken : "");

  if (!connection.waba_id || !accessToken) {
    throw new Error("La conexión de WhatsApp no tiene credenciales válidas para consultar templates");
  }

  return { ...connection, accessToken };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const body = await req.json();
    const clinicId = body?.clinic_id as string | undefined;
    const action = (body?.action as string) || "list";

    if (!clinicId) {
      return jsonResponse({ error: "clinic_id es requerido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: authError } = await authClient.auth.getUser();
    if (authError || !userData?.user) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    const { data: accessibleClinic, error: clinicError } = await authClient
      .from("clinics")
      .select("id")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError || !accessibleClinic) {
      return jsonResponse({ error: "No tienes acceso a esta clínica" }, 403);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const conn = await getConnectionCredentials(clinicId, serviceClient);

    // --- LIST ---
    if (action === "list") {
      const approvedOnly = body?.approved_only !== false;
      const templates = (await fetchMetaTemplates(conn.waba_id, conn.accessToken))
        .map(mapTemplate)
        .filter((template) => !approvedOnly || template.status.toUpperCase() === "APPROVED")
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      return jsonResponse({
        business_name: conn.business_name,
        phone_number_id: conn.phone_number_id,
        templates,
      });
    }

    // --- CREATE ---
    if (action === "create") {
      const { name, language, category, body_text, header_text } = body;
      if (!name || !body_text) {
        return jsonResponse({ error: "name y body_text son requeridos" }, 400);
      }

      const components: any[] = [];
      if (header_text) {
        components.push({ type: "HEADER", format: "TEXT", text: header_text });
      }
      components.push({ type: "BODY", text: body_text });

      const result = await createMetaTemplate(conn.waba_id, conn.accessToken, {
        name: name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        language: language || "es",
        category: category || "UTILITY",
        components,
      });

      return jsonResponse({ success: true, result });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { template_name } = body;
      if (!template_name) {
        return jsonResponse({ error: "template_name es requerido" }, 400);
      }
      const result = await deleteMetaTemplate(conn.waba_id, conn.accessToken, template_name);
      return jsonResponse({ success: true, result });
    }

    return jsonResponse({ error: `Acción desconocida: ${action}` }, 400);
  } catch (error) {
    console.error("[WA-Templates] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
