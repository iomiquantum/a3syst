import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Copy, Check, Globe, Store, Briefcase, Eye, Settings2, Sparkles, Plus, Pencil, Trash2, Clock, Building2, MapPin, Phone, Mail, Users, Palette, History } from "lucide-react";
import BrandingSection from "@/components/mi-negocio/BrandingSection";
import AvanzadoSection from "@/components/mi-negocio/AvanzadoSection";
import ActividadSection from "@/components/mi-negocio/ActividadSection";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinic } from "@/hooks/useClinic";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { treatmentSchema, specialtySchema, professionalSchema, branchSchema, getValidationError } from "@/lib/validations";

interface DaySchedule { enabled: boolean; open: string; close: string; }
interface WorkingSchedule { [key: string]: DaySchedule; }

const DEFAULT_SCHEDULE: WorkingSchedule = {
  lunes: { enabled: true, open: "09:00", close: "18:00" },
  martes: { enabled: true, open: "09:00", close: "18:00" },
  miercoles: { enabled: true, open: "09:00", close: "18:00" },
  jueves: { enabled: true, open: "09:00", close: "18:00" },
  viernes: { enabled: true, open: "09:00", close: "18:00" },
  sabado: { enabled: false, open: "09:00", close: "14:00" },
  domingo: { enabled: false, open: "09:00", close: "14:00" },
};

const DAY_LABELS: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves",
  viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};

interface ClinicProfile {
  id: string; name: string; description: string | null; slug: string | null;
  city: string | null; address: string | null; whatsapp: string | null;
  opening_hour: string | null; closing_hour: string | null;
  working_days: string[] | null; working_schedule: WorkingSchedule | null;
  logo_url: string | null; primary_color: string | null;
  business_type: string; business_category: string; timezone: string | null;
}

const AI_TEMPLATES: Record<string, { name: string; duration: number; price: number; description: string }[]> = {
  dental: [
    { name: "Limpieza dental", duration: 45, price: 80, description: "Limpieza profesional con ultrasonido" },
    { name: "Blanqueamiento", duration: 60, price: 250, description: "Blanqueamiento LED profesional" },
    { name: "Ortodoncia - Consulta", duration: 30, price: 50, description: "Evaluación y plan de ortodoncia" },
    { name: "Extracción simple", duration: 30, price: 100, description: "Extracción de pieza dental" },
    { name: "Carillas de porcelana", duration: 90, price: 500, description: "Carilla estética por pieza" },
  ],
  estetica: [
    { name: "Limpieza facial profunda", duration: 60, price: 80, description: "Limpieza con extracción y mascarilla" },
    { name: "Botox", duration: 30, price: 300, description: "Aplicación de toxina botulínica" },
    { name: "Ácido hialurónico", duration: 45, price: 400, description: "Relleno dérmico facial" },
    { name: "Peeling químico", duration: 45, price: 120, description: "Renovación de piel con ácidos" },
    { name: "Microdermoabrasión", duration: 40, price: 90, description: "Exfoliación mecánica avanzada" },
  ],
  spa: [
    { name: "Masaje relajante", duration: 60, price: 70, description: "Masaje de cuerpo completo" },
    { name: "Masaje descontracturante", duration: 50, price: 85, description: "Terapia de puntos de tensión" },
    { name: "Aromaterapia", duration: 45, price: 65, description: "Sesión con aceites esenciales" },
    { name: "Reflexología podal", duration: 40, price: 55, description: "Masaje terapéutico de pies" },
  ],
  general: [
    { name: "Consulta general", duration: 30, price: 50, description: "Consulta de evaluación inicial" },
    { name: "Consulta de seguimiento", duration: 20, price: 35, description: "Control y seguimiento" },
    { name: "Servicio premium", duration: 60, price: 120, description: "Servicio completo premium" },
    { name: "Paquete básico", duration: 45, price: 80, description: "Paquete de servicios básicos" },
  ],
};

const MiNegocioPage = () => {
  const { clinicId } = useClinic();
  const { labels } = useBusinessLabels();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // ── Profile data ──
  const { data: clinic, isLoading } = useQuery({
    queryKey: ["mi-negocio-profile", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinics")
        .select("id, name, description, slug, city, address, whatsapp, opening_hour, closing_hour, working_days, working_schedule, logo_url, primary_color, business_type, business_category, timezone")
        .eq("id", clinicId!).single();
      if (error) throw error;
      return data as ClinicProfile;
    },
    enabled: !!clinicId,
  });

  const { data: treatments = [], refetch: refetchTreatments } = useQuery({
    queryKey: ["mi-negocio-treatments", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("treatments").select("id, name, price, duration, description").eq("clinic_id", clinicId!).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const { data: specialties = [], refetch: refetchSpecialties } = useQuery({
    queryKey: ["mi-negocio-specialties", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("specialties").select("*").eq("clinic_id", clinicId!).order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const { data: professionals = [], refetch: refetchProfessionals } = useQuery({
    queryKey: ["mi-negocio-professionals", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*, specialties(name), branches(name)").eq("clinic_id", clinicId!).order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const { data: branches = [], refetch: refetchBranches } = useQuery({
    queryKey: ["mi-negocio-branches", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").eq("clinic_id", clinicId!).order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  // ── Profile mutations ──
  const updateClinic = useMutation({
    mutationFn: async (updates: Partial<ClinicProfile>) => {
      const { error } = await (supabase as any).from("clinics").update(updates).eq("id", clinicId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mi-negocio-profile", clinicId] });
      toast.success("Información actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState<Partial<ClinicProfile>>({});
  const initForm = () => {
    if (clinic) setForm({ name: clinic.name, description: clinic.description || "", whatsapp: clinic.whatsapp || "", timezone: clinic.timezone || "America/Guayaquil" });
  };
  const handleSaveProfile = () => {
    if (!form.name?.trim()) return toast.error("El nombre es obligatorio");
    updateClinic.mutate(form);
  };

  // ── Treatments ──
  const [openTreatment, setOpenTreatment] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ name: "", duration: "", description: "", price: "" });

  const handleSaveTreatment = async () => {
    if (!clinicId) return;
    try {
      const validated = treatmentSchema.parse({ name: treatmentForm.name, duration: parseInt(treatmentForm.duration) || 0, price: parseFloat(treatmentForm.price) || 0, description: treatmentForm.description });
      const { error } = await supabase.from("treatments").insert({ clinic_id: clinicId, name: validated.name, duration: validated.duration, description: validated.description || "", price: validated.price });
      if (error) { toast.error(error.message); return; }
      toast.success(`${labels.treatments_singular} creado`);
      setOpenTreatment(false); setTreatmentForm({ name: "", duration: "", description: "", price: "" });
      refetchTreatments();
    } catch (e) { toast.error(getValidationError(e)); }
  };

  const deleteTreatment = async (id: string) => {
    await supabase.from("treatments").delete().eq("id", id);
    toast.success(`${labels.treatments_singular} eliminado`); refetchTreatments();
  };

  // ── Specialties ──
  const [openSpecialty, setOpenSpecialty] = useState(false);
  const [specialtyName, setSpecialtyName] = useState("");

  const handleSaveSpecialty = async () => {
    if (!clinicId) return;
    try {
      const validated = specialtySchema.parse({ name: specialtyName });
      const { error } = await supabase.from("specialties").insert({ clinic_id: clinicId, name: validated.name });
      if (error) { toast.error(error.message); return; }
      toast.success("Categoría creada");
      setOpenSpecialty(false); setSpecialtyName("");
      refetchSpecialties();
    } catch (e) { toast.error(getValidationError(e)); }
  };

  const deleteSpecialty = async (id: string) => {
    await supabase.from("specialties").delete().eq("id", id);
    toast.success("Categoría eliminada"); refetchSpecialties();
  };

  // ── Professionals ──
  const [openPro, setOpenPro] = useState(false);
  const [proForm, setProForm] = useState({ full_name: "", email: "", phone: "", specialty_id: "", branch_id: "" });

  const handleSavePro = async () => {
    if (!clinicId) return;
    try {
      const validated = professionalSchema.parse(proForm);
      const { error } = await supabase.from("professionals").insert({ clinic_id: clinicId, full_name: validated.full_name, email: validated.email, phone: validated.phone || "", specialty_id: validated.specialty_id || null, branch_id: validated.branch_id || null });
      if (error) { toast.error(error.message); return; }
      toast.success(`${labels.professionals_singular} creado`);
      setOpenPro(false); setProForm({ full_name: "", email: "", phone: "", specialty_id: "", branch_id: "" });
      refetchProfessionals();
    } catch (e) { toast.error(getValidationError(e)); }
  };

  const deletePro = async (id: string) => {
    await supabase.from("professionals").delete().eq("id", id);
    toast.success(`${labels.professionals_singular} eliminado`); refetchProfessionals();
  };

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Branches ──
  const [openBranch, setOpenBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const emptyBranchForm = { name: "", address: "", phone: "", description: "", email: "", whatsapp: "", full_address: "", google_maps_url: "", arrival_instructions: "", preparation_notes: "", working_schedule: null as WorkingSchedule | null };
  const [branchForm, setBranchForm] = useState(emptyBranchForm);

  const handleSaveBranch = async () => {
    if (!clinicId) return;
    try {
      const validated = branchSchema.parse({ name: branchForm.name, address: branchForm.address, phone: branchForm.phone, description: branchForm.description });
      const payload: any = {
        name: validated.name, address: validated.address, phone: validated.phone || "", description: validated.description || "",
        email: branchForm.email || null, whatsapp: branchForm.whatsapp || null,
        full_address: branchForm.full_address || null, google_maps_url: branchForm.google_maps_url || null,
        arrival_instructions: branchForm.arrival_instructions || null, preparation_notes: branchForm.preparation_notes || null,
        working_schedule: branchForm.working_schedule || null,
      };
      if (editingBranchId) {
        const { error } = await supabase.from("branches").update(payload).eq("id", editingBranchId);
        if (error) { toast.error(error.message); return; }
        toast.success(`${labels.branches_singular} actualizada`);
      } else {
        const { error } = await supabase.from("branches").insert({ clinic_id: clinicId, ...payload });
        if (error) { toast.error(error.message); return; }
        toast.success(`${labels.branches_singular} creada`);
      }
      setOpenBranch(false); setEditingBranchId(null); setBranchForm(emptyBranchForm);
      refetchBranches();
    } catch (e) { toast.error(getValidationError(e)); }
  };

  const handleEditBranch = (b: any) => {
    setEditingBranchId(b.id);
    setBranchForm({
      name: b.name, address: b.address || "", phone: b.phone || "", description: b.description || "",
      email: b.email || "", whatsapp: b.whatsapp || "", full_address: b.full_address || "",
      google_maps_url: b.google_maps_url || "", arrival_instructions: b.arrival_instructions || "",
      preparation_notes: b.preparation_notes || "", working_schedule: b.working_schedule || null,
    });
    setOpenBranch(true);
  };

  const deleteBranch = async (id: string) => {
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${labels.branches_singular} eliminada`); refetchBranches();
  };

  // ── AI generate treatments ──
  const generateWithAI = async () => {
    if (!clinicId) return;
    const type = clinic?.business_type || "general";
    const templates = AI_TEMPLATES[type] || AI_TEMPLATES.general;
    let created = 0;
    for (const t of templates) {
      const exists = treatments.some((ex: any) => ex.name.toLowerCase() === t.name.toLowerCase());
      if (!exists) {
        await supabase.from("treatments").insert({ clinic_id: clinicId, name: t.name, duration: t.duration, price: t.price, description: t.description });
        created++;
      }
    }
    if (created > 0) { toast.success(`✨ ${created} ${labels.treatments.toLowerCase()} generados con IA`); refetchTreatments(); }
    else toast.info("Ya tienes todos los servicios sugeridos");
  };

  // ── Landing & completion ──
  const landingUrl = clinic?.slug ? `${window.location.origin}/negocio/${clinic.slug}` : null;
  const copyLink = () => {
    if (landingUrl) { navigator.clipboard.writeText(landingUrl); setCopied(true); toast.success("Link copiado"); setTimeout(() => setCopied(false), 2000); }
  };

  const completionItems = [
    { label: "Nombre del negocio", done: !!clinic?.name },
    { label: "Descripción", done: !!clinic?.description },
    { label: "WhatsApp", done: !!clinic?.whatsapp },
    { label: `${labels.branches} configuradas`, done: branches.length > 0 },
    { label: "Horario en sedes", done: branches.some((b: any) => !!b.working_schedule) },
    { label: `${labels.treatments} configurados`, done: treatments.length > 0 },
    { label: `${labels.professionals} configurados`, done: professionals.length > 0 },
    { label: "Landing activa", done: !!clinic?.slug },
  ];
  const completionPercent = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" /> Mi Negocio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Configura toda la información de tu empresa desde un solo lugar.</p>
          </div>
          {landingUrl && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button size="sm" asChild>
                <a href={landingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-1" /> Ver landing</a>
              </Button>
            </div>
          )}
        </div>

        {/* Completion progress */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Progreso de configuración
              </span>
              <Badge variant={completionPercent === 100 ? "default" : "secondary"}>{completionPercent}%</Badge>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completionPercent}%` }} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {completionItems.map(item => (
                <span key={item.label} className={cn("text-xs px-2 py-1 rounded-full", item.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {item.done ? "✓" : "○"} {item.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="perfil" onValueChange={(v) => { if (v === "perfil") initForm(); }}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="perfil" className="gap-1.5"><Settings2 className="w-4 h-4" /> Perfil</TabsTrigger>
            <TabsTrigger value="servicios" className="gap-1.5"><Briefcase className="w-4 h-4" /> {labels.treatments}</TabsTrigger>
            <TabsTrigger value="profesionales" className="gap-1.5"><Users className="w-4 h-4" /> {labels.professionals}</TabsTrigger>
            <TabsTrigger value="landing" className="gap-1.5"><Globe className="w-4 h-4" /> Landing</TabsTrigger>
          </TabsList>

          {/* ══ PERFIL TAB ══ */}
          <TabsContent value="perfil" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del negocio</CardTitle>
                <CardDescription>Esta información aparecerá en tu landing y será usada por el asistente de IA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del negocio *</Label>
                    <Input value={form.name ?? clinic?.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Mi Clínica Dental" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp ?? clinic?.whatsapp ?? ""} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+593999999999" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea value={form.description ?? clinic?.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe brevemente tu negocio..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Zona horaria</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={(form as any).timezone ?? clinic?.timezone ?? "America/Guayaquil"}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                      <optgroup label="América del Norte">
                        <option value="America/New_York">US Eastern (New York)</option>
                        <option value="America/Chicago">US Central (Chicago)</option>
                        <option value="America/Denver">US Mountain (Denver)</option>
                        <option value="America/Los_Angeles">US Pacific (Los Angeles)</option>
                        <option value="America/Anchorage">Alaska (Anchorage)</option>
                        <option value="Pacific/Honolulu">Hawái (Honolulu)</option>
                        <option value="America/Toronto">Canadá (Toronto)</option>
                        <option value="America/Vancouver">Canadá (Vancouver)</option>
                      </optgroup>
                      <optgroup label="México y Centroamérica">
                        <option value="America/Mexico_City">México (Ciudad de México)</option>
                        <option value="America/Cancun">México (Cancún)</option>
                        <option value="America/Tijuana">México (Tijuana)</option>
                        <option value="America/Guatemala">Guatemala</option>
                        <option value="America/El_Salvador">El Salvador</option>
                        <option value="America/Tegucigalpa">Honduras (Tegucigalpa)</option>
                        <option value="America/Managua">Nicaragua (Managua)</option>
                        <option value="America/Costa_Rica">Costa Rica</option>
                        <option value="America/Panama">Panamá</option>
                      </optgroup>
                      <optgroup label="Caribe">
                        <option value="America/Havana">Cuba (La Habana)</option>
                        <option value="America/Santo_Domingo">Rep. Dominicana</option>
                        <option value="America/Puerto_Rico">Puerto Rico</option>
                      </optgroup>
                      <optgroup label="América del Sur">
                        <option value="America/Bogota">Colombia (Bogotá)</option>
                        <option value="America/Guayaquil">Ecuador (Guayaquil)</option>
                        <option value="America/Lima">Perú (Lima)</option>
                        <option value="America/Caracas">Venezuela (Caracas)</option>
                        <option value="America/La_Paz">Bolivia (La Paz)</option>
                        <option value="America/Santiago">Chile (Santiago)</option>
                        <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
                        <option value="America/Montevideo">Uruguay (Montevideo)</option>
                        <option value="America/Asuncion">Paraguay (Asunción)</option>
                        <option value="America/Sao_Paulo">Brasil (São Paulo)</option>
                        <option value="America/Manaus">Brasil (Manaus)</option>
                      </optgroup>
                      <optgroup label="Europa">
                        <option value="Europe/Madrid">España (Madrid)</option>
                        <option value="Europe/London">UK (Londres)</option>
                        <option value="Europe/Paris">Francia (París)</option>
                        <option value="Europe/Berlin">Alemania (Berlín)</option>
                        <option value="Europe/Rome">Italia (Roma)</option>
                        <option value="Europe/Lisbon">Portugal (Lisboa)</option>
                        <option value="Europe/Amsterdam">Países Bajos (Ámsterdam)</option>
                        <option value="Europe/Zurich">Suiza (Zúrich)</option>
                        <option value="Europe/Moscow">Rusia (Moscú)</option>
                      </optgroup>
                      <optgroup label="Asia / Oceanía">
                        <option value="Asia/Dubai">EAU (Dubái)</option>
                        <option value="Asia/Kolkata">India (Kolkata)</option>
                        <option value="Asia/Shanghai">China (Shanghái)</option>
                        <option value="Asia/Tokyo">Japón (Tokio)</option>
                        <option value="Asia/Seoul">Corea del Sur (Seúl)</option>
                        <option value="Australia/Sydney">Australia (Sídney)</option>
                        <option value="Pacific/Auckland">Nueva Zelanda (Auckland)</option>
                      </optgroup>
                    </select>
                    <p className="text-xs text-muted-foreground">La IA usará esta zona horaria para agendar citas correctamente.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={updateClinic.isPending}>
                    {updateClinic.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── SEDES inside Perfil ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> {labels.branches}</h2>
                  <p className="text-sm text-muted-foreground">Cada sede tiene su ciudad, dirección, horario y datos de contacto. El bot de IA usa esta información.</p>
                </div>
                <Dialog open={openBranch} onOpenChange={(o) => { setOpenBranch(o); if (!o) { setEditingBranchId(null); setBranchForm(emptyBranchForm); } }}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nueva {labels.branches_singular}</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingBranchId ? `Editar ${labels.branches_singular}` : `Nueva ${labels.branches_singular}`}</DialogTitle></DialogHeader>
                    <div className="space-y-5 pt-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información básica</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Nombre *</Label><Input value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} placeholder={`Nombre de la ${labels.branches_singular.toLowerCase()}`} maxLength={100} /></div>
                        <div><Label>Teléfono</Label><Input value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} placeholder="+593 999 999 999" maxLength={20} /></div>
                        <div><Label>Email</Label><Input type="email" value={branchForm.email} onChange={e => setBranchForm({ ...branchForm, email: e.target.value })} placeholder="sede@negocio.com" maxLength={255} /></div>
                        <div><Label>WhatsApp</Label><Input value={branchForm.whatsapp} onChange={e => setBranchForm({ ...branchForm, whatsapp: e.target.value })} placeholder="+593999999999" maxLength={20} /></div>
                      </div>
                      <div><Label>Descripción</Label><Textarea value={branchForm.description} onChange={e => setBranchForm({ ...branchForm, description: e.target.value })} placeholder="Describe esta sede brevemente..." maxLength={1000} rows={2} /></div>

                      <div className="space-y-1 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Ciudad</Label><Input value={(branchForm as any).city ?? ""} onChange={e => setBranchForm({ ...branchForm, city: e.target.value } as any)} placeholder="Ej: Quito" maxLength={100} /></div>
                        <div><Label>Dirección corta *</Label><Input value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} placeholder="Av. Principal 123" maxLength={300} /></div>
                      </div>
                      <div><Label>Dirección completa</Label><Textarea value={branchForm.full_address} onChange={e => setBranchForm({ ...branchForm, full_address: e.target.value })} placeholder="Av. Principal 123, Edificio Torre Norte, Piso 3, Of. 302" maxLength={500} rows={2} /></div>
                      <div><Label>Link Google Maps</Label><Input value={branchForm.google_maps_url} onChange={e => setBranchForm({ ...branchForm, google_maps_url: e.target.value })} placeholder="https://maps.google.com/..." maxLength={500} /></div>

                      <div className="space-y-1 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información para el cliente</p>
                        <p className="text-xs text-muted-foreground">El bot usará esta info para guiar al cliente cuando agende.</p>
                      </div>
                      <div><Label>Instrucciones de llegada</Label><Textarea value={branchForm.arrival_instructions} onChange={e => setBranchForm({ ...branchForm, arrival_instructions: e.target.value })} placeholder="Ej: Entrar por la puerta lateral, tomar ascensor al piso 3..." maxLength={1000} rows={2} /></div>
                      <div><Label>Notas de preparación</Label><Textarea value={branchForm.preparation_notes} onChange={e => setBranchForm({ ...branchForm, preparation_notes: e.target.value })} placeholder="Ej: Traer documento de identidad, llegar 15 min antes..." maxLength={1000} rows={2} /></div>

                      <div className="space-y-1 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Horario de atención de esta sede</p>
                        <p className="text-xs text-muted-foreground">El bot de IA usará este horario para agendar citas en esta sede.</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(DAY_LABELS).map(([key, label]) => {
                          const schedule: WorkingSchedule = branchForm.working_schedule ?? DEFAULT_SCHEDULE;
                          const day = schedule[key] || { enabled: false, open: "09:00", close: "18:00" };
                          const updateBranchDay = (field: keyof DaySchedule, value: any) => {
                            const current = { ...(branchForm.working_schedule ?? DEFAULT_SCHEDULE) };
                            current[key] = { ...current[key], [field]: value };
                            setBranchForm(f => ({ ...f, working_schedule: current }));
                          };
                          return (
                            <div key={key} className={cn("flex items-center gap-3 rounded-lg border p-2.5 transition-colors", day.enabled ? "bg-background border-border" : "bg-muted/50 border-transparent")}>
                              <label className="flex items-center gap-2 min-w-[110px] cursor-pointer">
                                <input type="checkbox" checked={day.enabled} onChange={e => updateBranchDay("enabled", e.target.checked)} className="rounded border-input" />
                                <span className={cn("text-sm font-medium", !day.enabled && "text-muted-foreground")}>{label}</span>
                              </label>
                              {day.enabled ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input type="time" value={day.open} onChange={e => updateBranchDay("open", e.target.value)} className="h-8 text-sm w-[120px]" />
                                  <span className="text-xs text-muted-foreground">a</span>
                                  <Input type="time" value={day.close} onChange={e => updateBranchDay("close", e.target.value)} className="h-8 text-sm w-[120px]" />
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Cerrado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <Button onClick={handleSaveBranch} className="w-full gradient-primary text-primary-foreground" disabled={!branchForm.name || !branchForm.address}>
                        {editingBranchId ? "Guardar Cambios" : `Crear ${labels.branches_singular}`}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {branches.length === 0 ? (
                <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No hay {labels.branches.toLowerCase()} creadas aún. Crea tu primera sede para configurar horarios y ubicación.</p></CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map((branch: any) => {
                    const bSchedule = branch.working_schedule as WorkingSchedule | null;
                    const openDays = bSchedule ? Object.entries(bSchedule).filter(([, v]) => (v as DaySchedule).enabled) : [];
                    return (
                      <Card key={branch.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                              <div>
                                <CardTitle className="text-base">{branch.name}</CardTitle>
                                {branch.description && <p className="text-xs text-muted-foreground mt-0.5">{branch.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditBranch(branch)} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                              <button onClick={() => deleteBranch(branch.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {branch.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" /><span>{branch.full_address || branch.address}</span></div>}
                          {branch.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>{branch.phone}</span></div>}
                          {branch.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /><span>{branch.email}</span></div>}
                          {branch.whatsapp && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>WA: {branch.whatsapp}</span></div>}
                          {branch.google_maps_url && <a href={branch.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-xs"><ExternalLink className="w-3.5 h-3.5" /> Ver en Google Maps</a>}
                          {openDays.length > 0 && (
                            <div className="pt-2 border-t border-border mt-2">
                              <p className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Horario</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                {openDays.map(([dayKey, val]) => {
                                  const d = val as DaySchedule;
                                  return <div key={dayKey} className="flex justify-between text-xs text-muted-foreground"><span>{DAY_LABELS[dayKey]}</span><span>{d.open} - {d.close}</span></div>;
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══ SERVICIOS / TRATAMIENTOS TAB ══ */}
          <TabsContent value="servicios" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{labels.treatments} y {labels.specialties}</h2>
                <p className="text-sm text-muted-foreground">Configura los {labels.treatments.toLowerCase()} y categorías de tu negocio</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateWithAI}>
                  <Sparkles className="w-4 h-4 mr-2 text-primary" /> Generar con IA
                </Button>
              </div>
            </div>

            <Tabs defaultValue="tratamientos">
              <TabsList>
                <TabsTrigger value="tratamientos">{labels.treatments}</TabsTrigger>
                <TabsTrigger value="especialidades">{labels.specialties}</TabsTrigger>
              </TabsList>

              <TabsContent value="tratamientos" className="space-y-4 mt-4">
                <div className="flex justify-end">
                  <Dialog open={openTreatment} onOpenChange={setOpenTreatment}>
                    <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nuevo {labels.treatments_singular}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nuevo {labels.treatments_singular}</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div><Label>Nombre *</Label><Input value={treatmentForm.name} onChange={e => setTreatmentForm({ ...treatmentForm, name: e.target.value })} maxLength={100} /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Duración (min) *</Label><Input type="number" value={treatmentForm.duration} onChange={e => setTreatmentForm({ ...treatmentForm, duration: e.target.value })} min={1} max={480} /></div>
                          <div><Label>Precio</Label><Input type="number" value={treatmentForm.price} onChange={e => setTreatmentForm({ ...treatmentForm, price: e.target.value })} min={0} /></div>
                        </div>
                        <div><Label>Descripción</Label><Textarea value={treatmentForm.description} onChange={e => setTreatmentForm({ ...treatmentForm, description: e.target.value })} maxLength={1000} /></div>
                        <div>
                          <Label>{labels.branches_singular} (opcional)</Label>
                          <Select value={(treatmentForm as any).branch_id ?? "all"} onValueChange={v => setTreatmentForm({ ...treatmentForm, branch_id: v } as any)}>
                            <SelectTrigger><SelectValue placeholder="Todas las sedes" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas las sedes</SelectItem>
                              {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">Deja "Todas las sedes" si este servicio aplica para todas.</p>
                        </div>
                        <Button onClick={handleSaveTreatment} className="w-full gradient-primary text-primary-foreground" disabled={!treatmentForm.name || !treatmentForm.duration}>Crear</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {treatments.length === 0 ? (
                      <p className="p-8 text-center text-muted-foreground">No hay {labels.treatments.toLowerCase()} creados aún.</p>
                    ) : (
                      <table className="w-full">
                        <thead><tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{labels.treatments_singular}</th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Duración</th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Precio</th>
                          <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">Descripción</th>
                          <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                        </tr></thead>
                        <tbody>
                          {treatments.map((t: any) => (
                            <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-3.5 text-sm font-medium text-foreground">{t.name}</td>
                              <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {t.duration} min</div></td>
                              <td className="px-5 py-3.5 text-sm text-foreground">${Number(t.price).toLocaleString()}</td>
                              <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{t.description}</td>
                              <td className="px-5 py-3.5 text-right">
                                <button onClick={() => deleteTreatment(t.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="especialidades" className="space-y-4 mt-4">
                <div className="flex justify-end">
                  <Dialog open={openSpecialty} onOpenChange={setOpenSpecialty}>
                    <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nueva Categoría</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nueva Categoría</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div><Label>Nombre *</Label><Input value={specialtyName} onChange={e => setSpecialtyName(e.target.value)} placeholder="Ej: Marketing Digital" maxLength={100} /></div>
                        <Button onClick={handleSaveSpecialty} className="w-full gradient-primary text-primary-foreground" disabled={!specialtyName}>Crear</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {specialties.length === 0 ? (
                  <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No hay {labels.specialties.toLowerCase()} creadas aún.</p></CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {specialties.map((s: any) => (
                      <Card key={s.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{s.name}</span>
                          <button onClick={() => deleteSpecialty(s.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ══ PROFESIONALES TAB ══ */}
          <TabsContent value="profesionales" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{labels.professionals}</h2>
                <p className="text-sm text-muted-foreground">Gestiona los miembros de tu {labels.professionals.toLowerCase()}</p>
              </div>
              <Dialog open={openPro} onOpenChange={setOpenPro}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nuevo {labels.professionals_singular}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuevo {labels.professionals_singular}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label>Nombre completo *</Label><Input value={proForm.full_name} onChange={e => setProForm({ ...proForm, full_name: e.target.value })} maxLength={100} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Email *</Label><Input type="email" value={proForm.email} onChange={e => setProForm({ ...proForm, email: e.target.value })} maxLength={255} /></div>
                      <div><Label>Teléfono</Label><Input value={proForm.phone} onChange={e => setProForm({ ...proForm, phone: e.target.value })} maxLength={20} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{labels.specialties}</Label>
                        <Select value={proForm.specialty_id} onValueChange={v => setProForm({ ...proForm, specialty_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>{specialties.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{labels.branches_singular}</Label>
                        <Select value={proForm.branch_id} onValueChange={v => setProForm({ ...proForm, branch_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Todas las sedes" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las sedes</SelectItem>
                            {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSavePro} className="w-full gradient-primary text-primary-foreground" disabled={!proForm.full_name || !proForm.email}>Crear</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {professionals.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">No hay miembros del {labels.professionals.toLowerCase()} aún. Primero crea {labels.branches.toLowerCase()} y {labels.specialties.toLowerCase()}.</p>
                ) : (
                  <table className="w-full">
                    <thead><tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{labels.professionals_singular}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">{labels.specialties}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">{labels.branches_singular}</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">Contacto</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
                    </tr></thead>
                    <tbody>
                      {professionals.map((p: any) => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-primary-foreground">{initials(p.full_name)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                                <p className="text-xs text-muted-foreground">{p.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {p.specialties?.name ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{p.specialties.name}</span> : <span className="text-sm text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{p.branches?.name || "Todas"}</td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <button className="p-1.5 rounded-md hover:bg-muted"><Mail className="w-3.5 h-3.5 text-muted-foreground" /></button>
                              {p.phone && <button className="p-1.5 rounded-md hover:bg-muted"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => deletePro(p.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ LANDING TAB ══ */}
          <TabsContent value="landing" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Tu landing pública</CardTitle>
                <CardDescription>Esta es la página web que tus clientes verán. Incluye la información de tu negocio, servicios y un chat con tu asistente de IA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {landingUrl ? (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Globe className="w-4 h-4 text-primary shrink-0" />
                      <code className="text-sm text-foreground flex-1 truncate">{landingUrl}</code>
                      <Button variant="ghost" size="sm" onClick={copyLink}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                      <Button variant="ghost" size="sm" asChild><a href={landingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden bg-muted">
                      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-destructive/40" />
                          <div className="w-3 h-3 rounded-full bg-[hsl(var(--warning)/0.4)]" />
                          <div className="w-3 h-3 rounded-full bg-[hsl(var(--success)/0.4)]" />
                        </div>
                        <span className="text-xs text-muted-foreground truncate flex-1">{landingUrl}</span>
                        <Button variant="ghost" size="sm" asChild><a href={landingUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 mr-1" /> Abrir</a></Button>
                      </div>
                      <iframe src={`/negocio/${clinic?.slug}`} className="w-full h-[500px] border-0" title="Landing Preview" />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <Globe className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-muted-foreground">Tu landing aún no está activa</p>
                    <p className="text-xs text-muted-foreground/70">Completa el onboarding para activar tu página pública con un link compartible.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MiNegocioPage;
