import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ValidationRequest {
  channel: string;
  credentials: Record<string, string>;
}

async function validateWhatsApp(creds: Record<string, string>): Promise<{ valid: boolean; detail: string }> {
  const { access_token, phone_number_id } = creds;
  if (!access_token || !phone_number_id) {
    return { valid: false, detail: "Faltan campos requeridos: Access Token y Phone Number ID" };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}?access_token=${access_token}`
    );
    if (res.ok) {
      const data = await res.json();
      return { valid: true, detail: `Número verificado: ${data.display_phone_number || data.verified_name || phone_number_id}` };
    }
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Error HTTP ${res.status}`;
    return { valid: false, detail: `WhatsApp API rechazó las credenciales: ${msg}` };
  } catch (e) {
    return { valid: false, detail: `Error de conexión: ${e.message}` };
  }
}

async function validateInstagram(creds: Record<string, string>): Promise<{ valid: boolean; detail: string }> {
  const { access_token, ig_account_id } = creds;
  if (!access_token || !ig_account_id) {
    return { valid: false, detail: "Faltan campos requeridos: Access Token e Instagram Account ID" };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${ig_account_id}?fields=name,username&access_token=${access_token}`
    );
    if (res.ok) {
      const data = await res.json();
      return { valid: true, detail: `Cuenta verificada: @${data.username || data.name || ig_account_id}` };
    }
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Error HTTP ${res.status}`;
    return { valid: false, detail: `Instagram API rechazó las credenciales: ${msg}` };
  } catch (e) {
    return { valid: false, detail: `Error de conexión: ${e.message}` };
  }
}

async function validateFacebook(creds: Record<string, string>): Promise<{ valid: boolean; detail: string }> {
  const { access_token, page_id } = creds;
  if (!access_token || !page_id) {
    return { valid: false, detail: "Faltan campos requeridos: Access Token y Page ID" };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${page_id}?fields=name,id&access_token=${access_token}`
    );
    if (res.ok) {
      const data = await res.json();
      return { valid: true, detail: `Página verificada: ${data.name || page_id}` };
    }
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Error HTTP ${res.status}`;
    return { valid: false, detail: `Facebook API rechazó las credenciales: ${msg}` };
  } catch (e) {
    return { valid: false, detail: `Error de conexión: ${e.message}` };
  }
}

async function validateTikTok(creds: Record<string, string>): Promise<{ valid: boolean; detail: string }> {
  const { access_token } = creds;
  if (!access_token) {
    return { valid: false, detail: "Falta el Access Token" };
  }
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const name = data?.data?.user?.display_name || "Usuario TikTok";
      return { valid: true, detail: `Cuenta verificada: ${name}` };
    }
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || err?.message || `Error HTTP ${res.status}`;
    return { valid: false, detail: `TikTok API rechazó las credenciales: ${msg}` };
  } catch (e) {
    return { valid: false, detail: `Error de conexión: ${e.message}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ valid: false, detail: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ valid: false, detail: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { channel, credentials } = (await req.json()) as ValidationRequest;

    if (!channel || !credentials) {
      return new Response(JSON.stringify({ valid: false, detail: "Parámetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { valid: boolean; detail: string };

    switch (channel) {
      case "whatsapp":
        result = await validateWhatsApp(credentials);
        break;
      case "instagram":
        result = await validateInstagram(credentials);
        break;
      case "facebook":
        result = await validateFacebook(credentials);
        break;
      case "tiktok":
        result = await validateTikTok(credentials);
        break;
      default:
        result = { valid: false, detail: `Canal no soportado: ${channel}` };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Validation error:", e);
    return new Response(JSON.stringify({ valid: false, detail: `Error interno: ${e.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
