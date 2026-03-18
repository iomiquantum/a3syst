import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, clinic_id, triggered_by = "manual", channel: requestChannel } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const isManualTrigger = triggered_by === "manual";

    // Fetch AI agent config for this clinic
    const { data: agentConfig } = await supabase
      .from("ai_agent_config")
      .select("*")
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (!agentConfig || !agentConfig.enabled) {
      return new Response(JSON.stringify({ error: "AI agent not configured or disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id, channel, visitor_contact, contact_id, chatbot_active")
      .eq("id", conversation_id)
      .eq("clinic_id", clinic_id)
      .single();

    if (conversationError || !conversationData) throw conversationError || new Error("Conversation not found");

    if (!isManualTrigger) {
      const { data: claimed, error: claimError } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id)
        .eq("clinic_id", clinic_id)
        .eq("chatbot_active", true)
        .select("id")
        .single();

      if (claimError || !claimed) {
        return new Response(JSON.stringify({ skipped: true, reason: "claim failed or chatbot inactive" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: latestInbound } = await supabase
        .from("messages")
        .select("created_at")
        .eq("conversation_id", conversation_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: latestOutbound } = await supabase
        .from("messages")
        .select("created_at")
        .eq("conversation_id", conversation_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestInbound?.[0] && latestOutbound?.[0]) {
        const inboundTime = new Date(latestInbound[0].created_at).getTime();
        const outboundTime = new Date(latestOutbound[0].created_at).getTime();
        if (outboundTime > inboundTime) {
          return new Response(JSON.stringify({ skipped: true, reason: "already replied" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch recent messages for context (last 6 to save tokens)
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("direction, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(6);

    // Reverse to chronological order
    if (recentMessages) recentMessages.reverse();

    // Build system prompt from agent config
    const services = (agentConfig.services || []) as { name: string; price: string; description: string }[];
    const langLabel = agentConfig.language === "es" ? "Español" : agentConfig.language === "en" ? "English" : "Português";

    let systemPrompt = `Eres "${agentConfig.agent_name}", un asistente virtual del negocio.
Idioma: ${langLabel}
Tono: ${agentConfig.tone}

OBJETIVO:
${agentConfig.objective}

SERVICIOS DISPONIBLES:
${services.map(s => `• ${s.name} — $${s.price} — ${s.description}`).join("\n") || "(sin servicios configurados)"}`;

    // Add health/clinic specific fields if populated
    if (agentConfig.treatments_text) {
      systemPrompt += `\n\nTRATAMIENTOS DISPONIBLES:\n${agentConfig.treatments_text}`;
    }
    if (agentConfig.prices_text) {
      systemPrompt += `\n\nPRECIOS / RANGOS DE PRECIOS:\n${agentConfig.prices_text}`;
    }
    if (agentConfig.locations_text) {
      systemPrompt += `\n\nUBICACIONES / SUCURSALES:\n${agentConfig.locations_text}`;
    }
    if (agentConfig.professionals_text) {
      systemPrompt += `\n\nPROFESIONALES / ESPECIALISTAS:\n${agentConfig.professionals_text}`;
    }

    systemPrompt += `\n\nINSTRUCCIONES ESPECIALES:\n${agentConfig.special_instructions}

IMPORTANTE:
- Responde de forma breve y directa (máximo 2-3 oraciones).
- Usa emojis con moderación.
- Si no sabes algo, sugiere contactar al negocio directamente.
- Nunca inventes información sobre servicios o precios que no estén listados arriba.`;

    // Fetch channel-specific instructions
    const resolvedChannel = requestChannel || conversationData.channel || "web_chat";
    const { data: channelPrompt } = await supabase
      .from("ai_agent_channel_prompts")
      .select("*")
      .eq("clinic_id", clinic_id)
      .eq("channel", resolvedChannel)
      .eq("enabled", true)
      .maybeSingle();

    if (channelPrompt && channelPrompt.additional_prompt) {
      systemPrompt += `\n\n=== INSTRUCCIONES ESPECÍFICAS PARA ESTE CANAL ===\n${channelPrompt.additional_prompt}`;
    }
    if (channelPrompt && channelPrompt.max_response_length) {
      systemPrompt += `\n\nIMPORTANTE: Responde en máximo ${channelPrompt.max_response_length} caracteres.`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(recentMessages || []).map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta.";
    const usage = aiData.usage || {};
    const tokensInput = usage.prompt_tokens || 0;
    const tokensOutput = usage.completion_tokens || 0;
    const modelUsed = aiData.model || "google/gemini-3-flash-preview";

    let savedMsg: unknown = null;

    if (conversationData.channel === "whatsapp") {
      let toNumber = conversationData.visitor_contact;

      if (!toNumber && conversationData.contact_id) {
        const { data: contactData } = await supabase
          .from("contacts")
          .select("phone")
          .eq("id", conversationData.contact_id)
          .maybeSingle();

        toNumber = contactData?.phone || null;
      }

      if (!toNumber) {
        throw new Error("WhatsApp conversation has no destination phone number");
      }

      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id,
          to_number: toNumber,
          message_type: "text",
          content: reply,
        }),
      });

      const sendPayload = await sendResponse.json().catch(() => null);
      console.log("AI reply delivery response:", JSON.stringify(sendPayload));

      if (!sendResponse.ok || sendPayload?.error) {
        throw new Error(`WhatsApp send failed: ${JSON.stringify(sendPayload || { status: sendResponse.status })}`);
      }

      savedMsg = sendPayload;
    } else {
      const { data: insertedMessage, error: msgError } = await supabase.from("messages").insert({
        conversation_id,
        clinic_id,
        direction: "outbound",
        content: reply,
        message_type: "text",
        status: "sent",
      }).select().single();

      if (msgError) throw msgError;
      savedMsg = insertedMessage;

      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: reply.substring(0, 100),
      }).eq("id", conversation_id);
    }

    // Log usage to ai_agent_usage
    await supabase.from("ai_agent_usage").insert({
      clinic_id,
      conversation_id,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      model: modelUsed,
      triggered_by: triggered_by || "manual",
    });

    // Also log to ai_token_usage for unified cost tracking
    const costUsd = estimateTokenCost(modelUsed, tokensInput, tokensOutput);
    await supabase.from("ai_token_usage").insert({
      clinic_id,
      user_id: null,
      generator_type: "agent",
      model: modelUsed,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_usd: costUsd,
      action_label: `Respuesta automática agente`,
    });

    return new Response(JSON.stringify({ reply, message: savedMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-agent-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function estimateTokenCost(model: string, tokensInput: number, tokensOutput: number): number {
  const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    "gemini-3-flash-preview": { input: 0.15, output: 0.60 },
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "gemini-2.5-pro": { input: 1.25, output: 10.0 },
    "gemini-3-pro-preview": { input: 1.25, output: 10.0 },
  };
  const modelKey = model.split("/").pop() || model;
  const pricing = MODEL_PRICING[modelKey];
  if (!pricing) return (tokensInput * 0.15 + tokensOutput * 0.60) / 1_000_000;
  return (tokensInput * pricing.input + tokensOutput * pricing.output) / 1_000_000;
}
