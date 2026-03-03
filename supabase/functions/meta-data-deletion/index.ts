import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseSignedRequest(signedRequest: string, secret: string): any {
  // Meta sends base64url encoded payload
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let userId = "";

    // Try to parse as form data (Meta sends application/x-www-form-urlencoded)
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("form")) {
      const formData = await req.formData();
      const signedRequest = formData.get("signed_request") as string;
      if (signedRequest) {
        const data = parseSignedRequest(signedRequest, "");
        userId = data?.user_id || "";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      userId = body.user_id || body.signed_request || "";
    }

    // Generate confirmation code
    const confirmationCode = crypto.randomUUID().slice(0, 12);

    // If we have a user ID, try to clean up their data
    if (userId) {
      // Delete social media connections matching this facebook user
      await supabase
        .from("social_media_connections")
        .delete()
        .or(`platform_account_id.eq.${userId},metadata->>facebook_user_id.eq.${userId}`);

      // Log the deletion request
      console.log(`Data deletion requested for user: ${userId}, code: ${confirmationCode}`);
    }

    const domain = req.headers.get("origin") || "https://a3syst.lovable.app";

    return new Response(JSON.stringify({
      url: `${domain}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-data-deletion error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});