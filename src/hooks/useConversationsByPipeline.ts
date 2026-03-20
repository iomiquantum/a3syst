import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";

export type PipelineTab =
  | "resueltos_ia"
  | "seguimiento_s1"
  | "seguimiento_s2"
  | "seguimiento_s3"
  | "seguimiento_s4"
  | "seguimiento_s5"
  | "seguimiento_s6"
  | "seguimiento_s7"
  | "seguimiento_s8"
  | "seguimiento_s9"
  | "seguimiento_s10"
  | "no_responden"
  | "no_interesado"
  | "escalados"
  | "agendados"
  | "no_show"
  | "show_sin_venta"
  | "pacientes"
  | "perdidos";

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
  seguimiento_last_completed_s: number;
  seguimiento_next_s: number;
  seguimiento_responded_at_s: number;
  seguimiento_next_contact_at: string | null;
  pinned: boolean;
  contactName: string;
  contactPhone: string;
  contactTags: string[];
  contactEmail: string;
  inactivity_timer_start: string | null;
  // Appointment fields
  appointment_date: string | null;
  appointment_time: string | null;
  appointment_service: string | null;
  appointment_status: string | null;
  appointment_confirmed: boolean;
  appointment_attended: boolean | null;
  appointment_had_sale: boolean | null;
  appointment_branch_id: string | null;
}

interface Params {
  pipelineTab: PipelineFilter;
  channel: string;
  tags: string[];
  searchQuery: string;
  periodStart?: string;
  periodEnd?: string;
  showArchived?: boolean;
  subFilter?: string;
}

const ALL_SEGUIMIENTO_TABS = [
  "seguimiento_s1", "seguimiento_s2", "seguimiento_s3", "seguimiento_s4", "seguimiento_s5",
  "seguimiento_s6", "seguimiento_s7", "seguimiento_s8", "seguimiento_s9", "seguimiento_s10",
];

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
      if (params.pipelineTab === "seguimiento_s1") {
        // "Seguimiento" tab groups S1-S10
        if (params.subFilter && params.subFilter !== "todos") {
          query = query.eq("pipeline_tab", params.subFilter);
        } else {
          query = query.in("pipeline_tab", ALL_SEGUIMIENTO_TABS);
        }
      } else if (params.pipelineTab === "agendados") {
        query = query.eq("pipeline_tab", "agendados");
        if (params.subFilter && params.subFilter !== "todos") {
          query = query.eq("appointment_status", params.subFilter);
        }
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
      seguimiento_last_completed_s: c.seguimiento_last_completed_s || 0,
      seguimiento_next_s: c.seguimiento_next_s || 0,
      seguimiento_responded_at_s: c.seguimiento_responded_at_s || 0,
      pinned: c.pinned || false,
      inactivity_timer_start: c.inactivity_timer_start || null,
      contactName: c.contacts?.name || c.visitor_name || "Sin nombre",
      contactPhone: c.contacts?.phone || c.visitor_contact || "",
      contactTags: c.contacts?.tags || [],
      contactEmail: c.contacts?.email || "",
      appointment_date: c.appointment_date || null,
      appointment_time: c.appointment_time || null,
      appointment_service: c.appointment_service || null,
      appointment_status: c.appointment_status || null,
      appointment_confirmed: c.appointment_confirmed || false,
      appointment_attended: c.appointment_attended ?? null,
      appointment_had_sale: c.appointment_had_sale ?? null,
      appointment_branch_id: c.appointment_branch_id || null,
    }));

    // Client-side tag filter
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
  }, [clinicId, params.pipelineTab, params.channel, params.tags.join(","), params.searchQuery, params.periodStart, params.periodEnd, params.showArchived, params.subFilter]);

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
