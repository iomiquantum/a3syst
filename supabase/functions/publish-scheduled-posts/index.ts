import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChannelCredential {
  channel: string;
  credentials: Record<string, string>;
  is_active: boolean;
  clinic_id: string;
}

async function publishToFacebook(post: any, creds: Record<string, string>): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { access_token, page_id } = creds;
  if (!access_token || !page_id) return { success: false, error: "Missing Facebook credentials" };

  try {
    // If post has media, publish with photo
    if (post.media_urls?.length > 0 && post.media_type === "image") {
      const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: post.media_urls[0],
          message: buildCaption(post),
          access_token,
        }),
      });
      const data = await res.json();
      if (data.error) return { success: false, error: data.error.message };
      return { success: true, externalId: data.id || data.post_id };
    }

    // Text-only post
    const res = await fetch(`https://graph.facebook.com/v21.0/${page_id}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: buildCaption(post),
        link: post.link_url || undefined,
        access_token,
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
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

    // Step 1: Create media container
    const containerBody: any = {
      caption,
      access_token,
    };

    if (isVideo) {
      containerBody.media_type = "VIDEO";
      containerBody.video_url = post.media_urls[0];
    } else if (post.post_type === "story") {
      containerBody.media_type = "STORIES";
      containerBody.image_url = post.media_urls[0];
    } else if (post.post_type === "reel") {
      containerBody.media_type = "REELS";
      containerBody.video_url = post.media_urls[0];
    } else {
      containerBody.image_url = post.media_urls[0];
    }

    // Carousel for multiple images
    if (post.media_urls.length > 1 && !isVideo && post.post_type === "post") {
      // Create individual items
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
          body: JSON.stringify({
            media_type: "CAROUSEL",
            children: itemIds,
            caption,
            access_token,
          }),
        });
        const carouselData = await carouselRes.json();
        if (carouselData.error) return { success: false, error: carouselData.error.message };

        // Step 2: Publish
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

    // Single media
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    const containerData = await containerRes.json();
    if (containerData.error) return { success: false, error: containerData.error.message };

    // Wait for video processing if needed
    if (isVideo || post.post_type === "reel") {
      await new Promise((r) => setTimeout(r, 10000));
    }

    // Step 2: Publish
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) return { success: false, error: publishData.error.message };

    // Post first comment if exists
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

function buildCaption(post: any): string {
  let caption = post.body || "";
  if (post.hashtags?.length > 0) {
    caption += "\n\n" + post.hashtags.join(" ");
  }
  return caption;
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

    const results: any[] = [];

    for (const post of posts) {
      const platformResults: Record<string, any> = {};
      const externalIds: Record<string, string> = {};

      // Get channel credentials for this clinic
      const { data: allCreds } = await supabase
        .from("channel_credentials")
        .select("*")
        .eq("clinic_id", post.clinic_id)
        .eq("is_active", true)
        .eq("setup_completed", true);

      const credsByChannel = new Map<string, Record<string, string>>();
      (allCreds || []).forEach((c: ChannelCredential) => {
        credsByChannel.set(c.channel, c.credentials);
      });

      for (const platform of (post.platforms || [])) {
        const creds = credsByChannel.get(platform);
        if (!creds) {
          platformResults[platform] = { success: false, error: "No credentials configured" };
          continue;
        }

        let result;
        switch (platform) {
          case "facebook":
            result = await publishToFacebook(post, creds);
            break;
          case "instagram":
            result = await publishToInstagram(post, creds);
            break;
          default:
            result = { success: false, error: `Platform ${platform} not yet supported for auto-publish` };
        }

        platformResults[platform] = result;
        if (result.success && result.externalId) {
          externalIds[platform] = result.externalId;
        }
      }

      // Determine overall status
      const allSucceeded = Object.values(platformResults).every((r: any) => r.success);
      const anySucceeded = Object.values(platformResults).some((r: any) => r.success);

      const newStatus = allSucceeded ? "published" : anySucceeded ? "published" : "failed";

      await supabase
        .from("content_posts")
        .update({
          status: newStatus,
          published_at: anySucceeded ? new Date().toISOString() : null,
          external_ids: { ...((post.external_ids as any) || {}), ...externalIds },
        })
        .eq("id", post.id);

      results.push({ postId: post.id, status: newStatus, platforms: platformResults });
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
