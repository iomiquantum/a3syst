import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the post
    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", post_id)
      .single();
    if (postErr || !post) {
      return new Response(JSON.stringify({ error: "Publicación no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify access
    const { data: hasAccess } = await supabase.rpc("user_has_clinic_access", {
      _user_id: user.id, _clinic_id: post.clinic_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Sin acceso" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalIds = (post.external_ids || {}) as Record<string, string>;
    const deleteResults: Record<string, { success: boolean; error?: string }> = {};

    // Only attempt remote deletion if there are external IDs (published posts)
    if (Object.keys(externalIds).length > 0) {
      // Get credentials
      let accessToken = "";

      const { data: socialConn } = await supabase
        .from("social_media_connections")
        .select("access_token, platform")
        .eq("clinic_id", post.clinic_id)
        .eq("token_status", "active")
        .in("platform", ["facebook", "instagram"]);

      if (socialConn && socialConn.length > 0) {
        accessToken = socialConn[0].access_token;
      }

      if (!accessToken) {
        const { data: metaAccount } = await supabase
          .from("ads_accounts")
          .select("credentials")
          .eq("clinic_id", post.clinic_id)
          .eq("platform", "meta")
          .eq("status", "connected")
          .single();
        if (metaAccount?.credentials) {
          accessToken = (metaAccount.credentials as any).access_token || "";
        }
      }

      if (accessToken) {
        for (const [platform, externalId] of Object.entries(externalIds)) {
          if (!externalId) continue;
          try {
            const res = await fetch(
              `https://graph.facebook.com/v21.0/${externalId}?access_token=${accessToken}`,
              { method: "DELETE" }
            );
            const data = await res.json();
            if (data.success || data === true) {
              deleteResults[platform] = { success: true };
            } else {
              deleteResults[platform] = { success: false, error: data.error?.message || "Error desconocido" };
            }
          } catch (err: any) {
            deleteResults[platform] = { success: false, error: err.message };
          }
        }
      } else {
        // No credentials - still delete locally
        for (const platform of Object.keys(externalIds)) {
          deleteResults[platform] = { success: false, error: "Sin credenciales de Meta" };
        }
      }
    }

    // Always delete the local post
    const { error: deleteErr } = await supabase
      .from("content_posts")
      .delete()
      .eq("id", post_id);

    if (deleteErr) {
      return new Response(JSON.stringify({ error: "Error eliminando localmente: " + deleteErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteDeleted = Object.values(deleteResults).some(r => r.success);
    const hadExternalIds = Object.keys(externalIds).length > 0;

    return new Response(JSON.stringify({
      success: true,
      remoteDeleted,
      deleteResults,
      message: hadExternalIds
        ? (remoteDeleted ? "Eliminada de tus redes y del sistema" : "Eliminada del sistema (no se pudo borrar de las redes)")
        : "Publicación eliminada",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("delete-from-meta error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
