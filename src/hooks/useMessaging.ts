import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  email: string;
  funnel_stage: string;
  tags: string[];
  notes: string;
  location: string;
  patient_id: string | null;
  source: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  chatbot_active: boolean;
  archived: boolean;
  visitor_contact: string | null;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  content: string;
  message_type: string;
  media_url: string | null;
  status: string;
  sent_by: string | null;
  created_at: string;
}

const FUNNEL_STAGES = [
  { key: "todos", label: "Todos", color: "text-primary" },
  { key: "nuevos", label: "Nuevos", color: "text-muted-foreground" },
  { key: "ads", label: "ADS", color: "text-muted-foreground" },
  { key: "contacto_1", label: "Contacto 1", color: "text-blue-500" },
  { key: "contacto_2", label: "Contacto 2", color: "text-blue-500" },
  { key: "no_responden", label: "No responden", color: "text-muted-foreground" },
  { key: "no_interesado", label: "No interesado", color: "text-destructive" },
  { key: "pidio_info", label: "Pidió info", color: "text-warning" },
  { key: "interesada", label: "Interesada", color: "text-warning" },
  { key: "por_agendar", label: "Por Agendar", color: "text-accent" },
  { key: "agendado", label: "Agendado", color: "text-success" },
  { key: "paciente_1ra", label: "Paciente 1ra Visita", color: "text-success" },
  { key: "paciente_tratamiento", label: "Paciente Tratamiento", color: "text-success" },
];

export { FUNNEL_STAGES };

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [funnelFilter, setFunnelFilter] = useState("todos");
  const [channelFilter, setChannelFilter] = useState("todos");

  const fetchConversations = async () => {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false });

    if (error) { toast.error(error.message); return; }

    // Fetch contacts for conversations
    const contactIds = (data || []).map(c => c.contact_id);
    let contactsMap: Record<string, Contact> = {};
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("*")
        .in("id", contactIds);
      (contacts || []).forEach(c => { contactsMap[c.id] = c as Contact; });
    }

    const enriched = (data || []).map(conv => ({
      ...conv,
      contact: contactsMap[conv.contact_id],
    })) as Conversation[];

    setConversations(enriched);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) { toast.error(error.message); return; }
    setMessages((data || []) as Message[]);
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await fetchMessages(conv.id);
    // Mark as read
    if (conv.unread_count > 0) {
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const sendMessage = async (content: string) => {
    if (!selectedConversation || !clinicId || !content.trim()) return;
    setSendingMessage(true);

    const channel = selectedConversation.channel || "whatsapp";
    const toNumber = selectedConversation.contact?.phone || selectedConversation.visitor_contact || "";

    // For WhatsApp conversations, send via the Edge Function (which handles Meta API + DB insert)
    if (channel === "whatsapp" && toNumber) {
      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            clinic_id: clinicId,
            to_number: toNumber,
            message_type: "text",
            content: content.trim(),
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Insert into local messages table for immediate UI update
        const { data: msgData } = await supabase.from("messages").insert({
          conversation_id: selectedConversation.id,
          clinic_id: clinicId,
          direction: "outbound",
          content: content.trim(),
          message_type: "text",
          status: "sent",
          whatsapp_message_id: data?.wa_message_id || null,
        }).select().single();

        if (msgData) {
          setMessages(prev => {
            if (prev.some(m => m.id === msgData.id)) return prev;
            return [...prev, msgData as Message];
          });
        }

        await supabase.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.trim().substring(0, 100),
        }).eq("id", selectedConversation.id);
      } catch (e: any) {
        toast.error(e.message || "Error al enviar mensaje de WhatsApp");
      }
      setSendingMessage(false);
      return;
    }

    // For non-WhatsApp channels, insert directly
    const newMsg = {
      conversation_id: selectedConversation.id,
      clinic_id: clinicId,
      direction: "outbound",
      content: content.trim(),
      message_type: "text",
      status: "sent",
    };

    const { data, error } = await supabase.from("messages").insert(newMsg).select().single();
    if (error) { toast.error(error.message); setSendingMessage(false); return; }

    setMessages(prev => [...prev, data as Message]);

    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.trim().substring(0, 100),
    }).eq("id", selectedConversation.id);

    setSendingMessage(false);
  };

  const updateContactStage = async (contactId: string, stage: string) => {
    const { error } = await supabase.from("contacts").update({ funnel_stage: stage }).eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    setConversations(prev => prev.map(c =>
      c.contact_id === contactId ? { ...c, contact: c.contact ? { ...c.contact, funnel_stage: stage } : c.contact } : c
    ));
    if (selectedConversation?.contact_id === contactId && selectedConversation.contact) {
      setSelectedConversation({ ...selectedConversation, contact: { ...selectedConversation.contact, funnel_stage: stage } });
    }
    toast.success("Etapa actualizada");
  };

  const toggleChatbot = async (conversationId: string, active: boolean) => {
    const { error } = await supabase.from("conversations").update({ chatbot_active: active }).eq("id", conversationId);
    if (error) { toast.error(error.message); return; }
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, chatbot_active: active } : c
    ));
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation({ ...selectedConversation, chatbot_active: active });
    }
    toast.success(active ? "Chatbot automático activado" : "Chatbot automático desactivado");
  };

  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    const { error } = await supabase.from("contacts").update(updates).eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    const applyUpdate = (c: Conversation) =>
      c.contact_id === contactId && c.contact ? { ...c, contact: { ...c.contact, ...updates } } : c;
    setConversations(prev => prev.map(applyUpdate));
    if (selectedConversation?.contact_id === contactId && selectedConversation.contact) {
      setSelectedConversation({ ...selectedConversation, contact: { ...selectedConversation.contact, ...updates } });
    }
    toast.success("Contacto actualizado");
  };

  let filteredConversations = funnelFilter === "todos"
    ? conversations
    : conversations.filter(c => c.contact?.funnel_stage === funnelFilter);

  if (channelFilter !== "todos") {
    filteredConversations = filteredConversations.filter(c => (c.channel || "whatsapp") === channelFilter);
  }

  useEffect(() => { fetchConversations(); }, [clinicId]);

  // Keep a ref to selectedConversation for realtime callback
  const selectedConvRef = useRef<Conversation | null>(null);
  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  // Realtime subscription — stable channel, uses ref to avoid stale closures
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("messages-realtime-" + clinicId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `clinic_id=eq.${clinicId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        const currentConv = selectedConvRef.current;
        if (currentConv && newMsg.conversation_id === currentConv.id) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    messages,
    selectedConversation,
    loading,
    sendingMessage,
    funnelFilter,
    channelFilter,
    setFunnelFilter,
    setChannelFilter,
    selectConversation,
    sendMessage,
    updateContactStage,
    updateContact,
    toggleChatbot,
    fetchConversations,
  };
};
