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
  let tarea5Reminder1 = 0, tarea5Reminder2 = 0;

  // === ACQUIRE LOCK ===
  const { data: lockRow } = await supabase
    .from("pipeline_execution_lock")
    .update({ is_running: true, started_at: new Date().toISOString() })
    .eq("id", 1)
    .eq("is_running", false)
    .select()
    .maybeSingle();

  if (!lockRow) {
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

    // ========== TAREA 1: Inactivity timeout ==========
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
        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab").eq("id", conv.id).single();
        if (fresh?.pipeline_tab !== "resueltos_ia") continue;

        let contactDelay = c1Delay;
        const { data: clinicRule } = await supabase
          .from("clinic_pipeline_rules").select("rule_value")
          .eq("clinic_id", conv.clinic_id).eq("rule_key", "c1_delay_minutes").maybeSingle();
        if (clinicRule) contactDelay = Number(clinicRule.rule_value) || c1Delay;

        const nextContactAt = new Date(Date.now() + contactDelay * 60 * 1000).toISOString();
        await supabase.from("conversations").update({
          pipeline_tab: "seguimiento_c1",
          seguimiento_contact_number: 1,
          seguimiento_next_contact_at: nextContactAt,
          inactivity_timer_start: null,
        }).eq("id", conv.id);

        await supabase.from("conversation_pipeline_history").insert({
          conversation_id: conv.id, clinic_id: conv.clinic_id,
          from_tab: "resueltos_ia", to_tab: "seguimiento_c1",
          moved_by: "system", reason: `Inactividad de ${inactivityTimeout} minutos`,
        });
        tarea1Count++;
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 2: Follow-up messages (C1-C5) ==========
    console.log("[PIPELINE] TAREA 2: Sending follow-up messages...");
    const now = new Date().toISOString();
    const seguimientoTabs = ["seguimiento_c1", "seguimiento_c2", "seguimiento_c3", "seguimiento_c4", "seguimiento_c5"];
    const { data: followUpConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, contact_id, channel, visitor_contact")
      .in("pipeline_tab", seguimientoTabs)
      .not("seguimiento_next_contact_at", "is", null)
      .lt("seguimiento_next_contact_at", now);

    for (const conv of followUpConvs || []) {
      try {
        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab, seguimiento_contact_number").eq("id", conv.id).single();
        if (!fresh || !fresh.pipeline_tab?.startsWith("seguimiento_c")) continue;

        const contactNumber = fresh.seguimiento_contact_number || conv.seguimiento_contact_number || 1;
        const { data: autoMsg } = await supabase
          .from("seguimiento_auto_messages").select("message_template, is_active, is_automatic")
          .eq("clinic_id", conv.clinic_id).eq("contact_number", contactNumber).maybeSingle();

        // Determine if we should send a message
        const shouldSendMessage = autoMsg?.is_active && autoMsg?.is_automatic && autoMsg?.message_template;

        if (shouldSendMessage) {
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: recentAutoMsgs } = await supabase
            .from("messages").select("id, content, created_at")
            .eq("conversation_id", conv.id).eq("direction", "outbound")
            .gt("created_at", thirtyMinAgo).order("created_at", { ascending: false }).limit(3);

          let contactName = "cliente";
          if (conv.contact_id) {
            const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
            if (contact?.name) contactName = contact.name.split(" ")[0];
          }

          const messageContent = (autoMsg.message_template || "").replace(/\{\{nombre\}\}/g, contactName);
          if (!recentAutoMsgs?.some(m => m.content === messageContent)) {
            const channel = conv.channel || "whatsapp";
            if (channel === "whatsapp" && conv.visitor_contact) {
              const sendResp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
                body: JSON.stringify({ clinic_id: conv.clinic_id, to_number: conv.visitor_contact, message_type: "text", content: messageContent, conversation_id: conv.id }),
              });
              if (!sendResp.ok) {
                console.error(`[PIPELINE] WhatsApp send failed for conv ${conv.id}`);
              }
            } else {
              await supabase.from("messages").insert({
                conversation_id: conv.id, clinic_id: conv.clinic_id,
                direction: "outbound", content: messageContent, message_type: "text", status: "sent",
              });
            }
            tarea2Sent++;
            console.log(`[PIPELINE] C${contactNumber} message sent for conv ${conv.id}`);
          }
        } else {
          console.log(`[PIPELINE] No auto message for conv ${conv.id} (clinic ${conv.clinic_id}, contact ${contactNumber}), advancing pipeline without sending`);
        }

        // Always advance pipeline regardless of whether message was sent
        const nextContactNumber = contactNumber + 1;
        if (nextContactNumber > maxAutoContacts) {
          await supabase.from("conversations").update({ pipeline_tab: "no_responden", seguimiento_next_contact_at: null, seguimiento_last_contact_at: now }).eq("id", conv.id);
          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: `seguimiento_c${contactNumber}`, to_tab: "no_responden",
            moved_by: "system", reason: `Sin respuesta después de ${maxAutoContacts} contactos`,
          });
          tarea2NoResponden++;
        } else {
          const nextDelay = delayMap[nextContactNumber] || c3Delay;
          const { data: clinicDelay } = await supabase
            .from("clinic_pipeline_rules").select("rule_value")
            .eq("clinic_id", conv.clinic_id).eq("rule_key", `c${nextContactNumber}_delay_minutes`).maybeSingle();
          const actualDelay = clinicDelay ? Number(clinicDelay.rule_value) || nextDelay : nextDelay;

          await supabase.from("conversations").update({
            pipeline_tab: `seguimiento_c${nextContactNumber}`,
            seguimiento_contact_number: nextContactNumber,
            seguimiento_next_contact_at: new Date(Date.now() + actualDelay * 60 * 1000).toISOString(),
            seguimiento_last_contact_at: now,
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: `seguimiento_c${contactNumber}`, to_tab: `seguimiento_c${nextContactNumber}`,
            moved_by: "system", reason: shouldSendMessage ? `Seguimiento automático C${contactNumber} enviado` : `Avance automático C${contactNumber} (sin mensaje configurado)`,
          });
        }
        if (shouldSendMessage) {
          await supabase.from("conversations").update({ last_message_at: now }).eq("id", conv.id);
        }
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
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
        await supabase.from("conversations").update({
          seguimiento_next_contact_at: new Date(new Date(base).getTime() + delay * 60 * 1000).toISOString(),
        }).eq("id", conv.id);
        tarea3Fixed++;
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 5: APPOINTMENT REMINDERS ==========
    console.log("[PIPELINE] TAREA 5: Appointment reminders...");

    // Get all clinics with reminder configs
    const { data: reminderConfigs } = await supabase
      .from("appointment_reminder_config")
      .select("*")
      .eq("is_active", true);

    if (reminderConfigs && reminderConfigs.length > 0) {
      // Group by clinic
      const configByClinic: Record<string, any[]> = {};
      for (const rc of reminderConfigs) {
        if (!configByClinic[rc.clinic_id]) configByClinic[rc.clinic_id] = [];
        configByClinic[rc.clinic_id].push(rc);
      }

      const nowDate = new Date();

      // REMINDER 1
      const { data: reminder1Convs } = await supabase
        .from("conversations")
        .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed")
        .eq("pipeline_tab", "agendados")
        .eq("appointment_reminder_1_sent", false)
        .not("appointment_date", "is", null)
        .gt("appointment_date", nowDate.toISOString());

      for (const conv of reminder1Convs || []) {
        try {
          if (conv.appointment_confirmed) continue; // Already confirmed, skip
          
          const clinicConfigs = configByClinic[conv.clinic_id];
          const r1Config = clinicConfigs?.find((c: any) => c.reminder_number === 1);
          if (!r1Config) continue;

          const appointmentDate = new Date(conv.appointment_date);
          const hoursUntil = (appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
          if (hoursUntil > r1Config.hours_before_appointment) continue; // Too early

          // Get contact name
          let contactName = "cliente";
          if (conv.contact_id) {
            const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
            if (contact?.name) contactName = contact.name.split(" ")[0];
          }

          const fecha = appointmentDate.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
          const hora = conv.appointment_time || appointmentDate.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
          const servicio = conv.appointment_service || "tu cita";

          const message = (r1Config.message_template || "")
            .replace(/\{\{nombre\}\}/g, contactName)
            .replace(/\{\{fecha\}\}/g, fecha)
            .replace(/\{\{hora\}\}/g, hora)
            .replace(/\{\{servicio\}\}/g, servicio);

          // Send
          if (conv.channel === "whatsapp" && conv.visitor_contact) {
            await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
              body: JSON.stringify({ clinic_id: conv.clinic_id, to_number: conv.visitor_contact, message_type: "text", content: message, conversation_id: conv.id }),
            });
          } else {
            await supabase.from("messages").insert({
              conversation_id: conv.id, clinic_id: conv.clinic_id,
              direction: "outbound", content: message, message_type: "text", status: "sent",
            });
          }

          await supabase.from("conversations").update({
            appointment_reminder_1_sent: true,
            appointment_reminder_1_sent_at: nowDate.toISOString(),
            appointment_status: "reminder_1_sent",
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: "agendados", to_tab: "agendados",
            moved_by: "system", reason: "Recordatorio 1 enviado",
          });

          tarea5Reminder1++;
          console.log(`[APPOINTMENT] Recordatorio 1 enviado para conv ${conv.id}`);
        } catch (e) {
          errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
        }
      }

      // REMINDER 2
      const { data: reminder2Convs } = await supabase
        .from("conversations")
        .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed")
        .eq("pipeline_tab", "agendados")
        .eq("appointment_reminder_1_sent", true)
        .eq("appointment_reminder_2_sent", false)
        .eq("appointment_confirmed", false)
        .not("appointment_date", "is", null)
        .gt("appointment_date", nowDate.toISOString());

      for (const conv of reminder2Convs || []) {
        try {
          const clinicConfigs = configByClinic[conv.clinic_id];
          const r2Config = clinicConfigs?.find((c: any) => c.reminder_number === 2);
          if (!r2Config) continue;

          const appointmentDate = new Date(conv.appointment_date);
          const hoursUntil = (appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
          if (hoursUntil > r2Config.hours_before_appointment) continue;

          let contactName = "cliente";
          if (conv.contact_id) {
            const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
            if (contact?.name) contactName = contact.name.split(" ")[0];
          }

          const fecha = appointmentDate.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
          const hora = conv.appointment_time || appointmentDate.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
          const servicio = conv.appointment_service || "tu cita";

          const message = (r2Config.message_template || "")
            .replace(/\{\{nombre\}\}/g, contactName)
            .replace(/\{\{fecha\}\}/g, fecha)
            .replace(/\{\{hora\}\}/g, hora)
            .replace(/\{\{servicio\}\}/g, servicio);

          if (conv.channel === "whatsapp" && conv.visitor_contact) {
            await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
              body: JSON.stringify({ clinic_id: conv.clinic_id, to_number: conv.visitor_contact, message_type: "text", content: message, conversation_id: conv.id }),
            });
          } else {
            await supabase.from("messages").insert({
              conversation_id: conv.id, clinic_id: conv.clinic_id,
              direction: "outbound", content: message, message_type: "text", status: "sent",
            });
          }

          await supabase.from("conversations").update({
            appointment_reminder_2_sent: true,
            appointment_reminder_2_sent_at: nowDate.toISOString(),
            appointment_status: "reminder_2_sent",
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: "agendados", to_tab: "agendados",
            moved_by: "system", reason: "Recordatorio 2 enviado",
          });

          tarea5Reminder2++;
          console.log(`[APPOINTMENT] Recordatorio 2 enviado para conv ${conv.id}`);
        } catch (e) {
          errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }

  } finally {
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
    tarea5_reminder1_sent: tarea5Reminder1,
    tarea5_reminder2_sent: tarea5Reminder2,
    errors,
  };

  await supabase.from("pipeline_execution_log").insert({
    moved_to_c1: tarea1Count,
    messages_sent: tarea2Sent,
    moved_to_no_responden: tarea2NoResponden,
    inconsistencies_fixed: tarea3Fixed,
    errors: errors.length > 0 ? JSON.stringify(errors) : "[]",
    duration_ms: Date.now() - startTime,
  });

  console.log("[PIPELINE] Execution complete:", JSON.stringify(result));
  return jsonResponse(result);
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
