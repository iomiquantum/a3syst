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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isSuperAdmin } = await callerClient.rpc("is_super_admin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "No autorizado - se requiere super admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: roles, error: rolesError }, { data: clinics, error: clinicsError }] = await Promise.all([
      adminClient.from("user_roles").select("id").eq("user_id", user_id),
      adminClient.from("clinics").select("id").eq("owner_id", user_id),
    ]);

    if (rolesError || clinicsError) {
      return new Response(JSON.stringify({ error: rolesError?.message || clinicsError?.message || "No se pudo validar el usuario" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((roles?.length ?? 0) > 0 || (clinics?.length ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Primero debes quitar sus roles o clínicas antes de eliminar este usuario" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authDeleteError) {
      return new Response(JSON.stringify({ error: authDeleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanupResults = await Promise.allSettled([
      adminClient.from("profiles").delete().eq("user_id", user_id),
      adminClient.from("actividad_usuarios").delete().eq("usuario_id", user_id),
    ]);

    cleanupResults.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Cleanup error:", result.reason);
      }
    });

    return new Response(JSON.stringify({ success: true, message: "Usuario eliminado exitosamente" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
