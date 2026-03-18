import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppMessage {
  id: string;
  conversation_id: string | null;
  clinic_id: string;
  connection_id: string | null;
  wa_message_id: string | null;
  direction: "inbound" | "outbound";
  message_type: string;
  text_content: string | null;
  content: Record<string, unknown>;
  media_url: string | null;
  media_mime_type: string | null;
  media_caption: string | null;
  status: string;
  status_timestamp: string | null;
  error_code: string | null;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
}

export const useWhatsAppMessages = (conversationId: string | undefined) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!conversationId) return;
    const { data, error } = await (supabase as any)
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) console.error("Error fetching WA messages:", error);
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`wa-msg-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, refetch: fetchMessages };
};
