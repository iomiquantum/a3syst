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
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isSuperAdmin } = await callerClient.rpc("is_super_admin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "No autorizado - se requiere super admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { email, password, full_name, clinic_id, role, skip_onboarding } = body;

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Email, contraseña y nombre son requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers();
    const existingUser = (existingUsers || []).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());

    if (existingUser) {
      if (clinic_id && role) {
        const { error: roleError } = await adminClient.from("user_roles").insert({
          user_id: existingUser.id,
          clinic_id,
          role,
          permissions: getDefaultPerms(role),
        });
        if (roleError) {
          if (roleError.message.includes("duplicate") || roleError.message.includes("unique")) {
            return new Response(JSON.stringify({ error: "Este usuario ya tiene ese rol en esa clínica" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ user: { id: existingUser.id, email: existingUser.email }, message: "Usuario existente asignado a la clínica" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Ya existe un usuario con el email ${email}. Usa "Asignar a Clínica" para agregar roles.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        // When a clinic_id is provided, skip auto-creation of a default clinic
        ...(clinic_id ? { skip_clinic_creation: true } : {}),
      },
    });

    if (error) {
      console.error("Error creating user:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (clinic_id && role && data.user) {
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: data.user.id,
        clinic_id,
        role,
        permissions: getDefaultPerms(role),
      });
      if (roleError) {
        console.error("Error assigning role:", roleError);
      }
    }

    // If skip_onboarding, mark the auto-created clinic as completed
    if (skip_onboarding && data.user) {
      const { error: onbErr } = await adminClient
        .from("clinics")
        .update({ onboarding_completed: true })
        .eq("owner_id", data.user.id);
      if (onbErr) {
        console.error("Error skipping onboarding:", onbErr);
      }
    }

    return new Response(JSON.stringify({ user: { id: data.user.id, email: data.user.email }, message: "Usuario creado exitosamente" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function getDefaultPerms(role: string) {
  switch (role) {
    case "super_admin":
    case "admin":
      return { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true };
    case "manager":
      return { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true };
    case "secretary":
      return { agenda: true, pacientes: true, ventas: true, configuracion: false, reportes: false };
    case "professional":
      return { agenda: true, pacientes: true, ventas: false, configuracion: false, reportes: false };
    case "empleado":
      return { agenda: true, pacientes: false, ventas: false, configuracion: false, reportes: false };
    case "vendedor":
      return { agenda: false, pacientes: false, ventas: true, configuracion: false, reportes: false };
    default:
      return { agenda: true, pacientes: false, ventas: false, configuracion: false, reportes: false };
  }
}
