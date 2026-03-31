import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";

const STAGE_LABELS: Record<string, string> = {};
EMBUDO_STAGES.forEach(s => { STAGE_LABELS[s.key] = s.label; });

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

    const { data: current, error: fetchErr } = await (supabase as any)
      .from("conversations")
      .select("pipeline_tab")
      .eq("id", conversationId)
      .single();

    if (fetchErr) {
      toast.error("Error al obtener conversación");
      return;
    }

    const fromTab = current?.pipeline_tab || "nuevos";
    const updates: Record<string, any> = { pipeline_tab: targetTab };

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
        reason: reason || "Movido manualmente",
        metadata: { manual: true, agent_name: agentDisplayName, ...(metadata || {}) },
      });

    const fromLabel = STAGE_LABELS[fromTab] || fromTab;
    const toLabel = STAGE_LABELS[targetTab] || targetTab;
    toast.success(`Movido de ${fromLabel} a ${toLabel}`);
  };

  return { moveConversation };
};
