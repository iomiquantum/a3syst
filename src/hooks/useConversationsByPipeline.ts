import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export type PipelineTab =
  | "resueltos_ia"
  | "seguimiento_c1"
  | "seguimiento_c2"
  | "seguimiento_c3"
  | "no_responden"
  | "no_interesado"
  | "escalados"
  | "clientes";

export type PipelineFilter = "todos" | PipelineTab;

export interface PipelineConversation {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  chatbot_active: boolean;
  pipeline_tab: PipelineTab;
  seguimiento_contact_number: number;
  seguimiento_is_recurrente: boolean;
  seguimiento_recurrente_count: number;
  pinned: boolean;
  contactName: string;
  contactPhone: string;
  contactTags: string[];
  contactEmail: string;
}

interface Params {
  pipelineTab: PipelineFilter;
  channel: string;
  tags: string[];
  searchQuery: string;
  periodStart?: string;
  periodEnd?: string;
  showArchived?: boolean;
}

export const useConversationsByPipeline = (params: Params) => {
  const { clinicId } = useClinic();
  const [conversations, setConversations] = useState<PipelineConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!clinicId) return;

    let query = (supabase as any)
      .from("conversations")
      .select("*, contacts!conversations_contact_id_fkey(name, phone, email, tags)")
      .eq("clinic_id", clinicId)
      .eq("archived", params.showArchived ? true : false)
      .order("pinned", { ascending: false })
      .order("last_message_at", { ascending: false });

    // Pipeline filter
    if (params.pipelineTab !== "todos") {
      if (params.pipelineTab === "seguimiento_c1") {
        query = query.in("pipeline_tab", ["seguimiento_c1", "seguimiento_c2", "seguimiento_c3"]);
      } else {
        query = query.eq("pipeline_tab", params.pipelineTab);
      }
    }

    // Channel filter
    if (params.channel !== "todos") {
      query = query.eq("channel", params.channel);
    }

    // Period filter
    if (params.periodStart) {
      query = query.gte("last_message_at", params.periodStart);
    }
    if (params.periodEnd) {
      query = query.lte("last_message_at", params.periodEnd);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching pipeline conversations:", error);
      setLoading(false);
      return;
    }

    let mapped: PipelineConversation[] = (data || []).map((c: any) => ({
      id: c.id,
      contact_id: c.contact_id,
      channel: c.channel || "whatsapp",
      status: c.status,
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview || "",
      unread_count: c.unread_count || 0,
      chatbot_active: c.chatbot_active,
      pipeline_tab: c.pipeline_tab || "resueltos_ia",
      seguimiento_contact_number: c.seguimiento_contact_number || 0,
      seguimiento_is_recurrente: c.seguimiento_is_recurrente || false,
      seguimiento_recurrente_count: c.seguimiento_recurrente_count || 0,
      pinned: c.pinned || false,
      contactName: c.contacts?.name || c.visitor_name || "Sin nombre",
      contactPhone: c.contacts?.phone || c.visitor_contact || "",
      contactTags: c.contacts?.tags || [],
      contactEmail: c.contacts?.email || "",
    }));

    // Client-side tag filter (Supabase array overlap is tricky)
    if (params.tags.length > 0) {
      mapped = mapped.filter(c => params.tags.some(t => c.contactTags.includes(t)));
    }

    // Client-side search
    if (params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase();
      mapped = mapped.filter(c =>
        c.contactName.toLowerCase().includes(q) ||
        c.contactPhone.toLowerCase().includes(q)
      );
    }

    setConversations(mapped);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchConversations();
  }, [clinicId, params.pipelineTab, params.channel, params.tags.join(","), params.searchQuery, params.periodStart, params.periodEnd, params.showArchived]);

  // Realtime subscription
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("pipeline-conversations-" + clinicId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return { conversations, loading, refetch: fetchConversations };
};
