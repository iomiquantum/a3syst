import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const LOCK_STALE_MS = 4 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getDateTimePartsInTz(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

function shiftLocalDate(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const desiredMs = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let i = 0; i < 4; i++) {
    const current = getDateTimePartsInTz(new Date(utcMs), timeZone);
    const currentMs = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
      current.second,
    );
    const diff = desiredMs - currentMs;
    utcMs += diff;
    if (diff === 0) break;
  }

  return new Date(utcMs);
}

function getNowHourInTz(tz: string): number {
  try {
    return getDateTimePartsInTz(new Date(), tz).hour;
  } catch {
    return new Date().getUTCHours();
  }
}

function getNextWindowStart(tz: string, startHour: number, from = new Date()): Date {
  const localNow = getDateTimePartsInTz(from, tz);
  const targetDate = localNow.hour >= startHour
    ? shiftLocalDate(localNow.year, localNow.month, localNow.day, 1)
    : { year: localNow.year, month: localNow.month, day: localNow.day };

  return zonedTimeToUtc(tz, targetDate.year, targetDate.month, targetDate.day, startHour, 0, 0);
}

function getScheduledContactTime(
  tz: string,
  delayMinutes: number,
  sendWindowStart: number,
  sendWindowEnd: number,
  from = new Date(),
): Date {
  const localNow = getDateTimePartsInTz(from, tz);
  let effectiveLocalMs = Date.UTC(
    localNow.year, localNow.month - 1, localNow.day,
    localNow.hour, localNow.minute, localNow.second,
  );

  if (localNow.hour >= sendWindowEnd) {
    const nextDay = shiftLocalDate(localNow.year, localNow.month, localNow.day, 1);
    effectiveLocalMs = Date.UTC(nextDay.year, nextDay.month - 1, nextDay.day, sendWindowStart, 0, 0);
  } else if (localNow.hour < sendWindowStart) {
    effectiveLocalMs = Date.UTC(localNow.year, localNow.month - 1, localNow.day, sendWindowStart, 0, 0);
  }

  const tentativeMs = effectiveLocalMs + delayMinutes * 60 * 1000;
  const tentative = new Date(tentativeMs);
  const tHour = tentative.getUTCHours();

  if (tHour >= sendWindowStart && tHour < sendWindowEnd) {
    return zonedTimeToUtc(
      tz, tentative.getUTCFullYear(), tentative.getUTCMonth() + 1,
      tentative.getUTCDate(), tHour, tentative.getUTCMinutes(), tentative.getUTCSeconds(),
    );
  }

  const deadZoneMs = (24 - sendWindowEnd + sendWindowStart) * 60 * 60 * 1000;
  const adjustedMs = tentativeMs + deadZoneMs;
  const adjusted = new Date(adjustedMs);

  return zonedTimeToUtc(
    tz, adjusted.getUTCFullYear(), adjusted.getUTCMonth() + 1,
    adjusted.getUTCDate(), adjusted.getUTCHours(), adjusted.getUTCMinutes(), adjusted.getUTCSeconds(),
  );
}

function isWhatsAppWindowOpen(lastClientMessageAt: string | null): boolean {
  if (!lastClientMessageAt) return false;
  const diffHours = (Date.now() - new Date(lastClientMessageAt).getTime()) / (1000 * 60 * 60);
  return diffHours < 23.5;
}

function getTemplateType(context: string): string {
  if (context === "recordatorio_cita") return "recordatorio_cita";
  if (context === "reactivacion") return "reactivacion";
  if (context === "oferta") return "oferta_valor";
  return "seguimiento_general";
}

async function clearWhatsAppBlockedState(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
) {
  await supabase
    .from("conversations")
    .update({
      whatsapp_window_blocked: false,
      whatsapp_window_blocked_at: null,
      whatsapp_window_blocked_reason: null,
    })
    .eq("id", conversationId);
}

async function sendWhatsAppMessageSmart(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  conv: {
    id: string;
    clinic_id: string;
    channel: string;
    visitor_contact: string | null;
    contact_id: string | null;
    last_client_message_at?: string | null;
  },
  messageContent: string,
  context: string,
  agentName: string,
  origin?: string,
): Promise<{ sent: boolean; type: string; reason?: string }> {
  const channel = conv.channel || "whatsapp";

  if (channel !== "whatsapp") {
    await supabase.from("messages").insert({
      conversation_id: conv.id, clinic_id: conv.clinic_id,
      direction: "outbound", content: messageContent, message_type: "text", status: "sent",
      origin: origin || "system",
    });
    return { sent: true, type: "free_form" };
  }

  if (!conv.visitor_contact) {
    return { sent: false, type: "error", reason: "no_phone" };
  }

  const windowOpen = isWhatsAppWindowOpen(conv.last_client_message_at || null);

  if (windowOpen) {
    const sendResp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_id: conv.clinic_id, to_number: conv.visitor_contact,
        message_type: "text", content: messageContent, conversation_id: conv.id,
        origin: origin || "system",
      }),
    });
    if (!sendResp.ok) {
      console.error(`[WHATSAPP] Send failed for conv ${conv.id}`);
      return { sent: false, type: "error", reason: "send_failed" };
    }

    await clearWhatsAppBlockedState(supabase, conv.id);
    return { sent: true, type: "free_form" };
  }

  const templateType = getTemplateType(context);
  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("clinic_id", conv.clinic_id)
    .eq("template_type", templateType)
    .eq("is_active", true)
    .maybeSingle();

  if (!template || !template.meta_approved) {
    await supabase.from("conversations").update({
      whatsapp_window_blocked: true,
      whatsapp_window_blocked_at: new Date().toISOString(),
      whatsapp_window_blocked_reason: `template_${templateType}_not_approved`,
    }).eq("id", conv.id);

    await supabase.from("conversation_pipeline_history").insert({
      conversation_id: conv.id, clinic_id: conv.clinic_id,
      from_tab: "system", to_tab: "system",
      moved_by: "system",
      reason: `Mensaje no enviado: ventana WhatsApp cerrada y template '${templateType}' no aprobado`,
    });

    return { sent: false, type: "blocked", reason: "template_not_approved" };
  }

  let contactName = "cliente";
  if (conv.contact_id) {
    const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
    if (contact?.name) contactName = contact.name.split(" ")[0];
  }
  const { data: clinic } = await supabase.from("clinics").select("name").eq("id", conv.clinic_id).single();
  const clinicName = clinic?.name || "nuestro negocio";

  const components: any[] = [{
    type: "body",
    parameters: (template.template_variables as string[] || []).map((varName: string) => {
      switch (varName) {
        case "nombre_cliente": return { type: "text", text: contactName };
        case "nombre_agente": return { type: "text", text: agentName };
        case "nombre_negocio": return { type: "text", text: clinicName };
        case "servicio_consultado": return { type: "text", text: "nuestros servicios" };
        default: return { type: "text", text: "" };
      }
    }),
  }];

  const sendResp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      clinic_id: conv.clinic_id, to_number: conv.visitor_contact,
      message_type: "template", type: "template",
      template_name: template.meta_template_id || template.template_name,
      template_language: template.template_language || "es",
      template_components: components,
      conversation_id: conv.id,
      origin: origin || "system",
    }),
  });

  if (!sendResp.ok) {
    return { sent: false, type: "error", reason: "template_send_failed" };
  }

  await clearWhatsAppBlockedState(supabase, conv.id);
  return { sent: true, type: "template" };
}

// === DUAL AUTH CHECK ===
async function verifyAuth(req: Request, supabaseUrl: string): Promise<{ authorized: boolean; source: string }> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) return { authorized: true, source: "cron" };
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false, source: "no_header" };
  const token = authHeader.replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (token === serviceKey) return { authorized: true, source: "service_role" };
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (token === anonKey) return { authorized: true, source: "anon_trigger" };
  try {
    const { createClient: cc } = await import("https://esm.sh/@supabase/supabase-js@2");
    const c = cc(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await c.auth.getUser();
    if (error || !data?.user) return { authorized: false, source: "invalid_jwt" };
    return { authorized: true, source: "user_jwt" };
  } catch { return { authorized: false, source: "jwt_error" }; }
}

// =============== MAIN HANDLER ===============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // === AUTOMATIONS DISABLED ===
  // All pipeline automations (S1-S6 seguimiento, inactivity timers, etc.) are disabled.
  // Only the AI agent with its main prompt remains active.
  console.log("pipeline-automation: Automations disabled. Returning early.");
  return new Response(JSON.stringify({ status: "disabled", message: "Pipeline automations are currently disabled. Manual embudo management only." }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const auth = await verifyAuth(req, supabaseUrl);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const errors: { conversation_id: string; error: string }[] = [];
  let tarea1Count = 0, tarea2Enqueued = 0, tarea2NoResponden = 0, tarea3Fixed = 0;
  let tarea5Reminder1 = 0, tarea5Reminder2 = 0;
  let tarea6Sent = 0, tarea6Retried = 0, tarea6Failed = 0, tarea6Cancelled = 0;
  let tarea7Orphans = 0, tarea7Stale = 0, tarea7Cleaned = 0;

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
      if (elapsed > LOCK_STALE_MS) {
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
    const rules: Record<string, any> = {};
    (rulesRows || []).forEach((r: { rule_key: string; rule_value: unknown }) => {
      rules[r.rule_key] = r.rule_value;
    });

    const inactivityTimeout = Number(rules["inactivity_timeout_minutes"]) || 15;
    const maxAutoContacts = Number(rules["max_auto_contacts"]) || 10;
    const sendWindowStart = Number(rules["send_window_start_hour"]) || 7;
    const sendWindowEnd = Number(rules["send_window_end_hour"]) || 23;
    const globalAgentName = (typeof rules["ai_agent_name"] === "string" ? rules["ai_agent_name"].replace(/^\"|\"$/g, "") : "Sofía") || "Sofía";
    const queueBatchSize = Number(rules["queue_batch_size"]) || 10;
    const queueDelayBetweenSendsMs = Number(rules["queue_delay_between_sends_ms"]) || 2000;
    const queueMaxRetryAttempts = Number(rules["queue_max_retry_attempts"]) || 3;

    // Build delay map for S1-S4 (S5-S6 are manual, no delays needed)
    const delayMap: Record<number, number> = {};
    for (let i = 1; i <= 4; i++) {
      delayMap[i] = Number(rules[`s${i}_delay_minutes`]) || [15, 30, 240, 720][i - 1];
    }

    // === LOAD STRATEGIES ===
    const { data: strategiesRows } = await supabase
      .from("seguimiento_strategies")
      .select("*")
      .order("contact_number", { ascending: true });
    const strategiesMap: Record<number, any> = {};
    (strategiesRows || []).forEach((s: any) => { strategiesMap[s.contact_number] = s; });

    // Cache clinic config
    const clinicTimezoneCache: Record<string, string> = {};
    const clinicDelayCache: Record<string, number> = {};
    const clinicAgentNameCache: Record<string, string> = {};

    async function getClinicTimezone(clinicId: string): Promise<string> {
      if (clinicTimezoneCache[clinicId]) return clinicTimezoneCache[clinicId];
      const { data } = await supabase.from("clinics").select("timezone").eq("id", clinicId).single();
      const tz = data?.timezone || "America/Guayaquil";
      clinicTimezoneCache[clinicId] = tz;
      return tz;
    }

    async function getClinicStageDelay(clinicId: string, stageNumber: number): Promise<number> {
      const cacheKey = `${clinicId}:s${stageNumber}`;
      if (cacheKey in clinicDelayCache) return clinicDelayCache[cacheKey];

      const fallbackDelay = delayMap[stageNumber] || 15;
      const { data } = await supabase
        .from("clinic_pipeline_rules")
        .select("rule_value")
        .eq("clinic_id", clinicId)
        .eq("rule_key", `s${stageNumber}_delay_minutes`)
        .maybeSingle();

      const delay = data ? Number(data.rule_value) || fallbackDelay : fallbackDelay;
      clinicDelayCache[cacheKey] = delay;
      return delay;
    }

    async function getClinicAgentName(clinicId: string): Promise<string> {
      if (clinicAgentNameCache[clinicId]) return clinicAgentNameCache[clinicId];

      const { data } = await supabase
        .from("clinic_pipeline_rules")
        .select("rule_value")
        .eq("clinic_id", clinicId)
        .eq("rule_key", "ai_agent_name")
        .maybeSingle();

      const agentName = data?.rule_value
        ? String(data.rule_value).replace(/^\"|\"$/g, "") || globalAgentName
        : globalAgentName;

      clinicAgentNameCache[clinicId] = agentName;
      return agentName;
    }

    function getStageNumberFromPipelineTab(pipelineTab: string | null | undefined): number | null {
      const match = pipelineTab?.match(/^seguimiento_s(\d{1,2})$/);
      return match ? Number(match[1]) : null;
    }

    function hasSuspiciousFutureTimer(scheduledAt: string | null, expectedDelayMinutes: number): boolean {
      if (!scheduledAt) return false;
      const diffMs = new Date(scheduledAt).getTime() - Date.now();
      if (diffMs <= 0) return false;

      const deadZoneHours = 24 - sendWindowEnd + sendWindowStart;
      const deadZoneMs = deadZoneHours * 60 * 60 * 1000;
      const maxExpectedMs = Math.max(expectedDelayMinutes * 4, 60) * 60 * 1000 + deadZoneMs;
      return diffMs > maxExpectedMs;
    }

    const templateApprovalCache: Record<string, boolean> = {};
    async function hasApprovedTemplate(clinicId: string, templateType: string): Promise<boolean> {
      const cacheKey = `${clinicId}:${templateType}`;
      if (cacheKey in templateApprovalCache) return templateApprovalCache[cacheKey];

      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("meta_approved")
        .eq("clinic_id", clinicId)
        .eq("template_type", templateType)
        .eq("is_active", true)
        .maybeSingle();

      const approved = Boolean(template?.meta_approved);
      templateApprovalCache[cacheKey] = approved;
      return approved;
    }

    // ========== TAREA 1: Inactivity timeout ==========
    console.log("[PIPELINE] TAREA 1: Checking inactivity timeout...");
    const cutoff = new Date(Date.now() - inactivityTimeout * 60 * 1000).toISOString();
    const { data: inactiveConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, inactivity_timer_start, seguimiento_next_s")
      .eq("pipeline_tab", "resueltos_ia")
      .eq("chatbot_active", true)
      .not("inactivity_timer_start", "is", null)
      .lt("inactivity_timer_start", cutoff);

    for (const conv of inactiveConvs || []) {
      try {
        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab, seguimiento_next_s").eq("id", conv.id).single();
        if (fresh?.pipeline_tab !== "resueltos_ia") continue;

        const nextS = Math.max(fresh.seguimiento_next_s || 1, 1);

        // S7+ means all stages exhausted → move to no_responden
        if (nextS > 6) {
          await supabase.from("conversations").update({
            pipeline_tab: "no_responden",
            seguimiento_next_contact_at: null,
            inactivity_timer_start: null,
            seguimiento_last_completed_s: 6,
          }).eq("id", conv.id);
          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: "resueltos_ia", to_tab: "no_responden",
            moved_by: "system", reason: `Inactividad → todas las etapas S1-S6 agotadas`,
          });
          tarea1Count++;
          continue;
        }

        const targetTab = `seguimiento_s${nextS}`;
        const isManualStep = nextS >= 5;

        if (isManualStep) {
          // S5/S6 are manual — move there WITHOUT a timer
          await supabase.from("conversations").update({
            pipeline_tab: targetTab,
            seguimiento_contact_number: nextS,
            seguimiento_next_contact_at: null,
            inactivity_timer_start: null,
          }).eq("id", conv.id);

          // === GENERATE AI CONTEXT SUMMARY for human agent (S5 only) ===
          if (nextS === 5) {
            try {
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (LOVABLE_API_KEY) {
                // Fetch conversation history
                const { data: chatHistory } = await supabase
                  .from("messages")
                  .select("direction, content, created_at, origin")
                  .eq("conversation_id", conv.id)
                  .order("created_at", { ascending: true })
                  .limit(30);

                // Fetch contact info
                const { data: convDetail } = await supabase
                  .from("conversations")
                  .select("contact_id, seguimiento_is_recurrente, seguimiento_recurrente_count")
                  .eq("id", conv.id)
                  .single();

                let contactName = "el contacto";
                if (convDetail?.contact_id) {
                  const { data: contact } = await supabase.from("contacts").select("name, tags").eq("id", convDetail.contact_id).single();
                  if (contact?.name) contactName = contact.name;
                }

                // Fetch clinic services for context
                const { data: agentCfg } = await supabase
                  .from("ai_agent_config")
                  .select("services")
                  .eq("clinic_id", conv.clinic_id)
                  .maybeSingle();

                const servicesList = ((agentCfg?.services || []) as { name: string }[]).map(s => s.name).join(", ") || "servicios del negocio";

                const chatSummaryText = (chatHistory || []).map(m =>
                  `${m.direction === "inbound" ? "CLIENTE" : "NEGOCIO"}: ${m.content}`
                ).join("\n");

                const summaryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash-lite",
                    messages: [
                      {
                        role: "system",
                        content: `Eres un analista de conversaciones de ventas. Genera un RESUMEN EJECUTIVO para el agente humano que va a tomar esta conversación.

El resumen debe incluir:
1. **Contexto**: Qué preguntó el cliente, sobre qué servicio/producto mostró interés
2. **Estado**: ¿Mostró interés real? ¿Tiene dudas pendientes? ¿Dijo que volvería después?
3. **Historial de seguimiento**: Ya se le enviaron 4 mensajes automáticos (S1-S4) sin respuesta
4. **Sugerencia**: Qué debería hacer el agente humano — opciones concretas:
   - Enviar un template de WhatsApp para reabrir conversación (si la ventana está cerrada)
   - Escribir un mensaje personalizado resolviendo dudas pendientes
   - Moverlo a "No responden" si no hay señales de interés
   - Moverlo a "No interesado" si expresó desinterés
   - Intentar un último contacto con ángulo diferente

SERVICIOS DISPONIBLES: ${servicesList}
NOMBRE DEL CLIENTE: ${contactName}
${convDetail?.seguimiento_is_recurrente ? `NOTA: Este es un ciclo recurrente (#${convDetail?.seguimiento_recurrente_count || 1}). Ya ha pasado por seguimiento antes.` : ""}

Formato: Usa emojis para hacerlo visual y fácil de escanear. Máximo 6 líneas. Sé directo y práctico.`,
                      },
                      { role: "user", content: chatSummaryText || "Sin mensajes en el historial" },
                    ],
                    stream: false,
                    max_tokens: 350,
                  }),
                });

                if (summaryResp.ok) {
                  const summaryData = await summaryResp.json();
                  // Log pipeline summary usage
                  try {
                    const sUsage = summaryData.usage;
                    const sIn = sUsage?.prompt_tokens || 0;
                    const sOut = sUsage?.completion_tokens || 0;
                    const sCost = (sIn * 0.075 + sOut * 0.30) / 1_000_000;
                    await supabase.from("ai_token_usage").insert({
                      clinic_id: conv.clinic_id, user_id: null,
                      generator_type: "pipeline_summary", model: "google/gemini-2.5-flash-lite",
                      tokens_input: sIn, tokens_output: sOut, cost_usd: sCost,
                      action_label: "Resumen ejecutivo escalación S5",
                    });
                  } catch (logErr) { console.error("[PIPELINE] Summary usage log error:", logErr); }
                  const summary = summaryData.choices?.[0]?.message?.content?.trim();

                  if (summary) {
                    // Insert as a system note message (visible only to agents)
                    await supabase.from("messages").insert({
                      conversation_id: conv.id,
                      clinic_id: conv.clinic_id,
                      direction: "outbound",
                      content: summary,
                      message_type: "system_note",
                      status: "delivered",
                      origin: "system_summary|seguimiento_s5",
                    });
                    console.log(`[PIPELINE] S5 summary generated for conv ${conv.id}`);
                  }
                }
              }
            } catch (summaryErr) {
              console.error(`[PIPELINE] S5 summary generation failed (non-blocking):`, summaryErr);
            }
          }
        } else {
          // S1-S4 are automatic — set timer
          const contactDelay = await getClinicStageDelay(conv.clinic_id, nextS);
          const clinicTz = await getClinicTimezone(conv.clinic_id);
          const nextContactAt = getScheduledContactTime(clinicTz, contactDelay, sendWindowStart, sendWindowEnd).toISOString();
          await supabase.from("conversations").update({
            pipeline_tab: targetTab,
            seguimiento_contact_number: nextS,
            seguimiento_next_contact_at: nextContactAt,
            inactivity_timer_start: null,
          }).eq("id", conv.id);
        }

        await supabase.from("conversation_pipeline_history").insert({
          conversation_id: conv.id, clinic_id: conv.clinic_id,
          from_tab: "resueltos_ia", to_tab: targetTab,
          moved_by: "system", reason: `Inactividad de ${inactivityTimeout} minutos → S${nextS}${isManualStep ? " (manual/humano)" : ""}`,
        });
        tarea1Count++;
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 2: ENQUEUE follow-ups (S1-S4) ==========
    console.log("[PIPELINE] TAREA 2: Enqueuing follow-up messages...");
    const now = new Date().toISOString();
    const seguimientoTabs = Array.from({ length: 4 }, (_, i) => `seguimiento_s${i + 1}`);
    const { data: followUpConvs } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, seguimiento_next_contact_at, seguimiento_consecutive_read_no_reply, seguimiento_spam_protection_triggered, channel")
      .in("pipeline_tab", seguimientoTabs)
      .not("seguimiento_next_contact_at", "is", null)
      .lt("seguimiento_next_contact_at", now)
      .order("seguimiento_next_contact_at", { ascending: true });

    for (const conv of followUpConvs || []) {
      try {
        const clinicTz = await getClinicTimezone(conv.clinic_id);
        const clinicHour = getNowHourInTz(clinicTz);
        const isWithinSendWindow = clinicHour >= sendWindowStart && clinicHour < sendWindowEnd;

        if (!isWithinSendWindow) {
          const nextWindow = getNextWindowStart(clinicTz, sendWindowStart);
          await supabase.from("conversations").update({
            seguimiento_next_contact_at: nextWindow.toISOString(),
          }).eq("id", conv.id);
          console.log(`[PIPELINE] Outside send window, postponed conv ${conv.id}`);
          continue;
        }

        const { data: fresh } = await supabase.from("conversations").select("pipeline_tab, seguimiento_contact_number, seguimiento_consecutive_read_no_reply").eq("id", conv.id).single();
        if (!fresh || !fresh.pipeline_tab?.startsWith("seguimiento_s")) continue;

        const contactNumber = fresh.seguimiento_contact_number || conv.seguimiento_contact_number || 1;
        const isManualStep = contactNumber >= 5;

        if (isManualStep) {
          console.log(`[PIPELINE] S${contactNumber} is manual (human), skipping for conv ${conv.id}`);
          continue;
        }

        // === ANTI-SPAM CHECK ===
        const spamLimit = Number(rules["spam_protection_read_no_reply_limit"]) || 4;
        const readNoReplyCount = fresh.seguimiento_consecutive_read_no_reply || 0;
        if (readNoReplyCount >= spamLimit) {
          await supabase.from("conversations").update({
            pipeline_tab: "no_responden",
            seguimiento_next_contact_at: null,
            seguimiento_spam_protection_triggered: true,
            seguimiento_spam_jumped_from_s: contactNumber,
          }).eq("id", conv.id);

          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: conv.id, clinic_id: conv.clinic_id,
            from_tab: `seguimiento_s${contactNumber}`, to_tab: "no_responden",
            moved_by: "system",
            reason: `Protección anti-spam: ${readNoReplyCount} lecturas sin responder`,
          });
          console.log(`[PIPELINE SPAM] Conv ${conv.id} jumped S${contactNumber} → no_responden`);
          continue;
        }

        // === CHECK: already queued? ===
        const { data: existingQueue } = await supabase
          .from("pipeline_message_queue")
          .select("id")
          .eq("conversation_id", conv.id)
          .eq("contact_number", contactNumber)
          .in("status", ["pending", "processing", "retry"])
          .maybeSingle();

        if (existingQueue) {
          console.log(`[PIPELINE] Already queued S${contactNumber} for conv ${conv.id}, skipping`);
          continue;
        }

        // === ENQUEUE ===
        const priority = 10 - contactNumber; // S1=9, S4=6
        await supabase.from("pipeline_message_queue").insert({
          conversation_id: conv.id,
          clinic_id: conv.clinic_id,
          contact_number: contactNumber,
          message_type: "seguimiento",
          status: "pending",
          priority,
          scheduled_at: conv.seguimiento_next_contact_at,
        });

        tarea2Enqueued++;
        console.log(`[QUEUE] S${contactNumber} enqueued for conv ${conv.id} (priority=${priority})`);
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 3: Cleanup inconsistencies ==========
    console.log("[PIPELINE] TAREA 3: Cleanup...");
    const { data: inconsistent } = await supabase
      .from("conversations")
      .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, seguimiento_last_contact_at, seguimiento_next_contact_at, whatsapp_window_blocked")
      .like("pipeline_tab", "seguimiento_s%")
      .eq("archived", false)
      .eq("status", "open");

    for (const conv of inconsistent || []) {
      try {
        const stageNumber = conv.seguimiento_contact_number || getStageNumberFromPipelineTab(conv.pipeline_tab) || 1;
        if (stageNumber > 4) continue; // S5-S6 are manual, skip cleanup
        if (conv.whatsapp_window_blocked) continue; // Window blocked, timer will be paused anyway

        const delay = await getClinicStageDelay(conv.clinic_id, stageNumber);
        const missingTimer = !conv.seguimiento_next_contact_at;
        const skewedTimer = hasSuspiciousFutureTimer(conv.seguimiento_next_contact_at, delay);
        if (!missingTimer && !skewedTimer) continue;

        const clinicTz = await getClinicTimezone(conv.clinic_id);
        const baseDate = missingTimer
          ? new Date(conv.seguimiento_last_contact_at || new Date().toISOString())
          : new Date();

        await supabase.from("conversations").update({
          seguimiento_next_contact_at: getScheduledContactTime(clinicTz, delay, sendWindowStart, sendWindowEnd, baseDate).toISOString(),
        }).eq("id", conv.id);

        console.log(`[PIPELINE] Repaired ${missingTimer ? "missing" : "skewed"} timer for conv ${conv.id}`);
        tarea3Fixed++;
      } catch (e) {
        errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ========== TAREA 5: APPOINTMENT REMINDERS ==========
    console.log("[PIPELINE] TAREA 5: Appointment reminders...");

    // We check send window per-clinic below, so always run this block

    {
      const { data: reminderConfigs } = await supabase
        .from("appointment_reminder_config")
        .select("*")
        .eq("is_active", true);

      if (reminderConfigs && reminderConfigs.length > 0) {
        const configByClinic: Record<string, any[]> = {};
        for (const rc of reminderConfigs) {
          if (!configByClinic[rc.clinic_id]) configByClinic[rc.clinic_id] = [];
          configByClinic[rc.clinic_id].push(rc);
        }

        const nowDate = new Date();
        const todayStart = new Date(nowDate);
        todayStart.setUTCHours(0, 0, 0, 0);

        // Helper: parse appointment date+time in clinic timezone → UTC Date
        function getAppointmentUtc(dateStr: string, timeStr: string | null, tz: string): Date {
          const d = new Date(dateStr);
          const year = d.getUTCFullYear();
          const month = d.getUTCMonth() + 1;
          const day = d.getUTCDate();
          let hh = 9, mm = 0;
          if (timeStr) {
            const parts = timeStr.split(":").map(Number);
            hh = parts[0] || 0;
            mm = parts[1] || 0;
          }
          return zonedTimeToUtc(tz, year, month, day, hh, mm, 0);
        }

        // Helper: format date in clinic timezone
        function formatDateInTz(utcDate: Date, tz: string): string {
          return utcDate.toLocaleDateString("es", { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
        }

        // REMINDER 1
        const { data: reminder1Convs } = await supabase
          .from("conversations")
          .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed, last_client_message_at")
          .eq("pipeline_tab", "agendados")
          .eq("appointment_reminder_1_sent", false)
          .not("appointment_date", "is", null)
          .gte("appointment_date", todayStart.toISOString());

        for (const conv of reminder1Convs || []) {
          try {
            if (conv.appointment_confirmed) continue;
            const clinicConfigs = configByClinic[conv.clinic_id];
            const r1Config = clinicConfigs?.find((c: any) => c.reminder_number === 1);
            if (!r1Config) continue;

            const clinicTz = await getClinicTimezone(conv.clinic_id);
            const clinicHour = getNowHourInTz(clinicTz);
            if (clinicHour < sendWindowStart || clinicHour >= sendWindowEnd) continue;

            const appointmentUtc = getAppointmentUtc(conv.appointment_date, conv.appointment_time, clinicTz);
            const hoursUntil = (appointmentUtc.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            if (hoursUntil <= 0 || hoursUntil > r1Config.hours_before_appointment) continue;

            const { data: existingReminder } = await supabase
              .from("pipeline_message_queue")
              .select("id")
              .eq("conversation_id", conv.id)
              .eq("message_type", "recordatorio_cita_1")
              .in("status", ["pending", "processing", "retry"])
              .maybeSingle();

            if (existingReminder) continue;

            let contactName = "cliente";
            if (conv.contact_id) {
              const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
              if (contact?.name) contactName = contact.name.split(" ")[0];
            }

            const fecha = formatDateInTz(appointmentUtc, clinicTz);
            const hora = conv.appointment_time || appointmentUtc.toLocaleTimeString("es", { timeZone: clinicTz, hour: "2-digit", minute: "2-digit" });
            const servicio = conv.appointment_service || "tu cita";

            const message = (r1Config.message_template || "")
              .replace(/\{\{nombre\}\}/g, contactName)
              .replace(/\{\{fecha\}\}/g, fecha)
              .replace(/\{\{hora\}\}/g, hora)
              .replace(/\{\{servicio\}\}/g, servicio);

            await supabase.from("pipeline_message_queue").insert({
              conversation_id: conv.id,
              clinic_id: conv.clinic_id,
              contact_number: 0,
              message_type: "recordatorio_cita_1",
              status: "pending",
              priority: 100,
              scheduled_at: new Date().toISOString(),
              generated_message: message,
            });

            tarea5Reminder1++;
          } catch (e) {
            errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
          }
        }

        // REMINDER 2
        const { data: reminder2Convs } = await supabase
          .from("conversations")
          .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed, last_client_message_at")
          .eq("pipeline_tab", "agendados")
          .eq("appointment_reminder_1_sent", true)
          .eq("appointment_reminder_2_sent", false)
          .eq("appointment_confirmed", false)
          .not("appointment_date", "is", null)
          .gte("appointment_date", todayStart.toISOString());

        for (const conv of reminder2Convs || []) {
          try {
            const clinicConfigs = configByClinic[conv.clinic_id];
            const r2Config = clinicConfigs?.find((c: any) => c.reminder_number === 2);
            if (!r2Config) continue;

            const clinicTz = await getClinicTimezone(conv.clinic_id);
            const clinicHour = getNowHourInTz(clinicTz);
            if (clinicHour < sendWindowStart || clinicHour >= sendWindowEnd) continue;

            const appointmentUtc = getAppointmentUtc(conv.appointment_date, conv.appointment_time, clinicTz);
            const hoursUntil = (appointmentUtc.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            if (hoursUntil <= 0 || hoursUntil > r2Config.hours_before_appointment) continue;

            const { data: existingReminder } = await supabase
              .from("pipeline_message_queue")
              .select("id")
              .eq("conversation_id", conv.id)
              .eq("message_type", "recordatorio_cita_2")
              .in("status", ["pending", "processing", "retry"])
              .maybeSingle();

            if (existingReminder) continue;

            let contactName = "cliente";
            if (conv.contact_id) {
              const { data: contact } = await supabase.from("contacts").select("name").eq("id", conv.contact_id).single();
              if (contact?.name) contactName = contact.name.split(" ")[0];
            }

            const fecha = formatDateInTz(appointmentUtc, clinicTz);
            const hora = conv.appointment_time || appointmentUtc.toLocaleTimeString("es", { timeZone: clinicTz, hour: "2-digit", minute: "2-digit" });
            const servicio = conv.appointment_service || "tu cita";

            const message = (r2Config.message_template || "")
              .replace(/\{\{nombre\}\}/g, contactName)
              .replace(/\{\{fecha\}\}/g, fecha)
              .replace(/\{\{hora\}\}/g, hora)
              .replace(/\{\{servicio\}\}/g, servicio);

            await supabase.from("pipeline_message_queue").insert({
              conversation_id: conv.id,
              clinic_id: conv.clinic_id,
              contact_number: 0,
              message_type: "recordatorio_cita_2",
              status: "pending",
              priority: 100,
              scheduled_at: new Date().toISOString(),
              generated_message: message,
            });

            tarea5Reminder2++;
          } catch (e) {
            errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
    }


        const configByClinic: Record<string, any[]> = {};
        for (const rc of reminderConfigs) {
          if (!configByClinic[rc.clinic_id]) configByClinic[rc.clinic_id] = [];
          configByClinic[rc.clinic_id].push(rc);
        }

        const nowDate = new Date();
        const todayStart = new Date(nowDate);
        todayStart.setUTCHours(0, 0, 0, 0);

        // REMINDER 1 - use gte to include today's appointments
        const { data: reminder1Convs } = await supabase
          .from("conversations")
          .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed, last_client_message_at")
          .eq("pipeline_tab", "agendados")
          .eq("appointment_reminder_1_sent", false)
          .not("appointment_date", "is", null)
          .gte("appointment_date", todayStart.toISOString());

        for (const conv of reminder1Convs || []) {
          try {
            if (conv.appointment_confirmed) continue;
            const clinicConfigs = configByClinic[conv.clinic_id];
            const r1Config = clinicConfigs?.find((c: any) => c.reminder_number === 1);
            if (!r1Config) continue;

            const appointmentDate = new Date(conv.appointment_date);
            // Combine date + time for accurate hours calculation
            if (conv.appointment_time) {
              const [hh, mm] = conv.appointment_time.split(":").map(Number);
              appointmentDate.setUTCHours(hh || 0, mm || 0, 0, 0);
            }
            const hoursUntil = (appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            if (hoursUntil <= 0 || hoursUntil > r1Config.hours_before_appointment) continue;

            // Enqueue reminder instead of sending directly
            const { data: existingReminder } = await supabase
              .from("pipeline_message_queue")
              .select("id")
              .eq("conversation_id", conv.id)
              .eq("message_type", "recordatorio_cita_1")
              .in("status", ["pending", "processing", "retry"])
              .maybeSingle();

            if (existingReminder) continue;

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

            await supabase.from("pipeline_message_queue").insert({
              conversation_id: conv.id,
              clinic_id: conv.clinic_id,
              contact_number: 0,
              message_type: "recordatorio_cita_1",
              status: "pending",
              priority: 100,
              scheduled_at: new Date().toISOString(),
              generated_message: message,
            });

            tarea5Reminder1++;
          } catch (e) {
            errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
          }
        }

        // REMINDER 2
        const { data: reminder2Convs } = await supabase
          .from("conversations")
          .select("id, clinic_id, contact_id, channel, visitor_contact, appointment_date, appointment_time, appointment_service, appointment_confirmed, last_client_message_at")
          .eq("pipeline_tab", "agendados")
          .eq("appointment_reminder_1_sent", true)
          .eq("appointment_reminder_2_sent", false)
          .eq("appointment_confirmed", false)
          .not("appointment_date", "is", null)
          .gte("appointment_date", todayStart.toISOString());

        for (const conv of reminder2Convs || []) {
          try {
            const clinicConfigs = configByClinic[conv.clinic_id];
            const r2Config = clinicConfigs?.find((c: any) => c.reminder_number === 2);
            if (!r2Config) continue;

            const appointmentDate = new Date(conv.appointment_date);
            if (conv.appointment_time) {
              const [hh, mm] = conv.appointment_time.split(":").map(Number);
              appointmentDate.setUTCHours(hh || 0, mm || 0, 0, 0);
            }
            const hoursUntil = (appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            if (hoursUntil <= 0 || hoursUntil > r2Config.hours_before_appointment) continue;

            const { data: existingReminder } = await supabase
              .from("pipeline_message_queue")
              .select("id")
              .eq("conversation_id", conv.id)
              .eq("message_type", "recordatorio_cita_2")
              .in("status", ["pending", "processing", "retry"])
              .maybeSingle();

            if (existingReminder) continue;

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

            await supabase.from("pipeline_message_queue").insert({
              conversation_id: conv.id,
              clinic_id: conv.clinic_id,
              contact_number: 0,
              message_type: "recordatorio_cita_2",
              status: "pending",
              priority: 100,
              scheduled_at: new Date().toISOString(),
              generated_message: message,
            });

            tarea5Reminder2++;
          } catch (e) {
            errors.push({ conversation_id: conv.id, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
    }

    // ========== TAREA 6: PROCESS QUEUE ==========
    console.log("[PIPELINE] TAREA 6: Processing message queue...");

    const { data: queueItems } = await supabase
      .from("pipeline_message_queue")
      .select("*")
      .in("status", ["pending", "retry"])
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(queueBatchSize);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    for (let qi = 0; qi < (queueItems || []).length; qi++) {
      const queueItem = queueItems![qi];

      try {
        // Mark as processing
        await supabase.from("pipeline_message_queue").update({
          status: "processing",
          last_attempt_at: new Date().toISOString(),
        }).eq("id", queueItem.id);

        // Verify conversation still in correct state
        const { data: convFresh } = await supabase
          .from("conversations")
          .select("id, clinic_id, pipeline_tab, seguimiento_contact_number, contact_id, channel, visitor_contact, last_client_message_at, seguimiento_last_completed_s, seguimiento_next_s, seguimiento_responded_at_s, seguimiento_is_recurrente, seguimiento_recurrente_count, seguimiento_consecutive_read_no_reply")
          .eq("id", queueItem.conversation_id)
          .single();

        if (!convFresh) {
          await supabase.from("pipeline_message_queue").update({ status: "cancelled", last_error: "Conversation not found" }).eq("id", queueItem.id);
          tarea6Cancelled++;
          continue;
        }

        // For seguimiento: check conversation is still in the right stage
        if (queueItem.message_type === "seguimiento") {
          const expectedTab = `seguimiento_s${queueItem.contact_number}`;
          if (convFresh.pipeline_tab !== expectedTab) {
            await supabase.from("pipeline_message_queue").update({ status: "cancelled", last_error: `Conv moved to ${convFresh.pipeline_tab}` }).eq("id", queueItem.id);
            tarea6Cancelled++;
            console.log(`[QUEUE] Cancelled S${queueItem.contact_number} for conv ${queueItem.conversation_id}: moved to ${convFresh.pipeline_tab}`);
            continue;
          }

          // Anti-spam re-check
          const spamLimit = Number(rules["spam_protection_read_no_reply_limit"]) || 4;
          if ((convFresh.seguimiento_consecutive_read_no_reply || 0) >= spamLimit) {
            await supabase.from("pipeline_message_queue").update({ status: "cancelled", last_error: "Spam protection triggered" }).eq("id", queueItem.id);
            await supabase.from("conversations").update({
              pipeline_tab: "no_responden",
              seguimiento_next_contact_at: null,
              seguimiento_spam_protection_triggered: true,
              seguimiento_spam_jumped_from_s: queueItem.contact_number,
            }).eq("id", convFresh.id);
            tarea6Cancelled++;
            continue;
          }
        }

        // Generate message if not pre-generated (reminders have generated_message)
        let messageContent = queueItem.generated_message;

        if (!messageContent && LOVABLE_API_KEY) {
          const contactNumber = queueItem.contact_number;
          const strategy = strategiesMap[contactNumber];
          const agentName = await getClinicAgentName(convFresh.clinic_id);
          const { data: clinic } = await supabase.from("clinics").select("name").eq("id", convFresh.clinic_id).single();
          const clinicName = clinic?.name || "el negocio";

          // Load AI agent config for context — ALL fields
          const { data: agentConfig } = await supabase.from("ai_agent_config")
            .select("agent_name, objective, greeting, tone, language, special_instructions, services, treatments_text, prices_text, locations_text, professionals_text")
            .eq("clinic_id", convFresh.clinic_id).maybeSingle();

          let clinicKnowledgeBlock = "";
          if (agentConfig) {
            const parts: string[] = [];
            if (agentConfig.objective) parts.push(`OBJETIVO DEL AGENTE:\n${agentConfig.objective}`);
            if (agentConfig.tone) parts.push(`TONO DE COMUNICACIÓN: ${agentConfig.tone}`);
            if (agentConfig.language) parts.push(`IDIOMA: ${agentConfig.language}`);
            if (agentConfig.greeting) parts.push(`MENSAJE DE BIENVENIDA CONFIGURADO:\n${agentConfig.greeting}`);
            if (agentConfig.special_instructions) parts.push(`INSTRUCCIONES ESPECIALES:\n${agentConfig.special_instructions}`);
            if (agentConfig.treatments_text) parts.push(`TRATAMIENTOS/SERVICIOS:\n${agentConfig.treatments_text}`);
            if (agentConfig.prices_text) parts.push(`PRECIOS:\n${agentConfig.prices_text}`);
            if (agentConfig.locations_text) parts.push(`UBICACIÓN:\n${agentConfig.locations_text}`);
            if (agentConfig.professionals_text) parts.push(`PROFESIONALES:\n${agentConfig.professionals_text}`);
            const servicesArr = agentConfig.services as any[];
            if (servicesArr && servicesArr.length > 0) {
              const servicesList = servicesArr.map((s: any) => typeof s === "string" ? s : s.name || JSON.stringify(s)).join(", ");
              parts.push(`SERVICIOS REGISTRADOS: ${servicesList}`);
            }
            if (parts.length > 0) {
              clinicKnowledgeBlock = `\nCONFIGURACIÓN COMPLETA DEL AGENTE IA DEL NEGOCIO (SOLO usa estos datos, NUNCA inventes):\n${parts.join("\n\n")}`;
            }
          }

          let contactName = "cliente";
          if (convFresh.contact_id) {
            const { data: contact } = await supabase.from("contacts").select("name").eq("id", convFresh.contact_id).single();
            if (contact?.name) contactName = contact.name.split(" ")[0];
          }

          const { data: recentMessages } = await supabase
            .from("messages").select("direction, content")
            .eq("conversation_id", convFresh.id)
            .order("created_at", { ascending: false }).limit(20);
          if (recentMessages) recentMessages.reverse();

          const messagesContext = (recentMessages || [])
            .map(m => `${m.direction === "inbound" ? "Cliente" : agentName}: ${m.content}`)
            .join("\n");

          let manualMoveContext = "";
          const { data: lastMove } = await supabase
            .from("conversation_pipeline_history")
            .select("from_tab, to_tab, moved_by, reason, metadata")
            .eq("conversation_id", convFresh.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastMove && lastMove.moved_by !== "system") {
            const meta = lastMove.metadata as Record<string, any> | null;
            manualMoveContext = `\nCONTEXTO DE MOVIMIENTO:\n- Movida manualmente por agente de '${lastMove.from_tab}' a '${lastMove.to_tab}'\n- Razón: ${lastMove.reason || "Sin razón"}\n- Agente: ${meta?.agent_name || "Agente"}`;
          }

          let followUpPrompt: string;
          if (strategy) {
            followUpPrompt = `Eres ${agentName}, asistente de ${clinicName}. Estás dando seguimiento a un paciente que dejó de responder.

CONVERSACIÓN COMPLETA (últimos 20 mensajes):
${messagesContext}
${clinicKnowledgeBlock}

INFORMACIÓN DEL CONTACTO:
- Nombre: ${contactName}
- Es recurrente: ${convFresh.seguimiento_is_recurrente} (veces: ${convFresh.seguimiento_recurrente_count})
- Respondió por última vez en S${convFresh.seguimiento_responded_at_s}
${manualMoveContext}

CONTACTO ACTUAL: S${contactNumber} de 4 (automáticos)
ESTRATEGIA: ${strategy.strategy_name} — ${strategy.strategy_description}
INSTRUCCIÓN: ${strategy.prompt_instruction}
REGLAS DE ESTA ESTRATEGIA: ${strategy.rules}
BARRERA QUE DEBES RESOLVER: ${strategy.barrier_it_solves}
PRINCIPIO PSICOLÓGICO: ${strategy.psychological_principle}

DIRECTRIZ PRINCIPAL — CONTENIDO DE VALOR:
Tu mensaje SIEMPRE debe aportar información de valor al cliente basada en el CONTEXTO de la conversación:
- Analiza qué servicio o tema le interesaba al cliente y ofrece un dato educativo, científico o práctico relevante.
- Ejemplos: beneficios clínicos de un tratamiento, estadísticas de efectividad, consejos de cuidado, datos curiosos del procedimiento, testimonios genéricos de resultados.
- El contenido educativo debe ser REAL y basado en la información del negocio. NO inventes datos científicos.
- Cada mensaje debe sentirse como una conversación útil, NO como un mensaje de ventas.
- SIEMPRE cierra invitando sutilmente a agendar una cita o resolver dudas pendientes.

REGLAS GLOBALES INQUEBRANTABLES:
1. Genera UN solo mensaje (máximo 3 oraciones, máximo 250 caracteres)
2. La PRIMERA oración debe aportar VALOR EDUCATIVO o CIENTÍFICO relacionado al interés del cliente
3. La SEGUNDA oración conecta ese valor con el servicio del negocio
4. La TERCERA oración invita a agendar o resolver dudas (cierre suave)
5. Adapta el contenido al CONTEXTO REAL de la conversación — retoma lo ÚLTIMO que se habló
6. Suena como una persona real llamada ${agentName}, NO como bot ni vendedora
7. Usa el nombre del cliente: ${contactName}
8. Si es S1: preséntate brevemente ("Hola ${contactName}, soy ${agentName} de ${clinicName}")
9. Si es S2-S4: NO repitas tu nombre, ya te presentaste
10. NUNCA menciones que eres bot, IA, sistema automatizado, o que esto es un "seguimiento automático"
11. NUNCA uses frases como "sistema de seguimiento", "mensaje programado", "recordatorio automático"
12. Si el cliente es recurrente, sé más directa y familiar (ya te conoce)
13. NUNCA sugieras "agendar una llamada" ni "llamar" — la comunicación es por MENSAJES. Ofrece agendar una CITA presencial o resolver dudas por este medio.
14. NUNCA inventes números exactos de cupos (ej. "quedan 2 cupos"). Usa "pocos cupos" o "espacios limitados". Ofrece DÍAS disponibles, NUNCA horarios específicos.
15. SOLO menciona servicios, tratamientos y precios que aparezcan en la INFORMACIÓN REAL DEL NEGOCIO. NUNCA inventes servicios que no existan.
16. NUNCA repitas información ya dada en mensajes anteriores. Cada seguimiento debe aportar algo NUEVO.

Responde SOLO con el texto del mensaje. Sin comillas, sin explicación.`;
          } else {
            followUpPrompt = `Genera un mensaje de seguimiento #${contactNumber} para ${contactName}. Analiza el contexto de la conversación, aporta un dato educativo o científico relevante al interés del cliente, y cierra invitando a agendar. Contexto: ${messagesContext}. ${manualMoveContext} Máximo 3 oraciones.`;
          }

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: followUpPrompt },
                { role: "user", content: "Genera el mensaje de seguimiento." },
              ],
              stream: false,
              max_tokens: 200,
            }),
          });

          if (!aiResp.ok) {
            const errText = await aiResp.text();
            throw new Error(`AI generation failed: ${errText}`);
          }

          const aiData = await aiResp.json();
          messageContent = aiData.choices?.[0]?.message?.content?.trim();

          if (!messageContent) {
            throw new Error("Empty AI response");
          }

          // Save generated message and log tokens
          await supabase.from("pipeline_message_queue").update({ generated_message: messageContent }).eq("id", queueItem.id);

          const usage = aiData?.usage || {};
          await supabase.from("ai_token_usage").insert({
            clinic_id: convFresh.clinic_id,
            generator_type: "agent",
            model: aiData?.model || "google/gemini-2.5-flash",
            tokens_input: usage.prompt_tokens || 0,
            tokens_output: usage.completion_tokens || 0,
            cost_usd: 0,
            action_label: `Seguimiento S${contactNumber} — ${strategy?.strategy_name || "generic"}`,
          });
        }

        if (!messageContent) {
          throw new Error("No message content to send");
        }

        // === SEND IMMEDIATELY (no humanized delay for queue) ===
        const agentName = await getClinicAgentName(convFresh.clinic_id);
        const sendContext = queueItem.message_type.startsWith("recordatorio_cita") ? "recordatorio_cita" : "seguimiento";
        const pipelineTab = convFresh.pipeline_tab || "inbox";
        const messageOrigin = queueItem.message_type === "seguimiento"
          ? `follow_up_s${queueItem.contact_number}|${pipelineTab}`
          : queueItem.message_type.startsWith("recordatorio_cita")
            ? `reminder|${pipelineTab}`
            : `system|${pipelineTab}`;

        const sendResult = await sendWhatsAppMessageSmart(
          supabase, supabaseUrl, supabaseKey,
          {
            id: convFresh.id, clinic_id: convFresh.clinic_id,
            channel: convFresh.channel || "whatsapp",
            visitor_contact: convFresh.visitor_contact,
            contact_id: convFresh.contact_id,
            last_client_message_at: convFresh.last_client_message_at,
          },
          messageContent, sendContext, agentName, messageOrigin,
        );

        if (!sendResult.sent) {
          if (sendResult.type === "blocked") {
            // Window closed — pause seguimiento, agent must send template manually
            await supabase.from("conversations").update({
              seguimiento_next_contact_at: null,
              whatsapp_window_blocked: true,
              whatsapp_window_blocked_at: new Date().toISOString(),
              whatsapp_window_blocked_reason: "ventana_cerrada_requiere_template_manual",
            }).eq("id", convFresh.id);

            // Mark queue item as needing manual resolution
            await supabase.from("pipeline_message_queue").update({
              status: "pending_manual",
              last_error: "Ventana WhatsApp cerrada. El agente debe enviar un template aprobado manualmente.",
            }).eq("id", queueItem.id);

            console.log(`[QUEUE] Conv ${convFresh.id} paused — window closed, needs manual template`);
            continue; // Skip to next queue item, don't throw
          }
          throw new Error(`Send failed: ${sendResult.reason || sendResult.type}`);
        }

        // === SUCCESS: Update queue and advance pipeline ===
        const sentAt = new Date();
        await supabase.from("pipeline_message_queue").update({
          status: "sent",
          sent_at: sentAt.toISOString(),
        }).eq("id", queueItem.id);

        tarea6Sent++;
        console.log(`[QUEUE] S${queueItem.contact_number} sent as ${sendResult.type} for conv ${convFresh.id}`);

        // Advance pipeline — cronómetro del siguiente S empieza AQUÍ (al enviar)
        if (queueItem.message_type === "seguimiento") {
          const contactNumber = queueItem.contact_number;
          const nextContactNumber = contactNumber + 1;

          if (nextContactNumber > maxAutoContacts) {
            await supabase.from("conversations").update({
              pipeline_tab: "no_responden",
              seguimiento_next_contact_at: null,
              seguimiento_last_contact_at: sentAt.toISOString(),
              seguimiento_last_completed_s: contactNumber,
            }).eq("id", convFresh.id);
            await supabase.from("conversation_pipeline_history").insert({
              conversation_id: convFresh.id, clinic_id: convFresh.clinic_id,
              from_tab: `seguimiento_s${contactNumber}`, to_tab: "no_responden",
              moved_by: "system", reason: `Sin respuesta después de ${maxAutoContacts} contactos`,
            });
            tarea2NoResponden++;
          } else if (nextContactNumber >= 5) {
            // S5 and S6 are manual (human) — move there but NO timer
            await supabase.from("conversations").update({
              pipeline_tab: `seguimiento_s${nextContactNumber}`,
              seguimiento_contact_number: nextContactNumber,
              seguimiento_next_contact_at: null,
              seguimiento_last_contact_at: sentAt.toISOString(),
              seguimiento_last_completed_s: contactNumber,
            }).eq("id", convFresh.id);

            await supabase.from("conversation_pipeline_history").insert({
              conversation_id: convFresh.id, clinic_id: convFresh.clinic_id,
              from_tab: `seguimiento_s${contactNumber}`, to_tab: `seguimiento_s${nextContactNumber}`,
              moved_by: "system", reason: `S${contactNumber} enviado → S${nextContactNumber} (manual/humano)`,
            });
          } else {
            const clinicTz = await getClinicTimezone(convFresh.clinic_id);
            const actualDelay = await getClinicStageDelay(convFresh.clinic_id, nextContactNumber);

            // CRITICAL: next timer starts from sentAt (NOW), not from scheduled_at
            const nextContactDate = getScheduledContactTime(clinicTz, actualDelay, sendWindowStart, sendWindowEnd, sentAt);

            await supabase.from("conversations").update({
              pipeline_tab: `seguimiento_s${nextContactNumber}`,
              seguimiento_contact_number: nextContactNumber,
              seguimiento_next_contact_at: nextContactDate.toISOString(),
              seguimiento_last_contact_at: sentAt.toISOString(),
              seguimiento_last_completed_s: contactNumber,
            }).eq("id", convFresh.id);

            await supabase.from("conversation_pipeline_history").insert({
              conversation_id: convFresh.id, clinic_id: convFresh.clinic_id,
              from_tab: `seguimiento_s${contactNumber}`, to_tab: `seguimiento_s${nextContactNumber}`,
              moved_by: "system", reason: `S${contactNumber} (${strategiesMap[contactNumber]?.strategy_name || "generic"}) enviado${sendResult.type === "template" ? " como template" : ""}`,
            });
          }

          await supabase.from("conversations").update({
            last_message_at: sentAt.toISOString(),
            last_message_preview: messageContent.substring(0, 100),
          }).eq("id", convFresh.id);
        }

        // Handle reminders
        if (queueItem.message_type === "recordatorio_cita_1") {
          await supabase.from("conversations").update({
            appointment_reminder_1_sent: true,
            appointment_reminder_1_sent_at: sentAt.toISOString(),
            appointment_status: "reminder_1_sent",
          }).eq("id", convFresh.id);
          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: convFresh.id, clinic_id: convFresh.clinic_id,
            from_tab: "agendados", to_tab: "agendados",
            moved_by: "system", reason: `Recordatorio 1 enviado${sendResult.type === "template" ? " (template)" : ""}`,
          });
        }
        if (queueItem.message_type === "recordatorio_cita_2") {
          await supabase.from("conversations").update({
            appointment_reminder_2_sent: true,
            appointment_reminder_2_sent_at: sentAt.toISOString(),
            appointment_status: "reminder_2_sent",
          }).eq("id", convFresh.id);
          await supabase.from("conversation_pipeline_history").insert({
            conversation_id: convFresh.id, clinic_id: convFresh.clinic_id,
            from_tab: "agendados", to_tab: "agendados",
            moved_by: "system", reason: `Recordatorio 2 enviado${sendResult.type === "template" ? " (template)" : ""}`,
          });
        }

        // Wait between sends (rate limit)
        if (qi < (queueItems!.length - 1)) {
          await sleep(queueDelayBetweenSendsMs);
        }

      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        const newAttemptCount = (queueItem.attempt_count || 0) + 1;

        if (newAttemptCount >= queueMaxRetryAttempts) {
          await supabase.from("pipeline_message_queue").update({
            status: "failed",
            attempt_count: newAttemptCount,
            last_error: errMsg,
          }).eq("id", queueItem.id);
          tarea6Failed++;
          console.error(`[QUEUE] FAILED (${newAttemptCount}/${queueMaxRetryAttempts}) S${queueItem.contact_number} for conv ${queueItem.conversation_id}: ${errMsg}`);
        } else {
          await supabase.from("pipeline_message_queue").update({
            status: "retry",
            attempt_count: newAttemptCount,
            last_error: errMsg,
          }).eq("id", queueItem.id);
          tarea6Retried++;
          console.warn(`[QUEUE] Retry (${newAttemptCount}/${queueMaxRetryAttempts}) S${queueItem.contact_number} for conv ${queueItem.conversation_id}: ${errMsg}`);
        }

        errors.push({ conversation_id: queueItem.conversation_id, error: errMsg });
      }
    }

    // ========== TAREA 7: QUEUE CLEANUP ==========
    console.log("[PIPELINE] TAREA 7: Queue cleanup...");

    // 7.1 Cancel orphans (conversation moved away from seguimiento)
    // Fallback: manual query if RPC doesn't exist
    const { data: orphanItems } = await supabase
      .from("pipeline_message_queue")
      .select("id, conversation_id")
      .in("status", ["pending", "retry"])
      .eq("message_type", "seguimiento");

    for (const item of orphanItems || []) {
      const { data: convCheck } = await supabase
        .from("conversations")
        .select("pipeline_tab")
        .eq("id", item.conversation_id)
        .single();

      if (convCheck && !convCheck.pipeline_tab?.startsWith("seguimiento_s")) {
        await supabase.from("pipeline_message_queue").update({
          status: "cancelled",
          last_error: `Conversation moved to ${convCheck.pipeline_tab}`,
        }).eq("id", item.id);
        tarea7Orphans++;
      }
    }

    // 7.2 Release stale processing items (>10 min)
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: staleItems } = await supabase
      .from("pipeline_message_queue")
      .select("id")
      .eq("status", "processing")
      .lt("last_attempt_at", staleThreshold);

    for (const item of staleItems || []) {
      await supabase.from("pipeline_message_queue").update({
        status: "retry",
        last_error: "Timeout: stuck in processing >10min",
      }).eq("id", item.id);
      tarea7Stale++;
    }

    // 7.3 Clean old completed items (>30 days)
    const cleanThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldItems } = await supabase
      .from("pipeline_message_queue")
      .select("id")
      .in("status", ["sent", "cancelled", "resolved_manually"])
      .lt("created_at", cleanThreshold)
      .limit(100);

    if (oldItems && oldItems.length > 0) {
      const oldIds = oldItems.map(i => i.id);
      await supabase.from("pipeline_message_queue").delete().in("id", oldIds);
      tarea7Cleaned = oldIds.length;
    }

    if (tarea7Orphans + tarea7Stale + tarea7Cleaned > 0) {
      console.log(`[PIPELINE] Cleanup: ${tarea7Orphans} orphans, ${tarea7Stale} stale, ${tarea7Cleaned} old records`);
    }

  } finally {
    await supabase.from("pipeline_execution_lock").update({
      is_running: false,
      last_completed_at: new Date().toISOString(),
    }).eq("id", 1);
  }

  const result = {
    executed_at: new Date().toISOString(),
    tarea1_moved_to_seguimiento: tarea1Count,
    tarea2_enqueued: tarea2Enqueued,
    tarea2_moved_to_no_responden: tarea2NoResponden,
    tarea3_inconsistencies_fixed: tarea3Fixed,
    tarea5_reminder1_enqueued: tarea5Reminder1,
    tarea5_reminder2_enqueued: tarea5Reminder2,
    tarea6_sent: tarea6Sent,
    tarea6_retried: tarea6Retried,
    tarea6_failed: tarea6Failed,
    tarea6_cancelled: tarea6Cancelled,
    tarea7_orphans_cancelled: tarea7Orphans,
    tarea7_stale_released: tarea7Stale,
    tarea7_old_cleaned: tarea7Cleaned,
    errors,
  };

  await supabase.from("pipeline_execution_log").insert({
    moved_to_seguimiento: tarea1Count,
    messages_sent: tarea6Sent,
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
