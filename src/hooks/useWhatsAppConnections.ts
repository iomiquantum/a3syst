import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface WhatsAppConnection {
  id: string;
  clinic_id: string;
  meta_app_id: string | null;
  meta_app_name: string | null;
  waba_id: string;
  phone_number_id: string;
  phone_number: string | null;
  display_phone_number: string | null;
  business_name: string | null;
  access_token: string | null;
  display_name: string | null;
  status: string;
  quality_rating: string | null;
  webhook_verify_token: string | null;
  webhook_configured: boolean;
  webhook_url: string | null;
  last_verified_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppConnections = () => {
  const { clinicId } = useClinic();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    if (!clinicId) return;
    const { data, error } = await (supabase as any)
      .from("whatsapp_connections")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching connections:", error);
    setConnections(data || []);
    setLoading(false);
  };

  const addConnection = async (connectionData: {
    meta_app_id: string;
    meta_app_name?: string;
    waba_id: string;
    phone_number_id: string;
    display_phone_number: string;
    business_name: string;
    access_token: string;
    quality_rating?: string;
  }) => {
    if (!clinicId) return null;

    const webhookUrl = `https://ecdshvqxvjbeizdivpuz.supabase.co/functions/v1/whatsapp-webhook`;

    const { data, error } = await (supabase as any)
      .from("whatsapp_connections")
      .insert({
        clinic_id: clinicId,
        ...connectionData,
        phone_number: connectionData.display_phone_number,
        display_name: connectionData.business_name,
        webhook_url: webhookUrl,
        last_verified_at: new Date().toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear conexión: " + error.message);
      return null;
    }
    toast.success(`WhatsApp de ${connectionData.business_name} registrado`);
    fetchConnections();
    return data as WhatsAppConnection;
  };

  const deleteConnection = async (connectionId: string) => {
    const { error } = await (supabase as any)
      .from("whatsapp_connections")
      .delete()
      .eq("id", connectionId);
    
    if (error) throw error;
  };

  const updateToken = async (connectionId: string, newToken: string) => {
    await (supabase as any).from("whatsapp_connections").update({
      access_token: newToken,
      status: "active",
      last_error: null,
      last_verified_at: new Date().toISOString(),
    }).eq("id", connectionId);
    toast.success("Token actualizado");
    fetchConnections();
  };

  const activateConnection = async (connectionId: string) => {
    await (supabase as any).from("whatsapp_connections").update({ status: "active" }).eq("id", connectionId);
    fetchConnections();
  };

  useEffect(() => {
    fetchConnections();
  }, [clinicId]);

  const isConnected = connections.some((c) => c.status === "active");

  return { connections, loading, isConnected, addConnection, deleteConnection, updateToken, activateConnection, refetch: fetchConnections };
};
