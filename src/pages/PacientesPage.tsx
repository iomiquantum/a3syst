import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Plus, Pencil, Eye, Users, Calendar, Bot, X,
  ChevronLeft, ChevronRight, DollarSign, Clock
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClinic } from "@/hooks/useClinic";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { patientSchema, getValidationError } from "@/lib/validations";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import PatientFilePanel from "@/components/patients/PatientFilePanel";

const PAGE_SIZE = 20;

type ActivityStatus = "activo" | "irregular" | "inactivo";

interface PatientWithActivity {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  document: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  activity: ActivityStatus;
  lastApptDate: string | null;
}

const getActivityBadge = (a: ActivityStatus) => {
  switch (a) {
    case "activo": return { label: "Activo", cls: "bg-emerald-500/15 text-emerald-400" };
    case "irregular": return { label: "Irregular", cls: "bg-yellow-500/15 text-yellow-400" };
    case "inactivo": return { label: "Inactivo", cls: "bg-red-500/15 text-red-400" };
  }
};

const initials = (p: { first_name: string; last_name: string }) =>
  `${(p.first_name || "")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();

const PacientesPage = () => {
  const { clinicId } = useClinic();
  const { labels } = useBusinessLabels();

  const [patients, setPatients] = useState<PatientWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(0);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", dob: "", document: "", notes: "" });

  // Detail panel
  const [selectedPatient, setSelectedPatient] = useState<PatientWithActivity | null>(null);
  const [detailAppts, setDetailAppts] = useState<any[]>([]);
  const [detailSales, setDetailSales] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const [{ data: pats }, { data: appts }] = await Promise.all([
      supabase.from("patients").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("appointments").select("patient_id, date").eq("clinic_id", clinicId).order("date", { ascending: false }),
    ]);

    // Build a map of latest appointment per patient
    const latestAppt: Record<string, string> = {};
    (appts || []).forEach(a => {
      if (!latestAppt[a.patient_id]) latestAppt[a.patient_id] = a.date;
    });

    const now = Date.now();
    const oneMonth = 30 * 86400000;
    const threeMonths = 90 * 86400000;

    const enriched: PatientWithActivity[] = (pats || []).map(p => {
      const lastDate = latestAppt[p.id];
      let activity: ActivityStatus = "inactivo";
      if (lastDate) {
        const diff = now - new Date(lastDate).getTime();
        if (diff <= oneMonth) activity = "activo";
        else if (diff <= threeMonths) activity = "irregular";
      }
      return { ...p, activity, lastApptDate: lastDate || null };
    });

    setPatients(enriched);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // Filtering
  const filtered = useMemo(() => {
    let list = patients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "todos") {
      list = list.filter(p => p.activity === statusFilter);
    }
    return list;
  }, [patients, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Save
  const handleSave = async () => {
    if (!clinicId) return;
    try {
      const validated = patientSchema.parse(form);
      const payload = {
        first_name: validated.first_name, last_name: validated.last_name, email: validated.email,
        phone: validated.phone || "", date_of_birth: validated.dob || null,
        document: validated.document || "", notes: validated.notes || "",
      };

      if (editingId) {
        const { error } = await supabase.from("patients").update(payload).eq("id", editingId);
        if (error) { toast.error(error.message); return; }
        toast.success("✅ Paciente actualizado");
      } else {
        const { error } = await supabase.from("patients").insert({ clinic_id: clinicId, ...payload });
        if (error) { toast.error(error.message); return; }
        toast.success("✅ Paciente creado exitosamente");
      }
      closeModal();
      fetchPatients();
    } catch (e) {
      toast.error(getValidationError(e));
    }
  };

  const openEdit = (p: PatientWithActivity) => {
    setEditingId(p.id);
    setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email || "", phone: p.phone || "", dob: p.date_of_birth || "", document: p.document || "", notes: p.notes || "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ first_name: "", last_name: "", email: "", phone: "", dob: "", document: "", notes: "" });
  };

  // Detail
  const openDetail = async (p: PatientWithActivity) => {
    setSelectedPatient(p);
    setDetailLoading(true);
    const [{ data: appts }, { data: sales }] = await Promise.all([
      supabase.from("appointments").select("*, treatments(name), professionals(full_name)").eq("patient_id", p.id).order("date", { ascending: false }).limit(20),
      supabase.from("sales").select("*, treatments(name)").eq("patient_id", p.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setDetailAppts(appts || []);
    setDetailSales(sales || []);
    setDetailLoading(false);
  };

  const apptStatusBadge = (status: string) => {
    switch (status) {
      case "confirmado": return "bg-blue-500/15 text-blue-400";
      case "completado": return "bg-emerald-500/15 text-emerald-400";
      case "cancelado": return "bg-red-500/15 text-red-400";
      default: return "bg-yellow-500/15 text-yellow-400";
    }
  };

  const monthsSinceLastAppt = (p: PatientWithActivity) => {
    if (!p.lastApptDate) return null;
    const diff = Date.now() - new Date(p.lastApptDate).getTime();
    return Math.floor(diff / (30 * 86400000));
  };

  // ──────────────── RENDER ────────────────
  return (
    <AppLayout>
      <div className="flex gap-6 h-full">
        {/* ═══ LEFT: LIST ═══ */}
        <div className={`flex-1 space-y-5 min-w-0 ${selectedPatient ? "hidden lg:block" : ""}`}>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">👥 {labels.patients}</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} {labels.patients.toLowerCase()}</p>
            </div>
            <Button
              onClick={() => { closeModal(); setModalOpen(true); }}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:opacity-90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo {labels.patients_singular || "paciente"}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-10 h-9 bg-white/5 border-white/10 text-foreground placeholder:text-white/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">🟢 Activos</SelectItem>
                <SelectItem value="irregular">🟡 Irregulares</SelectItem>
                <SelectItem value="inactivo">🔴 Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table / Cards */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <Skeleton className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40 bg-white/5" />
                    <Skeleton className="h-3 w-60 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.03]">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <Users className="w-14 h-14 text-muted-foreground mb-4" />
                <p className="text-foreground font-semibold text-lg">
                  {search ? "Sin resultados" : `Aún no tienes ${labels.patients.toLowerCase()} registrados`}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {search ? "Intenta con otro término" : `Agrega tu primer ${labels.patients_singular?.toLowerCase() || "paciente"} para que la IA empiece a trabajar`}
                </p>
                {!search && (
                  <Button
                    onClick={() => { closeModal(); setModalOpen(true); }}
                    className="mt-6 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Agregar primer {labels.patients_singular?.toLowerCase() || "paciente"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Card className="border-white/5 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Nombre</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Contacto</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Nacimiento</th>
                        <th className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Estado</th>
                        <th className="text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(p => {
                        const badge = getActivityBadge(p.activity);
                        return (
                          <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => openDetail(p)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-white">{initials(p)}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{p.first_name} {p.last_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{p.phone || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {p.date_of_birth ? format(new Date(p.date_of_birth), "dd/MM/yyyy") : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openDetail(p)} className="p-1.5 rounded-md hover:bg-white/5"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                                <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-white/5"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                                {p.activity === "inactivo" && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="p-1.5 rounded-md hover:bg-[#8B5CF6]/10"><Bot className="w-4 h-4 text-[#A78BFA]" /></button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>La IA puede enviar una oferta de reactivación</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {paged.map(p => {
                  const badge = getActivityBadge(p.activity);
                  return (
                    <Card key={p.id} className="border-white/5 bg-white/[0.03] cursor-pointer" onClick={() => openDetail(p)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-white">{initials(p)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ RIGHT: DETAIL PANEL ═══ */}
        {selectedPatient && (
          <div className="w-full lg:w-[420px] shrink-0 space-y-5 overflow-y-auto">
            {/* Back button mobile */}
            <button onClick={() => setSelectedPatient(null)} className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>

            {/* Patient header */}
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{initials(selectedPatient)}</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                      <p className="text-xs text-muted-foreground">{selectedPatient.email}</p>
                      {selectedPatient.phone && <p className="text-xs text-muted-foreground">{selectedPatient.phone}</p>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="hidden lg:block p-1 hover:bg-white/5 rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  {(() => { const b = getActivityBadge(selectedPatient.activity); return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${b.cls}`}>{b.label}</span>; })()}
                  {selectedPatient.date_of_birth && <span className="text-xs text-muted-foreground">📅 {format(new Date(selectedPatient.date_of_birth), "dd/MM/yyyy")}</span>}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="border-white/10 text-foreground hover:bg-white/5" onClick={() => openEdit(selectedPatient)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white hover:opacity-90">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Agendar cita
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            {selectedPatient.activity === "inactivo" && (
              <Card className="border-[#8B5CF6]/20 bg-[#8B5CF6]/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-[#A78BFA] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">
                        Este paciente no viene hace {monthsSinceLastAppt(selectedPatient) || "mucho"} meses.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">¿Enviar oferta de reactivación?</p>
                      <Button size="sm" className="mt-2 bg-[#8B5CF6]/20 text-[#A78BFA] hover:bg-[#8B5CF6]/30 text-xs h-7">
                        <Bot className="w-3 h-3 mr-1" /> Reactivar con IA
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appointments history */}
            <Card className="border-white/5 bg-white/[0.03]">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> Historial de citas
                </h3>
                {detailLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 bg-white/5" />)}</div>
                ) : detailAppts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No hay citas registradas</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detailAppts.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{a.treatments?.name || "Sin servicio"}</p>
                          <p className="text-[10px] text-muted-foreground">{a.date} · {a.time?.slice(0, 5)} {a.professionals?.full_name ? `· ${a.professionals.full_name}` : ""}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${apptStatusBadge(a.status)}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales history */}
            <Card className="border-white/5 bg-white/[0.03]">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" /> Historial de ventas
                </h3>
                {detailLoading ? (
                  <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 bg-white/5" />)}</div>
                ) : detailSales.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No hay ventas registradas</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detailSales.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{s.treatments?.name || "Venta"}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(s.created_at), "dd/MM/yyyy")}</p>
                        </div>
                        <span className="text-xs font-semibold text-foreground">${Number(s.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ═══ CREATE/EDIT MODAL ═══ */}
      <Dialog open={modalOpen} onOpenChange={o => { if (!o) closeModal(); else setModalOpen(true); }}>
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar paciente" : "Nuevo paciente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre *</Label>
                <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} maxLength={100}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Apellido *</Label>
                <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} maxLength={100}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={255}
                className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={20}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Documento/ID</Label>
                <Input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} maxLength={50}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha de nacimiento</Label>
              <Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })}
                className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={5000}
                placeholder="Alergias, condiciones especiales..."
                className="bg-white/5 border-white/10 text-foreground mt-1 min-h-[80px]" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={closeModal} className="flex-1 border-white/10 text-foreground hover:bg-white/5">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.first_name || !form.last_name || !form.email}
                className="flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white hover:opacity-90">
                {editingId ? "Guardar cambios" : "Crear paciente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PacientesPage;
