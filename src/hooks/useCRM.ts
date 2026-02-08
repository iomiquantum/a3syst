import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DatePreset, DateRange, AgentOption, getDateRangeFromPreset } from "@/components/crm/CRMFilters";

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
  const [datePreset, setDatePreset] = useState<DatePreset>("todos");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [agentFilter, setAgentFilter] = useState("todos");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin/super_admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user || !clinicId) return;
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
      if (isSuperAdmin) { setIsAdmin(true); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("clinic_id", clinicId);
      setIsAdmin(roles?.some(r => r.role === "admin") || false);
    };
    checkAdmin();
  }, [user, clinicId]);

  // Fetch agents (profiles with roles in this clinic)
  useEffect(() => {
    if (!clinicId || !isAdmin) return;
    const fetchAgents = async () => {
      const { data: roleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("clinic_id", clinicId);
      if (!roleUsers || roleUsers.length === 0) return;
      const userIds = roleUsers.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      setAgents((profiles || []).map(p => ({ id: p.user_id, name: p.full_name || p.user_id })));
    };
    fetchAgents();
  }, [clinicId, isAdmin]);

  const fetchContacts = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    // If agent filter is active, we need to find contact IDs from call_logs by that agent
    let agentContactIds: string[] | null = null;
    if (agentFilter !== "todos") {
      const { data: agentLogs } = await supabase
        .from("call_logs")
        .select("contact_id")
        .eq("clinic_id", clinicId)
        .eq("logged_by", agentFilter);
      agentContactIds = [...new Set((agentLogs || []).map(l => l.contact_id))];
      if (agentContactIds.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }
    }

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
    if (dateRange.from) {
      query = query.gte("created_at", dateRange.from.toISOString());
    }
    if (dateRange.to) {
      query = query.lte("created_at", dateRange.to.toISOString());
    }
    if (agentContactIds) {
      query = query.in("id", agentContactIds);
    }

    const { data, error } = await query;
    if (!error) setContacts(data || []);
    setLoading(false);
  }, [clinicId, stageFilter, searchQuery, dateRange, agentFilter]);

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
    datePreset, dateRange, agentFilter, agents, isAdmin,
    setSelectedContact, setStageFilter, setSearchQuery,
    setDatePreset, setDateRange, setAgentFilter,
    createContact, updateContact, logCall, convertToPatient, fetchContacts,
  };
};
