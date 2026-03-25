import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === DUAL AUTH CHECK ===
async function verifyAuth(req: Request, supabaseUrl: string): Promise<{ authorized: boolean; source: string }> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) return { authorized: true, source: "cron" };
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false, source: "no_header" };
  const token = authHeader.replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (token === serviceKey) return { authorized: true, source: "service_role" };
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (token === anonKey) return { authorized: true, source: "anon_trigger" };
  try {
    const { createClient: cc } = await import("https://esm.sh/@supabase/supabase-js@2");
    const c = cc(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await c.auth.getUser();
    if (error || !data?.user) return { authorized: false, source: "invalid_jwt" };
    return { authorized: true, source: "user_jwt" };
  } catch { return { authorized: false, source: "jwt_error" }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const auth = await verifyAuth(req, supabaseUrl);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { code, waba_id, phone_number_id, clinic_id } = await req.json();

    if (!code || !clinic_id) {
      return new Response(
        JSON.stringify({ error: "code y clinic_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appId = Deno.env.get("FACEBOOK_APP_ID") || Deno.env.get("META_APP_ID") || "";
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET") || "";

    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "Configuración de Meta App no encontrada (APP_ID o APP_SECRET)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Exchange code for access token
    const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return new Response(
        JSON.stringify({ error: `Error al intercambiar token: ${tokenData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = tokenData.access_token;

    // 2. If we have waba_id, try to get phone number details
    let phoneNumber = null;
    let displayName = null;
    let resolvedPhoneNumberId = phone_number_id || null;

    if (waba_id) {
      try {
        // Get phone numbers for this WABA
        const phonesRes = await fetch(
          `https://graph.facebook.com/v22.0/${waba_id}/phone_numbers?access_token=${accessToken}`
        );
        const phonesData = await phonesRes.json();

        if (phonesData.data && phonesData.data.length > 0) {
          const firstPhone = phonesData.data[0];
          resolvedPhoneNumberId = resolvedPhoneNumberId || firstPhone.id;
          phoneNumber = firstPhone.display_phone_number || firstPhone.verified_name || null;
          displayName = firstPhone.verified_name || firstPhone.display_phone_number || null;
        }
      } catch (e) {
        console.error("Error fetching phone numbers:", e);
      }
    }

    // 3. Save to whatsapp_connections
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert: update if clinic already has a connection, insert otherwise
    const { data: existing } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("whatsapp_connections")
        .update({
          waba_id: waba_id || "",
          phone_number_id: resolvedPhoneNumberId || "",
          phone_number: phoneNumber,
          display_name: displayName,
          access_token: accessToken,
          status: "active",
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("whatsapp_connections")
        .insert({
          clinic_id,
          waba_id: waba_id || "",
          phone_number_id: resolvedPhoneNumberId || "",
          phone_number: phoneNumber,
          display_name: displayName,
          access_token: accessToken,
          status: "active",
          coexistence_enabled: true,
          connected_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: phoneNumber,
        display_name: displayName,
        phone_number_id: resolvedPhoneNumberId,
        waba_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("whatsapp-connect error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
