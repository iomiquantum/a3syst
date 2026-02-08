import { useState, useEffect } from "react";
import { Plus, Eye, Download, Filter, DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saleSchema, getValidationError } from "@/lib/validations";

const VentasPage = () => {
  const { clinicId } = useClinic();
  const [sales, setSales] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    patient_id: "", branch_id: "", treatment_id: "", amount: "",
    discount: "0", status: "pendiente" as "abonado" | "parcial" | "pendiente",
    payment_method_id: "", origin: "", notes: "",
  });

  const fetchData = async () => {
    if (!clinicId) return;
    const [{ data: s }, { data: p }, { data: t }, { data: b }, { data: pm }] = await Promise.all([
      supabase.from("sales").select("*, patients(first_name, last_name), treatments(name), branches(name), payment_methods(name)").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("patients").select("id, first_name, last_name").eq("clinic_id", clinicId).order("first_name"),
      supabase.from("treatments").select("id, name, price").eq("clinic_id", clinicId),
      supabase.from("branches").select("id, name").eq("clinic_id", clinicId),
      supabase.from("payment_methods").select("id, name").eq("clinic_id", clinicId),
    ]);
    setSales(s || []);
    setPatients(p || []);
    setTreatments(t || []);
    setBranches(b || []);
    setPaymentMethods(pm || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clinicId]);

  const filtered = statusFilter === "all" ? sales : sales.filter(s => s.status === statusFilter);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "abonado": return "bg-success/10 text-success";
      case "pendiente": return "bg-warning/10 text-warning";
      case "parcial": return "bg-info/10 text-info";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const calcFinal = (amount: number, discount: number) => amount - (amount * discount / 100);

  const totalAbonado = sales.filter(s => s.status === "abonado").reduce((sum, s) => sum + calcFinal(Number(s.amount), Number(s.discount)), 0);
  const totalIngresos = sales.reduce((sum, s) => sum + calcFinal(Number(s.amount), Number(s.discount)), 0);
  const totalPendiente = sales.filter(s => s.status === "pendiente").reduce((sum, s) => sum + calcFinal(Number(s.amount), Number(s.discount)), 0);

  const stats = [
    { label: "Total Abonado", value: `$${totalAbonado.toLocaleString()}`, icon: DollarSign, color: "text-success", bg: "bg-success/10" },
    { label: "Total Ventas", value: String(sales.length), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Ingresos Totales", value: `$${totalIngresos.toLocaleString()}`, icon: CreditCard, color: "text-info", bg: "bg-info/10" },
    { label: "Pendientes", value: `$${totalPendiente.toLocaleString()}`, icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
  ];

  const handleSave = async () => {
    if (!clinicId) return;
    try {
      const validated = saleSchema.parse({
        ...form,
        amount: parseFloat(form.amount) || 0,
        discount: parseFloat(form.discount) || 0,
      });
      const { error } = await supabase.from("sales").insert({
        clinic_id: clinicId,
        patient_id: validated.patient_id,
        branch_id: validated.branch_id || null,
        treatment_id: validated.treatment_id || null,
        amount: validated.amount,
        discount: validated.discount,
        status: validated.status,
        payment_method_id: validated.payment_method_id || null,
        origin: validated.origin || "",
        notes: validated.notes || "",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Venta creada");
      setOpen(false);
      setForm({ patient_id: "", branch_id: "", treatment_id: "", amount: "", discount: "0", status: "pendiente", payment_method_id: "", origin: "", notes: "" });
      fetchData();
    } catch (e) {
      toast.error(getValidationError(e));
    }
  };

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    setForm({ ...form, treatment_id: treatmentId, amount: treatment ? String(treatment.price) : form.amount });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
            <p className="text-muted-foreground">Registro y control de operaciones</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nueva Venta</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Paciente *</Label>
                    <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                      <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sucursal</Label>
                      <Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Origen</Label>
                      <Select value={form.origin} onValueChange={v => setForm({ ...form, origin: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {["Instagram", "Facebook", "Recomendación", "Publicidad", "Otro"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Tratamiento</Label>
                    <Select value={form.treatment_id} onValueChange={handleTreatmentChange}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar tratamiento" /></SelectTrigger>
                      <SelectContent>{treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name} - ${Number(t.price).toLocaleString()}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Monto *</Label>
                      <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min={0} />
                    </div>
                    <div>
                      <Label>Estado de pago</Label>
                      <Select value={form.status} onValueChange={(v: "abonado" | "parcial" | "pendiente") => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="abonado">Abonado</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} min={0} max={100} />
                    </div>
                  </div>
                  <div>
                    <Label>Medio de pago</Label>
                    <Select value={form.payment_method_id} onValueChange={v => setForm({ ...form, payment_method_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!form.patient_id || !form.amount}>Crear Venta</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="abonado">Abonado</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-8 text-center text-muted-foreground">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">No hay ventas registradas.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Fecha", "Paciente", "Tratamiento", "Monto", "Descuento", "Total", "Estado", "Acciones"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString("es-ES")}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{s.patients ? `${s.patients.first_name} ${s.patients.last_name}` : "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.treatments?.name || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground">${Number(s.amount).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{Number(s.discount)}%</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">${calcFinal(Number(s.amount), Number(s.discount)).toLocaleString()}</td>
                      <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyle(s.status)}`}>{statusLabel(s.status)}</span></td>
                      <td className="px-5 py-3.5">
                        <Dialog open={detailSale?.id === s.id} onOpenChange={o => setDetailSale(o ? s : null)}>
                          <button onClick={() => setDetailSale(s)} className="p-1.5 rounded-md hover:bg-muted"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Detalle de Venta</DialogTitle></DialogHeader>
                            <div className="space-y-3 pt-2 text-sm">
                              <div className="grid grid-cols-2 gap-3">
                                <div><p className="text-muted-foreground">Paciente</p><p className="font-medium text-foreground">{s.patients ? `${s.patients.first_name} ${s.patients.last_name}` : "-"}</p></div>
                                <div><p className="text-muted-foreground">Fecha</p><p className="font-medium text-foreground">{new Date(s.created_at).toLocaleDateString("es-ES")}</p></div>
                                <div><p className="text-muted-foreground">Sucursal</p><p className="font-medium text-foreground">{s.branches?.name || "-"}</p></div>
                                <div><p className="text-muted-foreground">Origen</p><p className="font-medium text-foreground">{s.origin || "-"}</p></div>
                                <div><p className="text-muted-foreground">Tratamiento</p><p className="font-medium text-foreground">{s.treatments?.name || "-"}</p></div>
                                <div><p className="text-muted-foreground">Medio de pago</p><p className="font-medium text-foreground">{s.payment_methods?.name || "-"}</p></div>
                                <div><p className="text-muted-foreground">Monto</p><p className="font-medium text-foreground">${Number(s.amount).toLocaleString()}</p></div>
                                <div><p className="text-muted-foreground">Descuento</p><p className="font-medium text-foreground">{Number(s.discount)}%</p></div>
                              </div>
                              <div className="border-t border-border pt-3 flex items-center justify-between">
                                <span className="font-medium text-foreground">Total Final</span>
                                <span className="text-lg font-bold text-foreground">${calcFinal(Number(s.amount), Number(s.discount)).toLocaleString()}</span>
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyle(s.status)}`}>{statusLabel(s.status)}</span>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default VentasPage;
