import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const usePipelineAction = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const moveConversation = async (
    conversationId: string,
    targetTab: string,
    reason?: string,
    metadata?: Record<string, any>
  ) => {
    if (!clinicId || !user) return;

    // Fetch current conversation state
    const { data: current, error: fetchErr } = await (supabase as any)
      .from("conversations")
      .select("pipeline_tab, seguimiento_next_s, seguimiento_last_completed_s, seguimiento_contact_number, appointment_date")
      .eq("id", conversationId)
      .single();

    if (fetchErr) {
      toast.error("Error al obtener conversación");
      return;
    }

    const fromTab = current?.pipeline_tab || "resueltos_ia";
    const updates: Record<string, any> = { pipeline_tab: targetTab };

    // === Destination-specific tracking updates ===

    // Moving to a seguimiento_sN tab
    const seguimientoMatch = targetTab.match(/^seguimiento_s(\d+)$/);
    if (seguimientoMatch) {
      const n = parseInt(seguimientoMatch[1]);
      if (n > 10) {
        toast.error("El seguimiento máximo es S10");
        return;
      }
      updates.seguimiento_contact_number = n;
      updates.seguimiento_next_s = n;
      updates.seguimiento_last_completed_s = Math.max(n - 1, 0);

      // Get delay for this S
      let delayMinutes = 15;
      const { data: clinicRule } = await (supabase as any)
        .from("clinic_pipeline_rules")
        .select("rule_value")
        .eq("clinic_id", clinicId)
        .eq("rule_key", `s${n}_delay_minutes`)
        .maybeSingle();

      if (clinicRule?.rule_value) {
        delayMinutes = Number(clinicRule.rule_value) || delayMinutes;
      } else {
        const { data: globalRule } = await (supabase as any)
          .from("pipeline_global_rules")
          .select("rule_value")
          .eq("rule_key", `s${n}_delay_minutes`)
          .maybeSingle();
        if (globalRule?.rule_value) {
          delayMinutes = Number(globalRule.rule_value) || delayMinutes;
        }
      }

      // Apply send window hours
      let nextContactAt = new Date(Date.now() + delayMinutes * 60 * 1000);
      const { data: startRule } = await (supabase as any)
        .from("pipeline_global_rules").select("rule_value").eq("rule_key", "send_window_start_hour").maybeSingle();
      const { data: endRule } = await (supabase as any)
        .from("pipeline_global_rules").select("rule_value").eq("rule_key", "send_window_end_hour").maybeSingle();
      const sendStart = Number(startRule?.rule_value) || 8;
      const sendEnd = Number(endRule?.rule_value) || 21;

      if (nextContactAt.getHours() >= sendEnd || nextContactAt.getHours() < sendStart) {
        // Push to next day at sendStart
        nextContactAt.setDate(nextContactAt.getDate() + (nextContactAt.getHours() >= sendEnd ? 1 : 0));
        nextContactAt.setHours(sendStart, 0, 0, 0);
      }

      updates.seguimiento_next_contact_at = nextContactAt.toISOString();
    }

    // Moving to resueltos_ia
    if (targetTab === "resueltos_ia") {
      updates.inactivity_timer_start = new Date().toISOString();
      // Keep seguimiento_next_s so the timer moves to the correct S when it expires
    }

    // Moving to agendados — appointment_date validation is handled in the UI component
    if (targetTab === "agendados") {
      updates.seguimiento_next_contact_at = null;
    }

    // Moving to terminal states
    if (["no_responden", "no_interesado", "perdidos"].includes(targetTab)) {
      updates.seguimiento_next_contact_at = null;
    }

    if (targetTab === "no_interesado") {
      updates.marked_no_interesado_by = user.id;
      updates.marked_no_interesado_at = new Date().toISOString();
    }

    if (targetTab === "pacientes") {
      updates.seguimiento_next_contact_at = null;
      updates.marked_cliente_by = user.id;
      updates.marked_cliente_at = new Date().toISOString();
    }

    if (targetTab === "escalados") {
      updates.escalado_reason = reason || "Escalado manual";
      updates.escalado_at = new Date().toISOString();
    }

    if (targetTab === "no_show") {
      updates.seguimiento_next_s = 1;
      updates.seguimiento_last_completed_s = 0;
      updates.seguimiento_is_recurrente = true;
      updates.seguimiento_next_contact_at = null;
    }

    // Reset seguimiento fields when leaving seguimiento to non-seguimiento (except cases handled above)
    if (
      fromTab.startsWith("seguimiento_") &&
      !targetTab.startsWith("seguimiento_") &&
      !["resueltos_ia", "no_show"].includes(targetTab)
    ) {
      if (!updates.hasOwnProperty("seguimiento_contact_number")) {
        updates.seguimiento_contact_number = 0;
      }
      updates.seguimiento_next_contact_at = null;
      updates.seguimiento_last_contact_at = null;
    }

    const { error: updateErr } = await (supabase as any)
      .from("conversations")
      .update(updates)
      .eq("id", conversationId);

    if (updateErr) {
      toast.error("Error al mover conversación");
      return;
    }

    // Get agent profile name for metadata
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const agentDisplayName = profile?.full_name || user.email || "Agente";

    await (supabase as any)
      .from("conversation_pipeline_history")
      .insert({
        conversation_id: conversationId,
        clinic_id: clinicId,
        from_tab: fromTab,
        to_tab: targetTab,
        moved_by: user.id,
        reason: reason || "Movido manualmente por agente",
        metadata: { manual: true, agent_name: agentDisplayName, ...(metadata || {}) },
      });

    const labels: Record<string, string> = {
      resueltos_ia: "Resueltos IA",
      seguimiento_s1: "Seguimiento S1",
      seguimiento_s2: "Seguimiento S2",
      seguimiento_s3: "Seguimiento S3",
      seguimiento_s4: "Seguimiento S4",
      seguimiento_s5: "Seguimiento S5",
      seguimiento_s6: "Seguimiento S6",
      no_responden: "No responden",
      no_interesado: "No interesado",
      escalados: "Escalados",
      pacientes: "Pacientes",
      agendados: "Agendados",
      perdidos: "Perdidos",
      no_show: "No-show",
      show_sin_venta: "Show sin venta",
    };

    const fromLabel = labels[fromTab] || fromTab;
    const toLabel = labels[targetTab] || targetTab;
    toast.success(`Movido de ${fromLabel} a ${toLabel}. El siguiente mensaje será contextual.`);
  };

  return { moveConversation };
};
