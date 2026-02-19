import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email, full_name, referral_code } = await req.json();
    if (!email || !full_name || !referral_code) {
      return new Response(
        JSON.stringify({ error: "Email, nombre y código de referido son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that the referral code exists and has >= 4 referrals
    const { data: registration } = await adminClient
      .from("launch_registrations")
      .select("*")
      .eq("email", email)
      .eq("referral_code", referral_code)
      .maybeSingle();

    if (!registration) {
      return new Response(
        JSON.stringify({ error: "Registro no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count referrals
    const { count } = await adminClient
      .from("launch_registrations")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", referral_code);

    if ((count || 0) < 4) {
      return new Response(
        JSON.stringify({ error: "Necesitas al menos 4 referidos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a temporary password
    const tempPassword = `A3-${referral_code}-${crypto.randomUUID().slice(0, 8)}`;

    // Create user
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      // If user already exists, that's fine
      if (error.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ message: "Usuario ya existe", already_exists: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        user: { id: data.user.id, email: data.user.email },
        message: "Usuario creado exitosamente. Pendiente validación manual."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
