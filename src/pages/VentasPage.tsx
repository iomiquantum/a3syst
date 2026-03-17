import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, DollarSign, TrendingUp, Clock, AlertTriangle, Search,
  Check, X, Eye, Settings, Trash2, Bot, ChevronLeft, ChevronRight
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/hooks/useBusiness";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saleSchema, getValidationError } from "@/lib/validations";
import { format } from "date-fns";

const PAGE_SIZE = 20;

const calcFinal = (amount: number, discount: number) => amount - (amount * discount / 100);

const statusStyle = (s: string) => {
  switch (s) {
    case "abonado": return "bg-emerald-500/15 text-emerald-400";
    case "parcial": return "bg-yellow-500/15 text-yellow-400";
    case "pendiente": return "bg-red-500/15 text-red-400";
    default: return "bg-white/5 text-muted-foreground";
  }
};

const VentasPage = () => {
  const { businessId } = useBusiness();
  const { labels } = useBusinessLabels();

  const [sales, setSales] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [pmOpen, setPmOpen] = useState(false);
  const [newPmName, setNewPmName] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  // AI suggestions
  const [completedWithoutSale, setCompletedWithoutSale] = useState<any[]>([]);
  const [oldPending, setOldPending] = useState<any[]>([]);

  const [form, setForm] = useState({
    patient_id: "", treatment_id: "", amount: "", discount: "0",
    status: "pendiente" as "abonado" | "parcial" | "pendiente",
    payment_method_id: "", notes: "",
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [{ data: s }, { data: p }, { data: t }, { data: pm }] = await Promise.all([
      supabase.from("sales")
        .select("*, patients(first_name, last_name), treatments(name), payment_methods(name)")
        .eq("clinic_id", businessId).order("created_at", { ascending: false }),
      supabase.from("patients").select("id, first_name, last_name").eq("clinic_id", businessId).order("first_name"),
      supabase.from("treatments").select("id, name, price, duration").eq("clinic_id", businessId),
      supabase.from("payment_methods").select("id, name").eq("clinic_id", businessId),
    ]);
    setSales(s || []);
    setPatients(p || []);
    setTreatments(t || []);
    setPaymentMethods(pm || []);

    // AI: completed appointments today without sales
    const { data: completedToday } = await supabase
      .from("appointments")
      .select("id, patient_id, treatment_id, patients(first_name, last_name), treatments(name, price)")
      .eq("clinic_id", businessId)
      .eq("date", todayStr)
      .eq("status", "completado");

    const salePatientIds = new Set((s || []).filter(x => x.created_at?.startsWith(todayStr)).map(x => x.patient_id));
    setCompletedWithoutSale((completedToday || []).filter(a => !salePatientIds.has(a.patient_id)));

    // AI: old pending sales
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    setOldPending((s || []).filter(x => x.status === "pendiente" && x.created_at < sevenDaysAgo));

    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs
  const kpis = useMemo(() => {
    const monthSales = sales.filter(s => s.created_at >= monthStart && s.status !== "cancelado");
    const todaySales = sales.filter(s => s.created_at?.startsWith(todayStr));
    const monthTotal = monthSales.reduce((sum, s) => sum + calcFinal(Number(s.amount), Number(s.discount)), 0);
    const todayTotal = todaySales.reduce((sum, s) => sum + calcFinal(Number(s.amount), Number(s.discount)), 0);
    const pendingTotal = sales.filter(s => s.status === "pendiente").reduce((sum, s) => sum + calcFinal(Number(s.amount), Number(s.discount)), 0);
    const avgTicket = monthSales.length > 0 ? monthTotal / monthSales.length : 0;
    return { monthTotal, todayTotal, pendingTotal, avgTicket };
  }, [sales, monthStart, todayStr]);

  // Filtering
  const filtered = useMemo(() => {
    let list = sales;
    if (statusFilter !== "all") list = list.filter(s => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => {
        const name = `${s.patients?.first_name || ""} ${s.patients?.last_name || ""}`.toLowerCase();
        return name.includes(q);
      });
    }
    return list;
  }, [sales, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Save
  const handleSave = async () => {
    if (!businessId) return;
    try {
      const validated = saleSchema.parse({
        ...form,
        amount: parseFloat(form.amount) || 0,
        discount: parseFloat(form.discount) || 0,
      });
      const { error } = await supabase.from("sales").insert({
        clinic_id: businessId,
        patient_id: validated.patient_id,
        treatment_id: validated.treatment_id || null,
        amount: validated.amount,
        discount: validated.discount,
        status: validated.status,
        payment_method_id: validated.payment_method_id || null,
        notes: validated.notes || "",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("✅ Venta registrada");
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (e) { toast.error(getValidationError(e)); }
  };

  const resetForm = () => {
    setForm({ patient_id: "", treatment_id: "", amount: "", discount: "0", status: "pendiente", payment_method_id: "", notes: "" });
    setPatientSearch("");
  };

  const handleTreatmentChange = (tid: string) => {
    const t = treatments.find(x => x.id === tid);
    setForm({ ...form, treatment_id: tid, amount: t ? String(t.price) : form.amount });
  };

  const quickRegisterSale = (apt: any) => {
    setForm({
      patient_id: apt.patient_id,
      treatment_id: apt.treatment_id || "",
      amount: String(apt.treatments?.price || 0),
      discount: "0",
      status: "abonado",
      payment_method_id: "",
      notes: "",
    });
    setCreateOpen(true);
  };

  // Payment methods
  const addPaymentMethod = async () => {
    if (!businessId || !newPmName.trim()) return;
    const { error } = await supabase.from("payment_methods").insert({ clinic_id: businessId, name: newPmName.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Método agregado");
    setNewPmName("");
    const { data } = await supabase.from("payment_methods").select("id, name").eq("clinic_id", businessId);
    setPaymentMethods(data || []);
  };

  const deletePaymentMethod = async (id: string) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
  };

  const filteredPatients = patientSearch
    ? patients.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 8)
    : patients.slice(0, 20);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">💰 {labels.sales || "Ventas"}</h1>
            <p className="text-sm text-muted-foreground">Autopilot de ventas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPmOpen(true)}
              className="border-white/10 text-foreground hover:bg-white/5">
              <Settings className="w-4 h-4 mr-1" /> Métodos de pago
            </Button>
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white hover:opacity-90 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Nueva venta
            </Button>
          </div>
        </div>

        {/* ═══ KPIs ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Ingresos del mes", value: `$${kpis.monthTotal.toLocaleString()}`, icon: DollarSign, color: "from-emerald-500 to-emerald-700" },
            { label: "Ventas hoy", value: `$${kpis.todayTotal.toLocaleString()}`, icon: TrendingUp, color: "from-[#8B5CF6] to-[#6D28D9]" },
            { label: "Pendientes de cobro", value: `$${kpis.pendingTotal.toLocaleString()}`, icon: Clock, color: "from-red-500 to-red-700" },
            { label: "Ticket promedio", value: `$${Math.round(kpis.avgTicket).toLocaleString()}`, icon: TrendingUp, color: "from-blue-500 to-blue-700" },
          ].map(s => (
            <Card key={s.label} className="border-white/5 bg-white/[0.03]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  {loading ? <Skeleton className="h-6 w-16 bg-white/5" /> : <p className="text-lg font-bold text-foreground">{s.value}</p>}
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ AI SUGGESTIONS ═══ */}
        {!loading && (completedWithoutSale.length > 0 || oldPending.length > 0) && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
              <Bot className="w-4 h-4 text-[#A78BFA]" /> Sugerencias de la IA
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {completedWithoutSale.slice(0, 4).map(apt => (
                <Card key={apt.id} className="border-white/10 bg-white/[0.03]">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Cita completada sin venta</p>
                        <p className="text-sm text-foreground mt-0.5">
                          {apt.treatments?.name || "Servicio"} para {apt.patients?.first_name} {apt.patients?.last_name}
                          {apt.treatments?.price ? ` ($${Number(apt.treatments.price).toLocaleString()})` : ""}
                        </p>
                        <button onClick={() => quickRegisterSale(apt)}
                          className="flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
                          <Check className="w-3.5 h-3.5" /> Registrar venta
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {oldPending.slice(0, 4).map(sale => {
                const daysOld = Math.floor((Date.now() - new Date(sale.created_at).getTime()) / 86400000);
                return (
                  <Card key={sale.id} className="border-yellow-500/10 bg-yellow-500/[0.03]">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
                          <p className="text-sm text-foreground mt-0.5">
                            {sale.patients?.first_name} {sale.patients?.last_name} — ${Number(sale.amount).toLocaleString()} hace {daysOld} días
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ FILTERS ═══ */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por paciente..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-10 h-9 bg-white/5 border-white/10 text-foreground placeholder:text-white/20" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40 h-9 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="abonado">✅ Abonado</SelectItem>
              <SelectItem value="parcial">🟡 Parcial</SelectItem>
              <SelectItem value="pendiente">🔴 Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ═══ TABLE ═══ */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 bg-white/5 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.03]">
            <CardContent className="py-16 text-center">
              <DollarSign className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-semibold text-lg">{search ? "Sin resultados" : "No hay ventas registradas"}</p>
              <p className="text-sm text-muted-foreground mt-1">Registra tu primera venta para empezar a trackear ingresos</p>
              {!search && (
                <Button onClick={() => { resetForm(); setCreateOpen(true); }}
                  className="mt-6 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Registrar primera venta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <Card className="border-white/5 bg-white/[0.03] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Fecha", "Paciente", "Servicio", "Monto", "Desc.", "Total", "Método", "Estado"].map(h => (
                        <th key={h} className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(s => (
                      <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(s.created_at), "dd/MM/yy")}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{s.patients?.first_name} {s.patients?.last_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.treatments?.name || "—"}</td>
                        <td className="px-4 py-3 text-sm text-foreground">${Number(s.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{Number(s.discount)}%</td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">${calcFinal(Number(s.amount), Number(s.discount)).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.payment_methods?.name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${statusStyle(s.status)}`}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {paged.map(s => (
                <Card key={s.id} className="border-white/5 bg-white/[0.03]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.patients?.first_name} {s.patients?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{s.treatments?.name || "—"} · {format(new Date(s.created_at), "dd/MM/yy")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">${calcFinal(Number(s.amount), Number(s.discount)).toLocaleString()}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle(s.status)}`}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ CREATE SALE DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); resetForm(); } else setCreateOpen(true); }}>
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-md">
          <DialogHeader><DialogTitle>Nueva venta</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Paciente *</Label>
              <div className="mt-1">
                <Input placeholder="Buscar paciente..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                  className="h-9 bg-white/5 border-white/10 text-foreground placeholder:text-white/20 mb-1" />
                {form.patient_id && (
                  <span className="text-xs text-[#A78BFA]">
                    ✓ {patients.find(p => p.id === form.patient_id)?.first_name} {patients.find(p => p.id === form.patient_id)?.last_name}
                  </span>
                )}
                {patientSearch && !form.patient_id && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-[#0d0d1a]">
                    {filteredPatients.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, patient_id: p.id }); setPatientSearch(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 truncate">
                        {p.first_name} {p.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Servicio</Label>
              <Select value={form.treatment_id} onValueChange={handleTreatmentChange}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — ${Number(t.price).toLocaleString()}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Monto *</Label>
                <Input type="number" value={form.amount} min={0}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descuento %</Label>
                <Input type="number" value={form.discount} min={0} max={100}
                  onChange={e => setForm({ ...form, discount: e.target.value })}
                  className="h-9 bg-white/5 border-white/10 text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total</Label>
                <div className="h-9 mt-1 flex items-center px-3 rounded-md border border-white/10 bg-white/[0.02] text-foreground font-semibold text-sm">
                  ${calcFinal(parseFloat(form.amount) || 0, parseFloat(form.discount) || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Método de pago</Label>
                <Select value={form.payment_method_id} onValueChange={v => setForm({ ...form, payment_method_id: v })}>
                  <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9 bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abonado">Abonado</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="bg-white/5 border-white/10 text-foreground mt-1 min-h-[60px]" maxLength={1000} />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} className="flex-1 border-white/10 hover:bg-white/5">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.patient_id || !form.amount}
                className="flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white hover:opacity-90">
                Registrar venta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ PAYMENT METHODS DIALOG ═══ */}
      <Dialog open={pmOpen} onOpenChange={setPmOpen}>
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-sm">
          <DialogHeader><DialogTitle>Métodos de pago</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <span className="text-sm text-foreground">{pm.name}</span>
                <button onClick={() => deletePaymentMethod(pm.id)} className="p-1 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newPmName} onChange={e => setNewPmName(e.target.value)} placeholder="Nuevo método..."
                className="h-9 bg-white/5 border-white/10 text-foreground flex-1" maxLength={50} />
              <Button size="sm" onClick={addPaymentMethod} disabled={!newPmName.trim()}
                className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white">
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default VentasPage;
