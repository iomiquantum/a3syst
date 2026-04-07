import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authorization (CRON_SECRET or service_role)
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const token = authHeader.replace("Bearer ", "");
  const isAuthorized = token === serviceRoleKey || token === cronSecret ||
    token === Deno.env.get("SUPABASE_ANON_KEY");

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const now = new Date().toISOString();

    // Delete expired trash entries (older than 30 days based on expires_at)
    const { data: expired, error: fetchErr } = await supabase
      .from("clinic_trash")
      .select("id, entity_type, entity_name, clinic_id")
      .lte("expires_at", now);

    if (fetchErr) throw fetchErr;

    if (!expired || expired.length === 0) {
      console.log("[purge-expired-trash] No expired entries found");
      return new Response(JSON.stringify({ purged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiredIds = expired.map((e: any) => e.id);

    const { error: deleteErr } = await supabase
      .from("clinic_trash")
      .delete()
      .in("id", expiredIds);

    if (deleteErr) throw deleteErr;

    console.log(`[purge-expired-trash] Purged ${expiredIds.length} expired entries`);

    return new Response(JSON.stringify({
      purged: expiredIds.length,
      entries: expired.map((e: any) => ({
        entity_type: e.entity_type,
        entity_name: e.entity_name,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[purge-expired-trash] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
