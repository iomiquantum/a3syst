import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { PipelineTab } from "@/hooks/useConversationsByPipeline";

export const usePipelineAction = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();

  const moveConversation = async (
    conversationId: string,
    targetTab: PipelineTab,
    reason?: string
  ) => {
    if (!clinicId || !user) return;

    // Get current state
    const { data: current, error: fetchErr } = await (supabase as any)
      .from("conversations")
      .select("pipeline_tab")
      .eq("id", conversationId)
      .single();

    if (fetchErr) {
      toast.error("Error al obtener conversación");
      return;
    }

    const fromTab = current?.pipeline_tab || "resueltos_ia";
    const updates: Record<string, any> = { pipeline_tab: targetTab };

    if (targetTab === "no_interesado") {
      updates.marked_no_interesado_by = user.id;
      updates.marked_no_interesado_at = new Date().toISOString();
    } else if (targetTab === "clientes") {
      updates.marked_cliente_by = user.id;
      updates.marked_cliente_at = new Date().toISOString();
    } else if (targetTab === "escalados") {
      updates.escalado_reason = reason || "Escalado manual";
      updates.escalado_at = new Date().toISOString();
    }

    // Reset seguimiento fields when leaving seguimiento
    if (fromTab.startsWith("seguimiento_") && !targetTab.startsWith("seguimiento_")) {
      updates.seguimiento_contact_number = 0;
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

    // Log to history
    await (supabase as any)
      .from("conversation_pipeline_history")
      .insert({
        conversation_id: conversationId,
        clinic_id: clinicId,
        from_tab: fromTab,
        to_tab: targetTab,
        moved_by: user.id,
        reason: reason || null,
      });

    const labels: Record<string, string> = {
      resueltos_ia: "Resueltos IA",
      seguimiento_c1: "Seguimiento C1",
      no_responden: "No responden",
      no_interesado: "No interesado",
      escalados: "Escalados",
      clientes: "Clientes",
    };

    toast.success(`Movido a ${labels[targetTab] || targetTab}`);
  };

  return { moveConversation };
};
