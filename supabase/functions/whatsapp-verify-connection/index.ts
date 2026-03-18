import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
