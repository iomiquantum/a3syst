import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory rate limiter (per isolate lifetime)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { clinic_id, name, email, phone, message, conversation_id: existingConvId, _hp, _ts } = body;

    // --- Security checks ---

    // 1. Honeypot: if _hp field is filled, it's a bot
    if (_hp) {
      // Return fake success to not reveal detection
      return new Response(JSON.stringify({
        success: true,
        conversation_id: "00000000-0000-0000-0000-000000000000",
        contact_id: "00000000-0000-0000-0000-000000000000",
        message_id: "00000000-0000-0000-0000-000000000000",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Timestamp check: reject if message is older than 5 minutes or in the future
    if (_ts) {
      const now = Date.now();
      const diff = now - Number(_ts);
      if (diff < -10_000 || diff > 300_000) {
        return new Response(JSON.stringify({ error: "Solicitud expirada. Recarga la página." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. Rate limiting by clinic + IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `${clinic_id}:${clientIP}`;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(JSON.stringify({ error: "Demasiados mensajes. Espera un momento." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Validation ---
    if (!clinic_id || !message) {
      return new Response(JSON.stringify({ error: "clinic_id and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit message length
    const sanitizedMessage = String(message).substring(0, 2000);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let conversation: any = null;
    let contact: any = null;

    // If we already have a conversation_id, use it directly (reply flow)
    if (existingConvId) {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", existingConvId)
        .eq("clinic_id", clinic_id)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", existingConv.contact_id)
          .maybeSingle();
        contact = existingContact;
      }
    }

    // If no existing conversation found, find/create contact and conversation (initial flow)
    if (!conversation) {
      if (!name) {
        return new Response(JSON.stringify({ error: "name is required for initial message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sanitizedName = String(name).substring(0, 200);
      const sanitizedEmail = email ? String(email).substring(0, 300) : "";
      const sanitizedPhone = phone ? String(phone).substring(0, 20) : "";

      // Find or create contact by email or phone
      if (sanitizedEmail) {
        const { data } = await supabase
          .from("contacts")
          .select("*")
          .eq("clinic_id", clinic_id)
          .eq("email", sanitizedEmail)
          .maybeSingle();
        contact = data;
      }
      if (!contact && sanitizedPhone) {
        const { data } = await supabase
          .from("contacts")
          .select("*")
          .eq("clinic_id", clinic_id)
          .eq("phone", sanitizedPhone)
          .maybeSingle();
        contact = data;
      }

      if (!contact) {
        const { data, error } = await supabase.from("contacts").insert({
          clinic_id,
          name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          source: "web_widget",
          funnel_stage: "nuevos",
        }).select().single();
        if (error) throw error;
        contact = data;
      } else if (sanitizedPhone && contact.phone !== sanitizedPhone) {
        // Update phone if it changed (e.g. now includes country code)
        await supabase.from("contacts").update({ phone: sanitizedPhone }).eq("id", contact.id);
      }

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("contact_id", contact.id)
        .eq("channel", "web_widget")
        .eq("archived", false)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data, error } = await supabase.from("conversations").insert({
          clinic_id,
          contact_id: contact.id,
          channel: "web_widget",
          status: "open",
          chatbot_active: true,
          pipeline_tab: "resueltos_ia",
        }).select().single();
        if (error) throw error;
        conversation = data;
      }
    }

    // Insert message
    const { data: msg, error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      clinic_id,
      direction: "inbound",
      content: sanitizedMessage,
      message_type: "text",
      status: "delivered",
    }).select().single();
    if (msgError) throw msgError;

    // Update conversation
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: sanitizedMessage.substring(0, 100),
      unread_count: (conversation.unread_count || 0) + 1,
      last_inbound_at: new Date().toISOString(),
    }).eq("id", conversation.id);

    // === PIPELINE: Handle inbound message transitions ===
    await handleIncomingMessagePipeline(supabase, conversation.id, clinic_id);

    return new Response(JSON.stringify({
      success: true,
      conversation_id: conversation.id,
      contact_id: contact?.id,
      message_id: msg.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function handleIncomingMessagePipeline(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  clinicId: string,
) {
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("pipeline_tab, seguimiento_is_recurrente, seguimiento_recurrente_count, seguimiento_contact_number, inactivity_timer_start")
      .eq("id", conversationId)
      .single();

    if (!conv) return;
    const tab = conv.pipeline_tab || "resueltos_ia";

    if (tab === "no_responden") {
      const newCount = (conv.seguimiento_recurrente_count || 0) + 1;
      await supabase.from("conversations").update({
        pipeline_tab: "resueltos_ia",
        seguimiento_is_recurrente: true,
        seguimiento_recurrente_count: newCount,
        seguimiento_contact_number: 0,
        seguimiento_next_contact_at: null,
        inactivity_timer_start: null,
      }).eq("id", conversationId);
      await supabase.from("conversation_pipeline_history").insert({
        conversation_id: conversationId, clinic_id: clinicId,
        from_tab: "no_responden", to_tab: "resueltos_ia",
        moved_by: "system", reason: `Cliente respondió - seguimiento recurrente #${newCount}`,
      });
      console.log(`[PIPELINE] Widget: no_responden → resueltos_ia (recurrente #${newCount})`);

    } else if (tab.startsWith("seguimiento_c")) {
      const wasRecurrente = conv.seguimiento_is_recurrente;
      const newCount = wasRecurrente ? (conv.seguimiento_recurrente_count || 0) + 1 : 1;
      await supabase.from("conversations").update({
        pipeline_tab: "resueltos_ia",
        seguimiento_is_recurrente: true,
        seguimiento_recurrente_count: newCount,
        seguimiento_contact_number: 0,
        seguimiento_next_contact_at: null,
        inactivity_timer_start: null,
      }).eq("id", conversationId);
      await supabase.from("conversation_pipeline_history").insert({
        conversation_id: conversationId, clinic_id: clinicId,
        from_tab: tab, to_tab: "resueltos_ia",
        moved_by: "system", reason: `Cliente respondió durante seguimiento ${tab.replace("seguimiento_", "").toUpperCase()}`,
      });
      console.log(`[PIPELINE] Widget: ${tab} → resueltos_ia`);

    } else if (tab === "resueltos_ia" && conv.inactivity_timer_start) {
      await supabase.from("conversations").update({ inactivity_timer_start: null }).eq("id", conversationId);
      console.log(`[PIPELINE] Widget: inactivity timer reset for conv ${conversationId}`);

    } else if (["no_interesado", "clientes", "escalados"].includes(tab)) {
      console.log(`[PIPELINE] Widget: message in sticky state '${tab}', no move`);
    }
  } catch (err) {
    console.error("[PIPELINE] handleIncomingMessagePipeline error:", err);
  }
}
  }
});
