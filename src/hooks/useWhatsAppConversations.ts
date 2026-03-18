import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppConversation {
  id: string;
  connection_id: string;
  clinic_id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_wa_id: string | null;
  status: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  assigned_to: string | null;
  patient_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const useWhatsAppConversations = (clinicId: string | undefined) => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!clinicId) return;
    const { data, error } = await (supabase as any)
      .from("whatsapp_conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("last_message_at", { ascending: false });
    if (error) console.error("Error fetching WA conversations:", error);
    setConversations(data || []);
    setLoading(false);
  };

  const markAsRead = async (conversationId: string) => {
    await (supabase as any)
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("wa-conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  return { conversations, loading, refetch: fetchConversations, markAsRead };
};
