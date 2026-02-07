import { useState } from "react";
import { Plus, Eye, Download, Filter, DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialSales = [
  { id: "V-001", date: "2025-02-05", patient: "María García", branch: "Sede Central", treatment: "Blanqueamiento", amount: 15000, discount: 0, status: "Abonado", paymentMethod: "Tarjeta", origin: "Instagram" },
  { id: "V-002", date: "2025-02-04", patient: "Carlos López", branch: "Sede Central", treatment: "Consulta general", amount: 3000, discount: 10, status: "Abonado", paymentMethod: "Efectivo", origin: "Recomendación" },
  { id: "V-003", date: "2025-02-04", patient: "Ana Martínez", branch: "Sucursal Norte", treatment: "Limpieza dental", amount: 5000, discount: 0, status: "Pendiente", paymentMethod: "Transferencia", origin: "Facebook" },
  { id: "V-004", date: "2025-02-03", patient: "Roberto Díaz", branch: "Sede Central", treatment: "Extracción", amount: 8000, discount: 15, status: "Parcial", paymentMethod: "Efectivo", origin: "Instagram" },
  { id: "V-005", date: "2025-02-02", patient: "Lucía Fernández", branch: "Sede Central", treatment: "Control anual", amount: 4000, discount: 0, status: "Abonado", paymentMethod: "Tarjeta", origin: "Publicidad" },
  { id: "V-006", date: "2025-02-01", patient: "Pedro Sánchez", branch: "Sucursal Norte", treatment: "Blanqueamiento", amount: 15000, discount: 20, status: "Pendiente", paymentMethod: "Transferencia", origin: "Recomendación" },
];

const stats = [
  { label: "Total Abonado", value: "$22,000", icon: DollarSign, color: "text-success", bg: "bg-success/10" },
  { label: "Total Ventas", value: "6", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  { label: "Ingresos Totales", value: "$50,000", icon: CreditCard, color: "text-info", bg: "bg-info/10" },
  { label: "Pendientes", value: "$27,000", icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
];

const VentasPage = () => {
  const [sales] = useState(initialSales);
  const [open, setOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<typeof initialSales[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all" ? sales : sales.filter(s => s.status === statusFilter);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case "Abonado": return "bg-success/10 text-success";
      case "Pendiente": return "bg-warning/10 text-warning";
      case "Parcial": return "bg-info/10 text-info";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const calcFinal = (amount: number, discount: number) => amount - (amount * discount / 100);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
            <p className="text-muted-foreground">Registro y control de operaciones</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Exportar Excel
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nueva Venta</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Paciente *</Label><Input placeholder="Buscar paciente..." /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sucursal *</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="central">Sede Central</SelectItem>
                          <SelectItem value="norte">Sucursal Norte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Origen</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {["Instagram","Facebook","Recomendación","Publicidad","Otro"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Tratamiento *</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Seleccionar tratamiento" /></SelectTrigger>
                      <SelectContent>
                        {["Limpieza dental","Consulta general","Blanqueamiento","Control anual","Extracción"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Estado de pago</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="abonado">Abonado</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Medio de pago</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Medio" /></SelectTrigger>
                        <SelectContent>
                          {["Efectivo","Tarjeta","Transferencia"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Descuento (%)</Label><Input type="number" placeholder="0" /></div>
                  </div>
                  <Button className="w-full gradient-primary text-primary-foreground">Crear Venta</Button>
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
              <SelectItem value="Abonado">Abonado</SelectItem>
              <SelectItem value="Parcial">Parcial</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["ID","Fecha","Paciente","Tratamiento","Monto","Descuento","Total","Estado","Acciones"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-mono text-primary">{s.id}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.date}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{s.patient}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.treatment}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">${s.amount.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.discount}%</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">${calcFinal(s.amount, s.discount).toLocaleString()}</td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyle(s.status)}`}>{s.status}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Dialog open={detailSale?.id === s.id} onOpenChange={o => setDetailSale(o ? s : null)}>
                          <DialogTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-muted"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Detalle de Venta {s.id}</DialogTitle></DialogHeader>
                            <div className="space-y-3 pt-2 text-sm">
                              <div className="grid grid-cols-2 gap-3">
                                <div><p className="text-muted-foreground">Paciente</p><p className="font-medium text-foreground">{s.patient}</p></div>
                                <div><p className="text-muted-foreground">Fecha</p><p className="font-medium text-foreground">{s.date}</p></div>
                                <div><p className="text-muted-foreground">Sucursal</p><p className="font-medium text-foreground">{s.branch}</p></div>
                                <div><p className="text-muted-foreground">Origen</p><p className="font-medium text-foreground">{s.origin}</p></div>
                                <div><p className="text-muted-foreground">Tratamiento</p><p className="font-medium text-foreground">{s.treatment}</p></div>
                                <div><p className="text-muted-foreground">Medio de pago</p><p className="font-medium text-foreground">{s.paymentMethod}</p></div>
                                <div><p className="text-muted-foreground">Monto</p><p className="font-medium text-foreground">${s.amount.toLocaleString()}</p></div>
                                <div><p className="text-muted-foreground">Descuento</p><p className="font-medium text-foreground">{s.discount}%</p></div>
                              </div>
                              <div className="border-t border-border pt-3 flex items-center justify-between">
                                <span className="font-medium text-foreground">Total Final</span>
                                <span className="text-lg font-bold text-foreground">${calcFinal(s.amount, s.discount).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyle(s.status)}`}>{s.status}</span>
                                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Comprobante PDF</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <button className="p-1.5 rounded-md hover:bg-muted"><Download className="w-4 h-4 text-muted-foreground" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default VentasPage;
