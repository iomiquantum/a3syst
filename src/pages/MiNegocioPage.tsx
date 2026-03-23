import { useState } from "react";
import { ExternalLink, Copy, Check, Globe, Store, Briefcase, Eye, Settings2, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useClinic } from "@/hooks/useClinic";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

interface WorkingSchedule {
  [key: string]: DaySchedule;
}

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
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  city: string | null;
  address: string | null;
  whatsapp: string | null;
  opening_hour: string | null;
  closing_hour: string | null;
  working_days: string[] | null;
  working_schedule: WorkingSchedule | null;
  logo_url: string | null;
  primary_color: string | null;
  business_type: string;
  business_category: string;
  timezone: string | null;
}

interface Treatment {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
}

const MiNegocioPage = () => {
  const { clinicId } = useClinic();
  const { labels } = useBusinessLabels();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["mi-negocio-profile", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinics")
        .select("id, name, description, slug, city, address, whatsapp, opening_hour, closing_hour, working_days, working_schedule, logo_url, primary_color, business_type, business_category, timezone")
        .eq("id", clinicId!)
        .single();
      if (error) throw error;
      return data as ClinicProfile;
    },
    enabled: !!clinicId,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["mi-negocio-treatments", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatments")
        .select("id, name, price, duration, description")
        .eq("clinic_id", clinicId!)
        .order("name");
      if (error) throw error;
      return (data || []) as Treatment[];
    },
    enabled: !!clinicId,
  });

  const updateClinic = useMutation({
    mutationFn: async (updates: Partial<ClinicProfile>) => {
      const { error } = await (supabase as any)
        .from("clinics")
        .update(updates)
        .eq("id", clinicId!);
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
    if (clinic) {
      setForm({
        name: clinic.name,
        description: clinic.description || "",
        city: clinic.city || "",
        address: clinic.address || "",
        whatsapp: clinic.whatsapp || "",
        opening_hour: clinic.opening_hour || "09:00",
        closing_hour: clinic.closing_hour || "18:00",
      });
    }
  };

  const handleSave = () => {
    if (!form.name?.trim()) return toast.error("El nombre es obligatorio");
    updateClinic.mutate(form);
  };

  const landingUrl = clinic?.slug
    ? `${window.location.origin}/negocio/${clinic.slug}`
    : null;

  const copyLink = () => {
    if (landingUrl) {
      navigator.clipboard.writeText(landingUrl);
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const completionItems = [
    { label: "Nombre del negocio", done: !!clinic?.name },
    { label: "Descripción", done: !!clinic?.description },
    { label: "Ciudad", done: !!clinic?.city },
    { label: "WhatsApp", done: !!clinic?.whatsapp },
    { label: "Horario", done: !!clinic?.opening_hour && !!clinic?.closing_hour },
    { label: `${labels.treatments} configurados`, done: treatments.length > 0 },
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
              <Store className="w-6 h-6 text-primary" />
              Mi Negocio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configura la información de tu empresa. Todo lo que agregues aquí se mostrará en tu landing pública.
            </p>
          </div>
          {landingUrl && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button size="sm" asChild>
                <a href={landingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" /> Ver landing
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Completion progress */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Progreso de configuración
              </span>
              <Badge variant={completionPercent === 100 ? "default" : "secondary"}>
                {completionPercent}%
              </Badge>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {completionItems.map(item => (
                <span
                  key={item.label}
                  className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    item.done
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.done ? "✓" : "○"} {item.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="perfil" onValueChange={(v) => { if (v === "perfil") initForm(); }}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="perfil" className="gap-1.5">
              <Settings2 className="w-4 h-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="servicios" className="gap-1.5">
              <Briefcase className="w-4 h-4" /> {labels.treatments}
            </TabsTrigger>
            <TabsTrigger value="landing" className="gap-1.5">
              <Globe className="w-4 h-4" /> Landing
            </TabsTrigger>
          </TabsList>

          {/* ── Perfil Tab ── */}
          <TabsContent value="perfil" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del negocio</CardTitle>
                <CardDescription>
                  Esta información aparecerá en tu landing y será usada por el asistente de IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del negocio *</Label>
                    <Input
                      value={form.name ?? clinic?.name ?? ""}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ej: Mi Clínica Dental"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={form.city ?? clinic?.city ?? ""}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Ej: Quito"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={form.address ?? clinic?.address ?? ""}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Ej: Av. Principal 123"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={form.description ?? clinic?.description ?? ""}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe brevemente tu negocio..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={form.whatsapp ?? clinic?.whatsapp ?? ""}
                      onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="+593999999999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zona horaria</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={(form as any).timezone ?? clinic?.timezone ?? "America/Guayaquil"}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                    >
                      <option value="America/New_York">US Eastern (New York)</option>
                      <option value="America/Chicago">US Central (Chicago)</option>
                      <option value="America/Denver">US Mountain (Denver)</option>
                      <option value="America/Los_Angeles">US Pacific (Los Angeles)</option>
                      <option value="America/Mexico_City">México (Ciudad de México)</option>
                      <option value="America/Bogota">Colombia (Bogotá)</option>
                      <option value="America/Guayaquil">Ecuador (Guayaquil)</option>
                      <option value="America/Lima">Perú (Lima)</option>
                      <option value="America/Santiago">Chile (Santiago)</option>
                      <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
                      <option value="America/Sao_Paulo">Brasil (São Paulo)</option>
                      <option value="America/Caracas">Venezuela (Caracas)</option>
                      <option value="America/Panama">Panamá</option>
                      <option value="America/Costa_Rica">Costa Rica</option>
                      <option value="America/Guatemala">Guatemala</option>
                      <option value="Europe/Madrid">España (Madrid)</option>
                      <option value="Europe/London">UK (Londres)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">La IA usará esta zona horaria para agendar citas correctamente.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <Label>Hora apertura</Label>
                      <Input
                        type="time"
                        value={form.opening_hour ?? clinic?.opening_hour ?? "09:00"}
                        onChange={e => setForm(f => ({ ...f, opening_hour: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label>Hora cierre</Label>
                      <Input
                        type="time"
                        value={form.closing_hour ?? clinic?.closing_hour ?? "18:00"}
                        onChange={e => setForm(f => ({ ...f, closing_hour: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={updateClinic.isPending}>
                    {updateClinic.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Servicios Tab ── */}
          <TabsContent value="servicios" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{labels.treatments}</CardTitle>
                <CardDescription>
                  Estos {labels.treatments.toLowerCase()} aparecerán en tu landing. Para agregar o editar ve a la sección de {labels.treatments}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {treatments.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-muted-foreground">No tienes {labels.treatments.toLowerCase()} configurados aún</p>
                    <p className="text-xs text-muted-foreground/70">
                      Los {labels.treatments.toLowerCase()} que configures aparecerán automáticamente en tu landing pública.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/configuracion/tratamientos"}>
                      Configurar {labels.treatments}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {treatments.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground">{t.name}</p>
                          {t.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{t.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">{t.duration} min</span>
                          <Badge variant="secondary">${t.price}</Badge>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" size="sm" onClick={() => window.location.href = "/configuracion/tratamientos"}>
                        Editar {labels.treatments}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Landing Tab ── */}
          <TabsContent value="landing" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Tu landing pública
                </CardTitle>
                <CardDescription>
                  Esta es la página web que tus clientes verán. Incluye la información de tu negocio, servicios y un chat con tu asistente de IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {landingUrl ? (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Globe className="w-4 h-4 text-primary shrink-0" />
                      <code className="text-sm text-foreground flex-1 truncate">{landingUrl}</code>
                      <Button variant="ghost" size="sm" onClick={copyLink}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={landingUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>

                    {/* Preview iframe */}
                    <div className="border border-border rounded-xl overflow-hidden bg-muted">
                      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-destructive/40" />
                          <div className="w-3 h-3 rounded-full bg-warning/40" />
                          <div className="w-3 h-3 rounded-full bg-success/40" />
                        </div>
                        <span className="text-xs text-muted-foreground truncate flex-1">{landingUrl}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={landingUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4 mr-1" /> Abrir
                          </a>
                        </Button>
                      </div>
                      <iframe
                        src={`/negocio/${clinic?.slug}`}
                        className="w-full h-[500px] border-0"
                        title="Landing Preview"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <Globe className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-muted-foreground">Tu landing aún no está activa</p>
                    <p className="text-xs text-muted-foreground/70">
                      Completa el onboarding para activar tu página pública con un link compartible.
                    </p>
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
