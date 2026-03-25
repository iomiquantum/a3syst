import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const auth = await verifyAuth(req, supabaseUrl);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { phone_number_id, access_token } = await req.json();

    if (!phone_number_id || !access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing phone_number_id or access_token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating,platform_type&access_token=${access_token}`
    );
    const metaResult = await metaResponse.json();

    if (!metaResponse.ok || metaResult.error) {
      const errorCode = metaResult.error?.code;
      let userMessage = "Credenciales inválidas";
      if (errorCode === 190) userMessage = "El token es inválido o ya expiró. Genera uno nuevo.";
      else if (errorCode === 100) userMessage = "El ID del número no es correcto. Verifica el paso 2.";
      else if (metaResult.error?.message) userMessage = metaResult.error.message;

      return new Response(
        JSON.stringify({ success: false, error: userMessage, error_code: errorCode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: metaResult.display_phone_number,
        business_name: metaResult.verified_name,
        quality_rating: metaResult.quality_rating,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
