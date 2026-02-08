import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { toast } from "sonner";

export interface Contact {
  id: string;
  name: string;
  phone: string;
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
  const { clinicId } = useClinic();
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

    // Update conversation preview
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.trim().substring(0, 100),
    }).eq("id", selectedConversation.id);

    setSendingMessage(false);
  };

  const updateContactStage = async (contactId: string, stage: string) => {
    const { error } = await supabase.from("contacts").update({ funnel_stage: stage }).eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    // Update local state
    setConversations(prev => prev.map(c =>
      c.contact_id === contactId ? { ...c, contact: c.contact ? { ...c.contact, funnel_stage: stage } : c.contact } : c
    ));
    if (selectedConversation?.contact_id === contactId && selectedConversation.contact) {
      setSelectedConversation({ ...selectedConversation, contact: { ...selectedConversation.contact, funnel_stage: stage } });
    }
    toast.success("Etapa actualizada");
  };

  let filteredConversations = funnelFilter === "todos"
    ? conversations
    : conversations.filter(c => c.contact?.funnel_stage === funnelFilter);

  if (channelFilter !== "todos") {
    filteredConversations = filteredConversations.filter(c => (c.channel || "whatsapp") === channelFilter);
  }

  useEffect(() => { fetchConversations(); }, [clinicId]);

  // Realtime subscription
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
          setMessages(prev => [...prev, newMsg]);
        }
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, selectedConversation?.id]);

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
    fetchConversations,
  };
};
