import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export interface ChannelCredential {
  id: string;
  clinic_id: string;
  channel: string;
  credentials: Record<string, string>;
  is_active: boolean;
  setup_completed: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export const CHANNELS = [
  {
    key: "whatsapp",
    label: "WhatsApp Business",
    icon: "📱",
    provider: "Meta",
    color: "bg-green-500/10 text-green-600",
    fields: [
      { key: "access_token", label: "Access Token permanente", placeholder: "EAAx...", type: "password", required: true },
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "1234567890", type: "text", required: true },
      { key: "waba_id", label: "WhatsApp Business Account ID", placeholder: "1234567890", type: "text", required: true },
      { key: "verify_token", label: "Webhook Verify Token", placeholder: "mi_token_secreto", type: "text", required: true },
    ],
    steps: [
      { title: "Crear App en Meta", description: "Ve a developers.facebook.com y crea una nueva aplicación de tipo 'Negocios'. Selecciona tu Business Manager asociado.", link: "https://developers.facebook.com/apps/" },
      { title: "Agregar WhatsApp", description: "En tu app, ve a 'Agregar productos' y selecciona 'WhatsApp'. Sigue las instrucciones para configurar tu número de teléfono.", link: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" },
      { title: "Obtener Token permanente", description: "En Configuración del sistema → Usuarios → tu usuario → Generar token. Selecciona tu app y los permisos: whatsapp_business_messaging y whatsapp_business_management.", link: "https://business.facebook.com/settings/system-users" },
      { title: "Copiar Phone Number ID", description: "En tu app → WhatsApp → Configuración de la API. Copia el 'Phone Number ID' y el 'WhatsApp Business Account ID'." },
      { title: "Configurar Webhook", description: "En tu app → WhatsApp → Configuración → Webhooks. Usa la URL de webhook que te proporcionamos y el Verify Token que ingreses aquí." },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "📸",
    provider: "Meta",
    color: "bg-pink-500/10 text-pink-600",
    fields: [
      { key: "access_token", label: "Page Access Token", placeholder: "EAAx...", type: "password", required: true },
      { key: "page_id", label: "Facebook Page ID", placeholder: "1234567890", type: "text", required: true },
      { key: "ig_account_id", label: "Instagram Business Account ID", placeholder: "1234567890", type: "text", required: true },
      { key: "app_secret", label: "App Secret", placeholder: "abc123...", type: "password", required: true },
    ],
    steps: [
      { title: "Vincular Instagram a Facebook", description: "Asegúrate de que tu cuenta de Instagram sea Profesional/Negocio y esté vinculada a una Página de Facebook.", link: "https://help.instagram.com/502981923235522" },
      { title: "Crear App en Meta", description: "Ve a developers.facebook.com, crea una app de tipo 'Negocios'. Agrega el producto 'Instagram Graph API'.", link: "https://developers.facebook.com/apps/" },
      { title: "Obtener Page Access Token", description: "En la app → Herramientas de API Graph → selecciona tu página → genera un token con permisos: instagram_basic, instagram_manage_messages, pages_messaging.", link: "https://developers.facebook.com/tools/explorer/" },
      { title: "Obtener Instagram Account ID", description: "Usa la API Graph: GET /{page-id}?fields=instagram_business_account. Copia el ID devuelto." },
      { title: "Configurar Webhook", description: "En tu app → Webhooks → suscríbete a 'instagram' con los campos: messages, messaging_postbacks. Usa la URL que te proporcionamos." },
    ],
  },
  {
    key: "facebook",
    label: "Facebook Messenger",
    icon: "💬",
    provider: "Meta",
    color: "bg-blue-500/10 text-blue-600",
    fields: [
      { key: "access_token", label: "Page Access Token", placeholder: "EAAx...", type: "password", required: true },
      { key: "page_id", label: "Page ID", placeholder: "1234567890", type: "text", required: true },
      { key: "app_secret", label: "App Secret", placeholder: "abc123...", type: "password", required: true },
    ],
    steps: [
      { title: "Crear App en Meta", description: "Ve a developers.facebook.com y crea una nueva aplicación de tipo 'Negocios'.", link: "https://developers.facebook.com/apps/" },
      { title: "Agregar Messenger", description: "En tu app, agrega el producto 'Messenger'. Vincula la Página de Facebook de tu negocio.", link: "https://developers.facebook.com/docs/messenger-platform/getting-started" },
      { title: "Generar Page Access Token", description: "En tu app → Messenger → Configuración → Token de acceso. Selecciona tu página y genera el token.", link: "https://developers.facebook.com/tools/explorer/" },
      { title: "Copiar App Secret", description: "Ve a tu app → Configuración → Información básica → App Secret. Cópialo." },
      { title: "Configurar Webhook", description: "En tu app → Messenger → Webhooks. Suscríbete a messages, messaging_postbacks. Usa la URL y verify token que te proporcionamos." },
    ],
  },
  {
    key: "tiktok",
    label: "TikTok Business",
    icon: "🎵",
    provider: "TikTok",
    color: "bg-foreground/10 text-foreground",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "act.xxx...", type: "password", required: true },
      { key: "client_key", label: "Client Key", placeholder: "abc123...", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", placeholder: "xyz789...", type: "password", required: true },
    ],
    steps: [
      { title: "Crear App en TikTok Developers", description: "Ve a developers.tiktok.com y crea una nueva aplicación. Selecciona los permisos de 'TikTok Login Kit' y 'Content Posting API'.", link: "https://developers.tiktok.com/apps/" },
      { title: "Configurar permisos", description: "En los detalles de tu app, solicita los permisos necesarios: user.info.basic, video.list, direct_message. Envía para revisión." },
      { title: "Obtener Client Key y Secret", description: "En tu app → Manage → copia el 'Client Key' y 'Client Secret' que aparecen en la sección de configuración." },
      { title: "Generar Access Token", description: "Usa el flujo de OAuth 2.0 para obtener un Access Token. Puedes usar el 'Token Generator' en el portal de desarrolladores." },
      { title: "Configurar Webhook", description: "En tu app → Webhooks → configura la URL de callback con la URL que te proporcionamos para recibir mensajes." },
    ],
  },
] as const;

export type ChannelKey = typeof CHANNELS[number]["key"];

export const useChannelCredentials = () => {
  const { businessId } = useBusiness();
  const [credentials, setCredentials] = useState<ChannelCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("channel_credentials")
      .select("*")
      .eq("clinic_id", businessId);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setCredentials((data || []) as unknown as ChannelCredential[]);
    setLoading(false);
  }, [businessId]);

  const saveCredentials = async (channel: string, fields: Record<string, string>) => {
    if (!businessId) return false;
    const existing = credentials.find(c => c.channel === channel);
    if (existing) {
      const { error } = await supabase
        .from("channel_credentials")
        .update({ credentials: fields as any, setup_completed: true, is_active: true })
        .eq("id", existing.id);
      if (error) { toast.error(error.message); return false; }
    } else {
      const { error } = await supabase
        .from("channel_credentials")
        .insert({ clinic_id: businessId, channel, credentials: fields as any, setup_completed: true, is_active: true });
      if (error) { toast.error(error.message); return false; }
    }
    toast.success("Credenciales guardadas correctamente");
    await fetchCredentials();
    return true;
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("channel_credentials")
      .update({ is_active: active })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(active ? "Canal activado" : "Canal desactivado");
    await fetchCredentials();
  };

  const deleteCredential = async (id: string) => {
    const { error } = await supabase
      .from("channel_credentials")
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Canal eliminado");
    await fetchCredentials();
  };

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  const getChannelStatus = (channelKey: string) => {
    const cred = credentials.find(c => c.channel === channelKey);
    if (!cred) return "no_configurado";
    if (cred.is_active && cred.setup_completed) return "activo";
    if (cred.setup_completed) return "inactivo";
    return "pendiente";
  };

  return { credentials, loading, saveCredentials, toggleActive, deleteCredential, getChannelStatus, fetchCredentials };
};
