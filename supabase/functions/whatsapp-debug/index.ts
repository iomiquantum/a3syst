import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const WABA_ID = "1293043446187443";
  const PHONE_NUMBER_ID = "1015576141630486";

  try {
    // Get access_token from whatsapp_connections
    const { data: conn, error: connErr } = await supabase
      .from("whatsapp_connections")
      .select("access_token, business_name, meta_app_id, status")
      .eq("phone_number_id", PHONE_NUMBER_ID)
      .single();

    if (connErr || !conn) {
      const msg = `No connection found for phone_number_id ${PHONE_NUMBER_ID}: ${connErr?.message}`;
      console.error(msg);
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = conn.access_token || Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No access_token available" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[whatsapp-debug] Connection:", {
      business_name: conn.business_name,
      meta_app_id: conn.meta_app_id,
      status: conn.status,
      has_token: Boolean(conn.access_token),
      token_preview: accessToken.substring(0, 20) + "...",
    });

    // 1) GET: Check which apps are currently subscribed
    const getUrl = `https://graph.facebook.com/v25.0/${WABA_ID}/subscribed_apps?access_token=${accessToken}`;
    console.log("[whatsapp-debug] GET subscribed_apps...");
    const getResp = await fetch(getUrl);
    const getData = await getResp.json();
    console.log("[whatsapp-debug] GET response:", JSON.stringify(getData));

    // 2) POST: Subscribe the app to the WABA
    const postUrl = `https://graph.facebook.com/v25.0/${WABA_ID}/subscribed_apps`;
    console.log("[whatsapp-debug] POST subscribed_apps...");
    const postResp = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const postData = await postResp.json();
    console.log("[whatsapp-debug] POST response:", JSON.stringify(postData));

    // 3) GET again to confirm subscription
    console.log("[whatsapp-debug] GET subscribed_apps (after POST)...");
    const getResp2 = await fetch(getUrl);
    const getData2 = await getResp2.json();
    console.log("[whatsapp-debug] GET after POST response:", JSON.stringify(getData2));

    return new Response(JSON.stringify({
      connection: {
        business_name: conn.business_name,
        meta_app_id: conn.meta_app_id,
        status: conn.status,
      },
      get_before: getData,
      post_subscribe: postData,
      get_after: getData2,
    }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[whatsapp-debug] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
