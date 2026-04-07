import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildCaption(post: any): string {
  let caption = post.body || "";
  if (post.hashtags?.length > 0) {
    caption += "\n\n" + post.hashtags.join(" ");
  }
  return caption;
}

/** Convert Supabase storage URLs to use image transform for Instagram-safe sizes */
function optimizeImageUrl(url: string): string {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  if (url.includes("/storage/v1/object/public/")) {
    // Replace /object/ with /render/image/ and add transform params
    return url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=2048&quality=80";
  }
  return url;
}

async function publishToFacebook(post: any, creds: Record<string, string>): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { access_token, page_id } = creds;
  if (!access_token || !page_id) return { success: false, error: "Faltan credenciales de Facebook (access_token o page_id)" };

  try {
    if (post.media_urls?.length > 0 && post.media_type === "image") {
      // Multiple photos → publish each then create multi-photo post
      if (post.media_urls.length > 1) {
        const photoIds: string[] = [];
        for (const url of post.media_urls.slice(0, 10)) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, published: false, access_token }),
          });
          const data = await res.json();
          if (data.id) photoIds.push(data.id);
        }
        if (photoIds.length > 0) {
          const attached: Record<string, string> = {};
          photoIds.forEach((id, i) => { attached[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
          const params = new URLSearchParams({ message: buildCaption(post), access_token, ...attached });
          const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/feed`, { method: "POST", body: params });
          const data = await res.json();
          if (data.error) return { success: false, error: data.error.message };
          // First comment on multi-photo
          if (post.first_comment && data.id) {
            try { await fetch(`https://graph.facebook.com/v21.0/${data.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: post.first_comment, access_token }) }); } catch {}
          }
          return { success: true, externalId: data.id };
        }
      }

      // Single photo
      const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: post.media_urls[0], message: buildCaption(post), access_token }),
      });
      const data = await res.json();
      if (data.error) return { success: false, error: data.error.message };
      const singleId = data.id || data.post_id;
      // First comment on single photo
      if (post.first_comment && singleId) {
        try { await fetch(`https://graph.facebook.com/v21.0/${singleId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: post.first_comment, access_token }) }); } catch {}
      }
      return { success: true, externalId: singleId };
    }

    // Video post
    if (post.media_urls?.length > 0 && post.media_type === "video") {
      const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: post.media_urls[0], description: buildCaption(post), access_token }),
      });
      const data = await res.json();
      if (data.error) return { success: false, error: data.error.message };
      return { success: true, externalId: data.id };
    }

    // Text-only post
    const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: buildCaption(post), link: post.link_url || undefined, access_token }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    
    // First comment on Facebook
    const fbPostId = data.id;
    if (post.first_comment && fbPostId) {
      try {
        await fetch(`https://graph.facebook.com/v21.0/${fbPostId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: post.first_comment, access_token }),
        });
      } catch (commentErr) {
        console.error("Error posting first comment on Facebook:", commentErr);
      }
    }
    
    return { success: true, externalId: fbPostId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function publishToInstagram(post: any, creds: Record<string, string>): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { access_token, ig_account_id } = creds;
  if (!access_token || !ig_account_id) return { success: false, error: "Faltan credenciales de Instagram (access_token o ig_account_id)" };

  try {
    if (!post.media_urls?.length) return { success: false, error: "Instagram requiere al menos una imagen o video" };

    const isVideo = post.media_type === "video";
    const caption = buildCaption(post);

    // Carousel for multiple images
    if (post.media_urls.length > 1 && !isVideo && post.post_type === "post") {
      const itemIds: string[] = [];
      for (const url of post.media_urls.slice(0, 10)) {
        const itemRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: optimizeImageUrl(url), is_carousel_item: true, access_token }),
        });
        const itemData = await itemRes.json();
        if (itemData.id) itemIds.push(itemData.id);
      }

      if (itemIds.length > 0) {
        const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media_type: "CAROUSEL", children: itemIds, caption, access_token }),
        });
        const carouselData = await carouselRes.json();
        if (carouselData.error) return { success: false, error: carouselData.error.message };

        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: carouselData.id, access_token }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) return { success: false, error: publishData.error.message };
        return { success: true, externalId: publishData.id };
      }
    }

    // Single media container — with retry for transient download failures
    const createContainer = async (retryCount = 0): Promise<any> => {
      const containerBody: any = { caption, access_token };
      if (post.post_type === "reel") {
        containerBody.media_type = "REELS";
        containerBody.video_url = post.media_urls[0];
      } else if (isVideo && post.post_type !== "story") {
        containerBody.media_type = "VIDEO";
        containerBody.video_url = post.media_urls[0];
      } else if (post.post_type === "story") {
        containerBody.media_type = "STORIES";
        containerBody.image_url = optimizeImageUrl(post.media_urls[0]);
      } else {
        containerBody.media_type = "IMAGE";
        containerBody.image_url = optimizeImageUrl(post.media_urls[0]);
      }

      console.log("Instagram container request:", JSON.stringify({ post_type: post.post_type, media_type: containerBody.media_type, isVideo, retry: retryCount }));

      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      });
      const data = await containerRes.json();
      console.log("Instagram container response:", JSON.stringify(data));

      // Retry on "cannot retrieve media" errors (9004/2207052)
      if (data.error && data.error.code === 9004 && retryCount < 3) {
        console.log(`Instagram container retry ${retryCount + 1}/3 after media download failure`);
        await new Promise(r => setTimeout(r, 5000 * (retryCount + 1)));
        return createContainer(retryCount + 1);
      }
      return data;
    };

    const containerData = await createContainer();
    if (containerData.error) return { success: false, error: containerData.error.error_user_msg || containerData.error.message };

    // Wait for media processing (images AND videos)
    let attempts = 0;
    const maxAttempts = isVideo || post.post_type === "reel" ? 30 : 10;
    const waitMs = isVideo || post.post_type === "reel" ? 3000 : 2000;
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, waitMs));
      const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerData.id}?fields=status_code&access_token=${access_token}`);
      const statusData = await statusRes.json();
      console.log(`Instagram status check #${attempts + 1}: ${statusData.status_code}`);
      if (statusData.status_code === "FINISHED") break;
      if (statusData.status_code === "ERROR") return { success: false, error: "Error procesando media en Instagram" };
      attempts++;
    }

    // Publish
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token }),
    });
    const publishData = await publishRes.json();
    console.log("Instagram publish response:", JSON.stringify(publishData));
    if (publishData.error) return { success: false, error: publishData.error.error_user_msg || publishData.error.message };

    // First comment
    if (post.first_comment && publishData.id) {
      await fetch(`https://graph.facebook.com/v21.0/${publishData.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: post.first_comment, access_token }),
      });
    }

    return { success: true, externalId: publishData.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await authClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { post_id, action, only_platforms } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id es requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the post
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

    // Verify user has access to this clinic
    const { data: hasAccess } = await supabase.rpc("user_has_clinic_access", {
      _user_id: userData.user.id,
      _clinic_id: post.clinic_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Sin acceso a este negocio" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Meta credentials - try social_media_connections first, then ads_accounts
    let creds: Record<string, string> = {};
    
    const { data: socialConn } = await supabase
      .from("social_media_connections")
      .select("access_token, platform_account_id, platform")
      .eq("clinic_id", post.clinic_id)
      .eq("token_status", "active")
      .in("platform", ["facebook", "instagram"]);

    if (socialConn && socialConn.length > 0) {
      const fbConn = socialConn.find((c: any) => c.platform === "facebook");
      const igConn = socialConn.find((c: any) => c.platform === "instagram");
      if (fbConn) {
        creds.access_token = fbConn.access_token;
        creds.page_id = fbConn.platform_account_id;
      }
      if (igConn) {
        creds.ig_account_id = igConn.platform_account_id;
        if (!creds.access_token) creds.access_token = igConn.access_token;
      }
    }

    // Fallback to ads_accounts
    if (!creds.access_token) {
      const { data: metaAccount } = await supabase
        .from("ads_accounts")
        .select("credentials")
        .eq("clinic_id", post.clinic_id)
        .eq("platform", "meta")
        .eq("status", "connected")
        .single();
      if (metaAccount?.credentials) {
        creds = metaAccount.credentials as Record<string, string>;
      }
    }

    if (!creds.access_token) {
      return new Response(JSON.stringify({ error: "No hay cuenta de Meta conectada. Ve a Mi Cuenta > Redes Sociales para conectar tu cuenta." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const platforms = only_platforms?.length > 0 ? only_platforms : (post.platforms || []);
    const results: Record<string, any> = {};
    const externalIds: Record<string, string> = {};

    for (const platform of platforms) {
      let result;
      switch (platform) {
        case "facebook":
          result = await publishToFacebook(post, creds);
          break;
        case "instagram":
          result = await publishToInstagram(post, creds);
          break;
        default:
          result = { success: false, error: `Plataforma ${platform} no soportada aún` };
      }
      results[platform] = result;
      if (result.success && result.externalId) {
        externalIds[platform] = result.externalId;
      }
    }

    const anySucceeded = Object.values(results).some((r: any) => r.success);
    const allFailed = Object.values(results).every((r: any) => !r.success);

    // Update post status
    await supabase.from("content_posts").update({
      status: anySucceeded ? "published" : "failed",
      published_at: anySucceeded ? new Date().toISOString() : null,
      external_ids: { ...((post.external_ids as any) || {}), ...externalIds },
    }).eq("id", post.id);

    const statusCode = allFailed ? 422 : 200;
    return new Response(JSON.stringify({
      success: anySucceeded,
      results,
      message: anySucceeded
        ? "Publicación exitosa" + (Object.values(results).some((r: any) => !r.success) ? " (algunas plataformas fallaron)" : "")
        : "Error publicando en todas las plataformas",
    }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-to-meta error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
