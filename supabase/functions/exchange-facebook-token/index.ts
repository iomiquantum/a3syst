import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { shortLivedToken, businessId } = await req.json();

    if (!shortLivedToken) {
      return new Response(
        JSON.stringify({ error: "Token requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine App ID & Secret based on clinic's meta config
    let appId = Deno.env.get("FACEBOOK_APP_ID") || "";
    let appSecret = Deno.env.get("FACEBOOK_APP_SECRET") || "";

    if (businessId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: metaConfig } = await supabase
        .from("meta_app_configurations")
        .select("app_mode, custom_app_id, custom_app_secret_encrypted")
        .eq("clinic_id", businessId)
        .maybeSingle();

      if (metaConfig?.app_mode === "custom" && metaConfig.custom_app_id && metaConfig.custom_app_secret_encrypted) {
        appId = metaConfig.custom_app_id;
        appSecret = metaConfig.custom_app_secret_encrypted;
      }
    }

    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "Configuración de Meta App no encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Exchange for long-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(
        JSON.stringify({ error: `Error al intercambiar token: ${tokenData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const longLivedToken = tokenData.access_token;

    // 2. Get user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture{url}&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return new Response(
        JSON.stringify({ error: `Error al obtener páginas: ${pagesData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No se encontraron páginas de Facebook. Asegúrate de tener una página y haberla autorizado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. For each page, get Instagram Business Account
    const pagesWithInstagram = await Promise.all(
      pagesData.data.map(async (page: any) => {
        try {
          const igRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${page.access_token}`
          );
          const igData = await igRes.json();

          return {
            page_id: page.id,
            page_name: page.name,
            page_access_token: page.access_token,
            page_picture: page.picture?.data?.url || null,
            instagram: igData.instagram_business_account || null,
          };
        } catch {
          return {
            page_id: page.id,
            page_name: page.name,
            page_access_token: page.access_token,
            page_picture: page.picture?.data?.url || null,
            instagram: null,
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ pages: pagesWithInstagram }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
