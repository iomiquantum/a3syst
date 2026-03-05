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

async function postFirstComment(postId: string, message: string, accessToken: string) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    });
  } catch (err) {
    console.error("Error posting first comment:", err);
  }
}

async function publishToFacebook(post: any, creds: Record<string, string>): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { access_token, page_id } = creds;
  if (!access_token || !page_id) return { success: false, error: "Missing Facebook credentials" };

  try {
    if (post.media_urls?.length > 0 && post.media_type === "image") {
      // Multiple photos
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
          if (post.first_comment && data.id) await postFirstComment(data.id, post.first_comment, access_token);
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
      const fbPostId = data.id || data.post_id;
      if (post.first_comment && fbPostId) await postFirstComment(fbPostId, post.first_comment, access_token);
      return { success: true, externalId: fbPostId };
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
      if (post.first_comment && data.id) await postFirstComment(data.id, post.first_comment, access_token);
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
    if (post.first_comment && data.id) await postFirstComment(data.id, post.first_comment, access_token);
    return { success: true, externalId: data.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function publishToInstagram(post: any, creds: Record<string, string>): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { access_token, ig_account_id } = creds;
  if (!access_token || !ig_account_id) return { success: false, error: "Missing Instagram credentials" };

  try {
    if (!post.media_urls?.length) return { success: false, error: "Instagram requires media" };

    const isVideo = post.media_type === "video";
    const caption = buildCaption(post);

    // Carousel
    if (post.media_urls.length > 1 && !isVideo && post.post_type === "post") {
      const itemIds: string[] = [];
      for (const url of post.media_urls.slice(0, 10)) {
        const itemRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token }),
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
        if (post.first_comment && publishData.id) await postFirstComment(publishData.id, post.first_comment, access_token);
        return { success: true, externalId: publishData.id };
      }
    }

    // Single media container
    const containerBody: any = { caption, access_token };
    if (post.post_type === "reel") {
      containerBody.media_type = "REELS";
      containerBody.video_url = post.media_urls[0];
    } else if (isVideo && post.post_type !== "story") {
      containerBody.media_type = "VIDEO";
      containerBody.video_url = post.media_urls[0];
    } else if (post.post_type === "story") {
      containerBody.media_type = "STORIES";
      containerBody.image_url = post.media_urls[0];
    } else {
      // Feed post — explicitly set IMAGE type
      containerBody.media_type = "IMAGE";
      containerBody.image_url = post.media_urls[0];
    }

    console.log("Scheduled publish - Instagram container:", JSON.stringify({ post_type: post.post_type, media_type: containerBody.media_type, isVideo }));

    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    const containerData = await containerRes.json();
    if (containerData.error) return { success: false, error: containerData.error.message };

    if (isVideo || post.post_type === "reel") {
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerData.id}?fields=status_code&access_token=${access_token}`);
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") break;
        if (statusData.status_code === "ERROR") return { success: false, error: "Error procesando video en Instagram" };
        attempts++;
      }
    }

    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) return { success: false, error: publishData.error.message };

    // First comment on Instagram
    if (post.first_comment && publishData.id) {
      await postFirstComment(publishData.id, post.first_comment, access_token);
    }

    return { success: true, externalId: publishData.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getCredentials(supabase: any, clinicId: string): Promise<Record<string, string>> {
  let creds: Record<string, string> = {};

  const { data: socialConn } = await supabase
    .from("social_media_connections")
    .select("access_token, platform_account_id, platform")
    .eq("clinic_id", clinicId)
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

  if (!creds.access_token) {
    const { data: metaAccount } = await supabase
      .from("ads_accounts")
      .select("credentials")
      .eq("clinic_id", clinicId)
      .eq("platform", "meta")
      .eq("status", "connected")
      .single();
    if (metaAccount?.credentials) {
      creds = metaAccount.credentials as Record<string, string>;
    }
  }

  return creds;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find posts that are scheduled and due
    const now = new Date().toISOString();
    const { data: posts, error: fetchError } = await supabase
      .from("content_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to publish", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${posts.length} scheduled posts to publish`);
    const results: any[] = [];

    for (const post of posts) {
      const platformResults: Record<string, any> = {};
      const externalIds: Record<string, string> = {};

      const creds = await getCredentials(supabase, post.clinic_id);

      if (!creds.access_token) {
        console.error(`No credentials found for clinic ${post.clinic_id}, post ${post.id}`);
        await supabase.from("content_posts").update({
          status: "failed",
        }).eq("id", post.id);
        results.push({ postId: post.id, status: "failed", error: "No credentials" });
        continue;
      }

      for (const platform of (post.platforms || [])) {
        let result;
        switch (platform) {
          case "facebook":
            result = creds.page_id
              ? await publishToFacebook(post, creds)
              : { success: false, error: "No hay page_id de Facebook configurado" };
            break;
          case "instagram":
            result = creds.ig_account_id
              ? await publishToInstagram(post, creds)
              : { success: false, error: "No hay ig_account_id de Instagram configurado" };
            break;
          default:
            result = { success: false, error: `Platform ${platform} not yet supported` };
        }
        platformResults[platform] = result;
        if (result.success && result.externalId) externalIds[platform] = result.externalId;
        console.log(`Post ${post.id} -> ${platform}:`, JSON.stringify(result));
      }

      const anySucceeded = Object.values(platformResults).some((r: any) => r.success);

      await supabase.from("content_posts").update({
        status: anySucceeded ? "published" : "failed",
        published_at: anySucceeded ? new Date().toISOString() : null,
        external_ids: { ...((post.external_ids as any) || {}), ...externalIds },
      }).eq("id", post.id);

      results.push({ postId: post.id, status: anySucceeded ? "published" : "failed", platforms: platformResults });
    }

    return new Response(JSON.stringify({ message: "Publishing complete", processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-scheduled-posts error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
