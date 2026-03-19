import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const errors: { conversation_id: string; error: string }[] = [];
  let tarea1Count = 0, tarea2Sent = 0, tarea2NoResponden = 0, tarea3Fixed = 0;

  // === ACQUIRE LOCK ===
  const { data: lockRow } = await supabase
    .from("pipeline_execution_lock")
    .update({ is_running: true, started_at: new Date().toISOString() })
    .eq("id", 1)
    .eq("is_running", false)
    .select()
    .maybeSingle();

  if (!lockRow) {
    // Check for stale lock (>10 min)
    const { data: staleLock } = await supabase
      .from("pipeline_execution_lock")
      .select("started_at")
      .eq("id", 1)
      .eq("is_running", true)
      .single();

    if (staleLock?.started_at) {
      const elapsed = Date.now() - new Date(staleLock.started_at).getTime();
      if (elapsed > 10 * 60 * 1000) {
        console.warn("[PIPELINE] Stale lock detected, forcing unlock");
        await supabase.from("pipeline_execution_lock").update({ is_running: true, started_at: new Date().toISOString() }).eq("id", 1);
      } else {
        return jsonResponse({ status: "skipped", reason: "another execution in progress" });
      }
    } else {
      return jsonResponse({ status: "skipped", reason: "lock acquisition failed" });
    }
  }

  try {
    // === LOAD GLOBAL RULES ===
    const { data: rulesRows } = await supabase.from("pipeline_global_rules").select("rule_key, rule_value");
    const rules: Record<string, number> = {};
    (rulesRows || []).forEach((r: { rule_key: string; rule_value: unknown }) => {
      rules[r.rule_key] = typeof r.rule_value === "number" ? r.rule_value : Number(r.rule_value) || 0;
    });
    const inactivityTimeout = rules["inactivity_timeout_minutes"] || 30;
    const maxAutoContacts = rules["max_auto_contacts"] || 3;
    const c1Delay = rules["c1_delay_minutes"] || 60;
    const c2Delay = rules["c2_delay_minutes"] || 240;
    const c3Delay = rules["c3_delay_minutes"] || 720;
    const delayMap: Record<number, number> = { 1: c1Delay, 2: c2Delay, 3: c3Delay };

    // ========== TAREA 1: Inactivity timeout (resueltos_ia → seguimiento_c1) ==========
    console.log("[PIPELINE] TAREA 1: Checking inactivity timeout...");

    const cutoff = new Date(Date.now() - inactivityTimeout * 60 * 1000).toISOString();
    const { data: inactiveConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, inactivity_timer_start")
      .eq("pipeline_tab", "resueltos_ia")
      .eq("chatbot_active", true)
      .not("inactivity_timer_start", "is", null)
      .lt("inactivity_timer_start", cutoff);

    for (const conv of inactiveConvs || []) {
      try {
        // Re-verify state
        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab").eq("id", conv.id).single();
        if (fresh?.pipeline_tab !== "resueltos_ia") {
          console.log(`[PIPELINE] Conv ${conv.id} no longer in resueltos_ia, skipping`);
          continue;
        }

        // Get clinic-specific C1 delay or use global
        let contactDelay = c1Delay;
        const { data: clinicRule } = await supabase
          .from("clinic_pipeline_rules")
          .select("rule_value")
          .eq("clinic_id", conv.clinic_id)
          .eq("rule_key", "c1_delay_minutes")
          .maybeSingle();
        if (clinicRule) contactDelay = Number(clinicRule.rule_value) || c1Delay;

        const nextContactAt = new Date(Date.now() + contactDelay * 60 * 1000).toISOString();

        await supabase.from("conversations").update({
          pipeline_tab: "seguimiento_c1",
          seguimiento_contact_number: 1,
          seguimiento_next_contact_at: nextContactAt,
          inactivity_timer_start: null,
        }).eq("id", conv.id);

        await supabase.from("conversation_pipeline_history").insert({
          conversation_id: conv.id,
          clinic_id: conv.clinic_id,
          from_tab: "resueltos_ia",
          to_tab: "seguimiento_c1",
          moved_by: "system",
          reason: `Inactividad de ${inactivityTimeout} minutos`,
        });

        tarea1Count++;
        console.log(`[PIPELINE] Conv ${conv.id} moved resueltos_ia → seguimiento_c1`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ conversation_id: conv.id, error: msg });
        console.error(`[PIPELINE] Error processing conv ${conv.id}:`, msg);
      }
    }

    // ========== TAREA 2: Send follow-up messages (C1, C2, C3) ==========
    console.log("[PIPELINE] TAREA 2: Sending follow-up messages...");

    const now = new Date().toISOString();
    const { data: followUpConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, contact_id, channel, visitor_contact")
      .in("pipeline_tab", ["seguimiento_c1", "seguimiento_c2", "seguimiento_c3"])
      .not("seguimiento_next_contact_at", "is", null)
      .lt("seguimiento_next_contact_at", now);

    for (const conv of followUpConvs || []) {
      try {
        // Re-verify state
        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab, seguimiento_contact_number").eq("id", conv.id).single();
        if (!fresh || !fresh.pipeline_tab?.startsWith("seguimiento_c")) {
          console.log(`[PIPELINE] Conv ${conv.id} no longer in seguimiento, skipping`);
          continue;
        }

        const contactNumber = fresh.seguimiento_contact_number || conv.seguimiento_contact_number || 1;

        // Check if auto message is active for this clinic + contact_number
        const { data: autoMsg } = await supabase
          .from("seguimiento_auto_messages")
          .select("message_template, is_active, is_automatic")
          .eq("clinic_id", conv.clinic_id)
          .eq("contact_number", contactNumber)
          .maybeSingle();

        if (!autoMsg || !autoMsg.is_active) {
          console.log(`[PIPELINE] Conv ${conv.id} C${contactNumber} is_active=false, skipping message`);
          continue;
        }

        // Anti-duplicate: check last message isn't a pipeline auto message for same contact_number in last 30 min
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: recentAutoMsgs } = await supabase
          .from("messages")
          .select("id, content, created_at")
          .eq("conversation_id", conv.id)
          .eq("direction", "outbound")
          .gt("created_at", thirtyMinAgo)
          .order("created_at", { ascending: false })
          .limit(3);

        // Simple duplicate check: if the most recent outbound message contains the same template text, skip
        const template = autoMsg.message_template || "";
        
        // Get contact name
        let contactName = "cliente";
        if (conv.contact_id) {
          const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
          if (contact?.name) contactName = contact.name.split(" ")[0]; // First name
        }

        const messageContent = template.replace(/\{\{nombre\}\}/g, contactName);

        // Check duplicate
        if (recentAutoMsgs?.some(m => m.content === messageContent)) {
          console.log(`[PIPELINE] Conv ${conv.id} duplicate C${contactNumber} message detected, skipping`);
          continue;
        }

        // === SEND THE MESSAGE ===
        const channel = conv.channel || "whatsapp";
        if (channel === "whatsapp" && conv.visitor_contact) {
          // Send via whatsapp-send edge function
          const sendResp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clinic_id: conv.clinic_id,
              to_number: conv.visitor_contact,
              message_type: "text",
              content: messageContent,
              conversation_id: conv.id,
            }),
          });
          const sendResult = await sendResp.json().catch(() => null);
          if (!sendResp.ok || sendResult?.error) {
            throw new Error(`WhatsApp send failed: ${JSON.stringify(sendResult)}`);
          }
          console.log(`[PIPELINE] WhatsApp C${contactNumber} sent to conv ${conv.id}`);
        } else {
          // Direct insert for non-WhatsApp
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            clinic_id: conv.clinic_id,
            direction: "outbound",
            content: messageContent,
            message_type: "text",
            status: "sent",
          });
        }

        tarea2Sent++;

        // Move to next stage or no_responden
        const nextContactNumber = contactNumber + 1;
        if (nextContactNumber > maxAutoContacts) {
          // Move to no_responden
          await supabase.from("conversations").update({
            pipeline_tab: "no_responden",
            seguimiento_next_contact_at: null,
            seguimiento_last_contact_at: now,
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id,
            clinic_id: conv.clinic_id,
            from_tab: `seguimiento_c${contactNumber}`,
            to_tab: "no_responden",
            moved_by: "system",
            reason: `Sin respuesta después de ${maxAutoContacts} contactos`,
          });

          tarea2NoResponden++;
          console.log(`[PIPELINE] Conv ${conv.id} → no_responden after C${contactNumber}`);
        } else {
          // Move to next contact
          const nextDelay = delayMap[nextContactNumber] || c3Delay;
          // Check clinic override
          const { data: clinicDelay } = await supabase
            .from("clinic_pipeline_rules")
            .select("rule_value")
            .eq("clinic_id", conv.clinic_id)
            .eq("rule_key", `c${nextContactNumber}_delay_minutes`)
            .maybeSingle();
          const actualDelay = clinicDelay ? Number(clinicDelay.rule_value) || nextDelay : nextDelay;

          await supabase.from("conversations").update({
            pipeline_tab: `seguimiento_c${nextContactNumber}`,
            seguimiento_contact_number: nextContactNumber,
            seguimiento_next_contact_at: new Date(Date.now() + actualDelay * 60 * 1000).toISOString(),
            seguimiento_last_contact_at: now,
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id,
            clinic_id: conv.clinic_id,
            from_tab: `seguimiento_c${contactNumber}`,
            to_tab: `seguimiento_c${nextContactNumber}`,
            moved_by: "system",
            reason: `Seguimiento automático C${contactNumber} enviado`,
          });

          console.log(`[PIPELINE] Conv ${conv.id} moved C${contactNumber} → C${nextContactNumber}`);
        }

        // Update last_message_at
        await supabase.from("conversations").update({ last_message_at: now }).eq("id", conv.id);

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ conversation_id: conv.id, error: msg });
        console.error(`[PIPELINE] Error on conv ${conv.id}:`, msg);
      }
    }

    // ========== TAREA 3: Cleanup inconsistencies ==========
    console.log("[PIPELINE] TAREA 3: Cleanup...");

    const { data: inconsistent } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, seguimiento_last_contact_at")
      .like("pipeline_tab", "seguimiento_%")
      .is("seguimiento_next_contact_at", null);

    for (const conv of inconsistent || []) {
      try {
        const cn = conv.seguimiento_contact_number || 1;
        const delay = delayMap[cn] || c1Delay;
        const base = conv.seguimiento_last_contact_at || new Date().toISOString();
        const recalculated = new Date(new Date(base).getTime() + delay * 60 * 1000).toISOString();

        await supabase.from("conversations").update({
          seguimiento_next_contact_at: recalculated,
        }).eq("id", conv.id);

        tarea3Fixed++;
        console.warn(`[PIPELINE WARNING] Conv ${conv.id} had null next_contact_at, recalculated`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ conversation_id: conv.id, error: msg });
      }
    }

  } finally {
    // === RELEASE LOCK ===
    await supabase.from("pipeline_execution_lock").update({
      is_running: false,
      last_completed_at: new Date().toISOString(),
    }).eq("id", 1);
  }

  const result = {
    executed_at: new Date().toISOString(),
    tarea1_moved_to_c1: tarea1Count,
    tarea2_messages_sent: tarea2Sent,
    tarea2_moved_to_no_responden: tarea2NoResponden,
    tarea3_inconsistencies_fixed: tarea3Fixed,
    errors,
  };

  console.log("[PIPELINE] Execution complete:", JSON.stringify(result));
  return jsonResponse(result);
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
