import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface CRMContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  funnel_stage: string;
  tags: string[] | null;
  notes: string | null;
  source: string | null;
  location: string | null;
  patient_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  contact_id: string;
  call_type: string;
  duration_seconds: number;
  outcome: string;
  notes: string;
  created_at: string;
  logged_by: string | null;
}

export const FUNNEL_STAGES = [
  { value: "nuevos", label: "Nuevos", color: "bg-blue-500" },
  { value: "contactado", label: "Contactado", color: "bg-yellow-500" },
  { value: "interesado", label: "Interesado", color: "bg-orange-500" },
  { value: "cita_agendada", label: "Cita Agendada", color: "bg-purple-500" },
  { value: "convertido", label: "Convertido", color: "bg-green-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];

export const CALL_OUTCOMES = [
  { value: "contestada", label: "Contestada" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "buzon", label: "Buzón de voz" },
  { value: "ocupado", label: "Ocupado" },
  { value: "callback", label: "Devolver llamada" },
];

export const useCRM = () => {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchContacts = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    let query = supabase
      .from("contacts")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });

    if (stageFilter !== "todos") {
      query = query.eq("funnel_stage", stageFilter);
    }
    if (searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (!error) setContacts(data || []);
    setLoading(false);
  }, [clinicId, stageFilter, searchQuery]);

  const fetchCallLogs = useCallback(async (contactId: string) => {
    if (!clinicId) return;
    const { data } = await supabase
      .from("call_logs")
      .select("*")
      .eq("contact_id", contactId)
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });
    setCallLogs(data || []);
  }, [clinicId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    if (selectedContact) fetchCallLogs(selectedContact.id);
    else setCallLogs([]);
  }, [selectedContact, fetchCallLogs]);

  const createContact = async (data: { name: string; phone: string; email?: string; notes?: string; source?: string }) => {
    if (!clinicId) return;
    const { error } = await supabase.from("contacts").insert({
      clinic_id: clinicId,
      name: data.name,
      phone: data.phone,
      email: data.email || "",
      notes: data.notes || "",
      source: data.source || "call_center",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contacto creado" });
      fetchContacts();
    }
  };

  const updateContact = async (id: string, data: Partial<CRMContact>) => {
    const { error } = await supabase.from("contacts").update(data).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contacto actualizado" });
      fetchContacts();
      if (selectedContact?.id === id) {
        setSelectedContact(prev => prev ? { ...prev, ...data } : null);
      }
    }
  };

  const logCall = async (contactId: string, data: { call_type: string; outcome: string; notes: string; duration_seconds: number }) => {
    if (!clinicId) return;
    const { error } = await supabase.from("call_logs").insert({
      clinic_id: clinicId,
      contact_id: contactId,
      logged_by: user?.id,
      ...data,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Llamada registrada" });
      fetchCallLogs(contactId);
    }
  };

  const convertToPatient = async (contact: CRMContact) => {
    if (!clinicId) return;
    const names = contact.name.trim().split(" ");
    const firstName = names[0] || contact.name;
    const lastName = names.slice(1).join(" ") || "";

    const { data: patient, error } = await supabase.from("patients").insert({
      clinic_id: clinicId,
      first_name: firstName,
      last_name: lastName,
      email: contact.email || "",
      phone: contact.phone,
      notes: contact.notes || "",
    }).select("id").single();

    if (error) {
      toast({ title: "Error al crear paciente", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("contacts").update({
      patient_id: patient.id,
      funnel_stage: "convertido",
    }).eq("id", contact.id);

    toast({ title: "¡Contacto convertido a paciente!", description: `${contact.name} ahora es paciente de la clínica.` });
    fetchContacts();
    if (selectedContact?.id === contact.id) {
      setSelectedContact(prev => prev ? { ...prev, patient_id: patient.id, funnel_stage: "convertido" } : null);
    }
  };

  return {
    contacts, callLogs, loading, selectedContact, stageFilter, searchQuery,
    setSelectedContact, setStageFilter, setSearchQuery,
    createContact, updateContact, logCall, convertToPatient, fetchContacts,
  };
};
