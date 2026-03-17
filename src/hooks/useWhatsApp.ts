import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface WhatsAppConnection {
  id: string;
  clinic_id: string;
  waba_id: string;
  phone_number_id: string;
  phone_number: string | null;
  access_token: string | null;
  display_name: string | null;
  status: string;
  quality_rating: string | null;
  coexistence_enabled: boolean;
  connected_at: string | null;
  last_health_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  clinic_id: string;
  phone_number_id: string;
  direction: string;
  from_number: string;
  to_number: string;
  message_type: string;
  content: Record<string, unknown>;
  wa_message_id: string | null;
  status: string;
  created_at: string;
}

export const useWhatsApp = () => {
  const { clinicId } = useClinic();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch connections for this clinic
  const {
    data: connections = [],
    isLoading: loadingConnections,
  } = useQuery({
    queryKey: ["whatsapp-connections", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await (supabase as any)
        .from("whatsapp_connections")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching WhatsApp connections:", error);
        return [];
      }
      return (data || []) as WhatsAppConnection[];
    },
    enabled: !!clinicId,
  });

  // Fetch messages for this clinic
  const {
    data: messages = [],
    isLoading: loadingMessages,
  } = useQuery({
    queryKey: ["whatsapp-messages", clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await (supabase as any)
        .from("whatsapp_messages")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching WhatsApp messages:", error);
        return [];
      }
      return (data || []) as WhatsAppMessage[];
    },
    enabled: !!clinicId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      to_number,
      message_type = "text",
      content,
    }: {
      to_number: string;
      message_type?: string;
      content: string | Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { clinic_id: clinicId, to_number, message_type, content },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Mensaje enviado");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", clinicId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al enviar mensaje");
    },
  });

  const isConnected = connections.some((c) => c.status === "active");

  const connectWhatsApp = () => {
    navigate("/configuracion/whatsapp");
  };

  return {
    connections,
    messages,
    loadingConnections,
    loadingMessages,
    sendMessage,
    isConnected,
    connectWhatsApp,
  };
};
