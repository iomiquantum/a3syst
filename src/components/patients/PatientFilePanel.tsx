import { useState, useEffect, useCallback } from "react";
import {
  X, Pencil, Calendar, Bot, DollarSign, Plus, Save, ChevronLeft,
  Heart, AlertTriangle, Pill, Phone, Shield, FileText, User, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

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
  activity: string;
  lastApptDate: string | null;
  // Medical fields
  blood_type?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  current_medications?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  insurance_provider?: string | null;
  insurance_number?: string | null;
  gender?: string | null;
  address?: string | null;
  occupation?: string | null;
}

interface Props {
  patient: PatientWithActivity;
  clinicId: string;
  onClose: () => void;
  onEdit: (p: PatientWithActivity) => void;
  onRefresh: () => void;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const PatientFilePanel = ({ patient, clinicId, onClose, onEdit, onRefresh }: Props) => {
  const { user } = useAuth();
  const [detailAppts, setDetailAppts] = useState<any[]>([]);
  const [detailSales, setDetailSales] = useState<any[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("info");

  // Medical info editing
  const [editingMedical, setEditingMedical] = useState(false);
  const [medForm, setMedForm] = useState({
    blood_type: "", allergies: "", chronic_conditions: "", current_medications: "",
    emergency_contact_name: "", emergency_contact_phone: "",
    insurance_provider: "", insurance_number: "",
    gender: "", address: "", occupation: "",
  });

  // Clinical note creation
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    subjective: "", objective: "", assessment: "", plan: "",
    vitals: { weight: "", height: "", bp: "", temp: "", heart_rate: "" },
  });

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    const [{ data: appts }, { data: sales }, { data: notes }] = await Promise.all([
      supabase.from("appointments").select("*, treatments(name), professionals(full_name)")
        .eq("patient_id", patient.id).order("date", { ascending: false }).limit(50),
      supabase.from("sales").select("*, treatments(name)")
        .eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("clinical_notes").select("*, professionals(full_name)")
        .eq("patient_id", patient.id).order("note_date", { ascending: false }).limit(50),
    ]);
    setDetailAppts(appts || []);
    setDetailSales(sales || []);
    setClinicalNotes(notes || []);
    setLoading(false);
  }, [patient.id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  useEffect(() => {
    setMedForm({
      blood_type: patient.blood_type || "",
      allergies: patient.allergies || "",
      chronic_conditions: patient.chronic_conditions || "",
      current_medications: patient.current_medications || "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
      insurance_provider: patient.insurance_provider || "",
      insurance_number: patient.insurance_number || "",
      gender: patient.gender || "",
      address: patient.address || "",
      occupation: patient.occupation || "",
    });
  }, [patient]);

  const saveMedical = async () => {
    const { error } = await (supabase as any).from("patients").update(medForm).eq("id", patient.id);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Ficha médica actualizada");
    setEditingMedical(false);
    onRefresh();
  };

  const saveClinicalNote = async () => {
    const { error } = await (supabase as any).from("clinical_notes").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      subjective: noteForm.subjective,
      objective: noteForm.objective,
      assessment: noteForm.assessment,
      plan: noteForm.plan,
      vitals: noteForm.vitals,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Nota clínica guardada");
    setNoteOpen(false);
    setNoteForm({ subjective: "", objective: "", assessment: "", plan: "", vitals: { weight: "", height: "", bp: "", temp: "", heart_rate: "" } });
    fetchDetails();
  };

  const initials = `${(patient.first_name || "")[0] || ""}${(patient.last_name || "")[0] || ""}`.toUpperCase();

  const activityBadge = (a: string) => {
    switch (a) {
      case "activo": return { label: "Activo", cls: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" };
      case "irregular": return { label: "Irregular", cls: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" };
      default: return { label: "Inactivo", cls: "bg-destructive/15 text-destructive" };
    }
  };

  const apptStatusBadge = (status: string) => {
    switch (status) {
      case "confirmado": return "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]";
      case "completado": return "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]";
      case "cancelado": return "bg-destructive/15 text-destructive";
      default: return "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]";
    }
  };

  const badge = activityBadge(patient.activity);

  return (
    <div className="w-full lg:w-[480px] shrink-0 space-y-4 overflow-y-auto">
      <button onClick={onClose} className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>

      {/* Patient header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{patient.first_name} {patient.last_name}</h2>
                <p className="text-xs text-muted-foreground">{patient.email}</p>
                {patient.phone && <p className="text-xs text-muted-foreground">{patient.phone}</p>}
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-1 hover:bg-muted rounded">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
            {patient.date_of_birth && <span className="text-xs text-muted-foreground">📅 {format(new Date(patient.date_of_birth), "dd/MM/yyyy")}</span>}
            {patient.gender && <span className="text-xs text-muted-foreground capitalize">· {patient.gender}</span>}
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => onEdit(patient)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Button>
            <Button size="sm" className="gradient-primary text-primary-foreground hover:opacity-90">
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Agendar cita
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="info" className="text-xs">Ficha</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notas</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Citas</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">Ventas</TabsTrigger>
        </TabsList>

        {/* Medical Info Tab */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-destructive" /> Información Médica
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setEditingMedical(!editingMedical)} className="h-7 text-xs">
                  {editingMedical ? "Cancelar" : <><Pencil className="w-3 h-3 mr-1" /> Editar</>}
                </Button>
              </div>

              {editingMedical ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo de sangre</Label>
                      <Select value={medForm.blood_type} onValueChange={v => setMedForm({ ...medForm, blood_type: v })}>
                        <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{BLOOD_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Género</Label>
                      <Select value={medForm.gender} onValueChange={v => setMedForm({ ...medForm, gender: v })}>
                        <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Alergias</Label>
                    <Textarea value={medForm.allergies} onChange={e => setMedForm({ ...medForm, allergies: e.target.value })}
                      className="mt-1 min-h-[60px] text-sm" placeholder="Penicilina, Látex..." maxLength={2000} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Condiciones crónicas</Label>
                    <Textarea value={medForm.chronic_conditions} onChange={e => setMedForm({ ...medForm, chronic_conditions: e.target.value })}
                      className="mt-1 min-h-[60px] text-sm" placeholder="Diabetes, Hipertensión..." maxLength={2000} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Medicamentos actuales</Label>
                    <Textarea value={medForm.current_medications} onChange={e => setMedForm({ ...medForm, current_medications: e.target.value })}
                      className="mt-1 min-h-[60px] text-sm" placeholder="Metformina 500mg..." maxLength={2000} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ocupación</Label>
                    <Input value={medForm.occupation} onChange={e => setMedForm({ ...medForm, occupation: e.target.value })}
                      className="h-8 mt-1 text-sm" maxLength={200} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dirección</Label>
                    <Input value={medForm.address} onChange={e => setMedForm({ ...medForm, address: e.target.value })}
                      className="h-8 mt-1 text-sm" maxLength={500} />
                  </div>

                  <h4 className="text-xs font-semibold text-foreground pt-2 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contacto de emergencia
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nombre</Label>
                      <Input value={medForm.emergency_contact_name} onChange={e => setMedForm({ ...medForm, emergency_contact_name: e.target.value })}
                        className="h-8 mt-1 text-sm" maxLength={200} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Teléfono</Label>
                      <Input value={medForm.emergency_contact_phone} onChange={e => setMedForm({ ...medForm, emergency_contact_phone: e.target.value })}
                        className="h-8 mt-1 text-sm" maxLength={20} />
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-foreground pt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Seguro médico
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Aseguradora</Label>
                      <Input value={medForm.insurance_provider} onChange={e => setMedForm({ ...medForm, insurance_provider: e.target.value })}
                        className="h-8 mt-1 text-sm" maxLength={200} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Nro. póliza</Label>
                      <Input value={medForm.insurance_number} onChange={e => setMedForm({ ...medForm, insurance_number: e.target.value })}
                        className="h-8 mt-1 text-sm" maxLength={50} />
                    </div>
                  </div>

                  <Button onClick={saveMedical} className="w-full gradient-primary text-primary-foreground hover:opacity-90 mt-2">
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Guardar ficha médica
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Tipo de sangre", value: patient.blood_type, icon: Heart },
                    { label: "Género", value: patient.gender, icon: User },
                    { label: "Alergias", value: patient.allergies, icon: AlertTriangle },
                    { label: "Condiciones crónicas", value: patient.chronic_conditions, icon: Heart },
                    { label: "Medicamentos", value: patient.current_medications, icon: Pill },
                    { label: "Ocupación", value: patient.occupation, icon: User },
                    { label: "Dirección", value: patient.address, icon: User },
                    { label: "Emergencia", value: patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || "—"})` : null, icon: Phone },
                    { label: "Seguro", value: patient.insurance_provider ? `${patient.insurance_provider} - ${patient.insurance_number || "—"}` : null, icon: Shield },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-2 py-1">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                        <p className="text-xs text-foreground">{value || "Sin registrar"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Notes Tab */}
        <TabsContent value="notes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> Notas Clínicas
            </h3>
            <Button size="sm" onClick={() => setNoteOpen(true)} className="h-7 text-xs gradient-primary text-primary-foreground">
              <Plus className="w-3 h-3 mr-1" /> Nueva nota
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : clinicalNotes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay notas clínicas</p>
                <Button size="sm" onClick={() => setNoteOpen(true)} className="mt-3 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Crear primera nota
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {clinicalNotes.map((note: any) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">
                        {format(new Date(note.note_date), "dd MMM yyyy", { locale: es })}
                      </span>
                      {note.professionals?.full_name && (
                        <span className="text-[10px] text-muted-foreground">Dr. {note.professionals.full_name}</span>
                      )}
                    </div>
                    {note.subjective && (
                      <div className="mb-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Subjetivo</p>
                        <p className="text-xs text-foreground">{note.subjective}</p>
                      </div>
                    )}
                    {note.objective && (
                      <div className="mb-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Objetivo</p>
                        <p className="text-xs text-foreground">{note.objective}</p>
                      </div>
                    )}
                    {note.assessment && (
                      <div className="mb-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Evaluación</p>
                        <p className="text-xs text-foreground">{note.assessment}</p>
                      </div>
                    )}
                    {note.plan && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Plan</p>
                        <p className="text-xs text-foreground">{note.plan}</p>
                      </div>
                    )}
                    {note.vitals && Object.values(note.vitals as Record<string, string>).some(v => v) && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {Object.entries(note.vitals as Record<string, string>).filter(([, v]) => v).map(([k, v]) => (
                          <span key={k} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                            {k === "bp" ? "PA" : k === "temp" ? "Temp" : k === "heart_rate" ? "FC" : k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" /> Historial de citas
              </h3>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : detailAppts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No hay citas registradas</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {detailAppts.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
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
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" /> Historial de ventas
              </h3>
              {loading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : detailSales.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No hay ventas registradas</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {detailSales.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
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
        </TabsContent>
      </Tabs>

      {/* Clinical Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>📋 Nueva Nota Clínica</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Signos vitales</h4>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: "weight", label: "Peso (kg)", placeholder: "70" },
                { key: "height", label: "Talla (cm)", placeholder: "170" },
                { key: "bp", label: "PA", placeholder: "120/80" },
                { key: "temp", label: "Temp °C", placeholder: "36.5" },
                { key: "heart_rate", label: "FC", placeholder: "72" },
              ].map(v => (
                <div key={v.key}>
                  <Label className="text-[10px] text-muted-foreground">{v.label}</Label>
                  <Input
                    value={(noteForm.vitals as any)[v.key]}
                    onChange={e => setNoteForm({ ...noteForm, vitals: { ...noteForm.vitals, [v.key]: e.target.value } })}
                    className="h-8 mt-0.5 text-xs" placeholder={v.placeholder} maxLength={20}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">S — Subjetivo (lo que refiere el paciente)</Label>
              <Textarea value={noteForm.subjective} onChange={e => setNoteForm({ ...noteForm, subjective: e.target.value })}
                className="mt-1 min-h-[60px] text-sm" maxLength={5000} placeholder="Motivo de consulta, síntomas..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">O — Objetivo (hallazgos del examen)</Label>
              <Textarea value={noteForm.objective} onChange={e => setNoteForm({ ...noteForm, objective: e.target.value })}
                className="mt-1 min-h-[60px] text-sm" maxLength={5000} placeholder="Hallazgos clínicos..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">A — Evaluación (diagnóstico)</Label>
              <Textarea value={noteForm.assessment} onChange={e => setNoteForm({ ...noteForm, assessment: e.target.value })}
                className="mt-1 min-h-[60px] text-sm" maxLength={5000} placeholder="Diagnóstico o impresión clínica..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">P — Plan (tratamiento)</Label>
              <Textarea value={noteForm.plan} onChange={e => setNoteForm({ ...noteForm, plan: e.target.value })}
                className="mt-1 min-h-[60px] text-sm" maxLength={5000} placeholder="Plan de tratamiento, indicaciones..." />
            </div>

            <Button onClick={saveClinicalNote} className="w-full gradient-primary text-primary-foreground hover:opacity-90"
              disabled={!noteForm.subjective && !noteForm.objective && !noteForm.assessment && !noteForm.plan}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Guardar nota clínica
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientFilePanel;
