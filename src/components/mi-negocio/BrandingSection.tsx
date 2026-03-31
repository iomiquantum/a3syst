import { useState, useEffect } from "react";
import { ImagePlus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Testimonial { name: string; text: string; stars: number; }
interface Visibility { show_services: boolean; show_testimonials: boolean; show_team: boolean; show_contact: boolean; }

const BrandingSection = ({ clinicId }: { clinicId: string }) => {
  const queryClient = useQueryClient();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["branding-clinic", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinics")
        .select("logo_url, primary_color, secondary_color, landing_hero_title, landing_hero_subtitle, landing_testimonials, landing_visibility")
        .eq("id", clinicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#f0f0ff");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [visibility, setVisibility] = useState<Visibility>({ show_services: true, show_testimonials: true, show_team: true, show_contact: true });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (clinic) {
      setLogoUrl(clinic.logo_url);
      setPrimaryColor(clinic.primary_color || "#6366f1");
      setSecondaryColor(clinic.secondary_color || "#f0f0ff");
      setHeroTitle(clinic.landing_hero_title || "");
      setHeroSubtitle(clinic.landing_hero_subtitle || "");
      setTestimonials(Array.isArray(clinic.landing_testimonials) ? clinic.landing_testimonials : []);
      setVisibility(clinic.landing_visibility || { show_services: true, show_testimonials: true, show_team: true, show_contact: true });
    }
  }, [clinic]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("clinic-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("clinic-logos").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo subido");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("clinics").update({
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        landing_hero_title: heroTitle || null,
        landing_hero_subtitle: heroSubtitle || null,
        landing_testimonials: testimonials,
        landing_visibility: visibility,
      }).eq("id", clinicId);
      if (error) throw error;
      toast.success("Branding guardado");
      queryClient.invalidateQueries({ queryKey: ["branding-clinic", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["mi-negocio-profile", clinicId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addTestimonial = () => setTestimonials(prev => [...prev, { name: "", text: "", stars: 5 }]);
  const removeTestimonial = (idx: number) => setTestimonials(prev => prev.filter((_, i) => i !== idx));
  const updateTestimonial = (idx: number, field: keyof Testimonial, value: any) => {
    setTestimonials(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Logo</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-[120px] h-[120px] rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-[120px] h-[120px] rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
              <ImagePlus className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2">
            <Button variant="outline" size="sm" disabled={uploading} asChild>
              <label className="cursor-pointer">
                {uploading ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleUploadLogo} />
              </label>
            </Button>
            <p className="text-xs text-muted-foreground">Formatos: PNG, JPG, SVG. Máx: 2MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Paleta de colores</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Color Primario</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer" />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="max-w-[120px] font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color Secundario</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer" />
                <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="max-w-[120px] font-mono text-sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <div className="w-[200px] h-[80px] rounded-lg flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>Primario</div>
            <div className="w-[200px] h-[80px] rounded-lg flex items-center justify-center text-sm font-medium border border-border" style={{ backgroundColor: secondaryColor }}>Secundario</div>
          </div>
        </CardContent>
      </Card>

      {/* Landing content */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Contenido de Landing Page</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="general">
            <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="testimonios">Testimonios</TabsTrigger><TabsTrigger value="visibilidad">Visibilidad</TabsTrigger></TabsList>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Título Principal del Hero</Label><Input value={heroTitle} onChange={e => setHeroTitle(e.target.value)} placeholder="Ej: Bienvenido a nuestra clínica" /></div>
              <div className="space-y-2"><Label>Subtítulo del Hero</Label><Input value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Ej: Atención médica de calidad" /></div>
            </TabsContent>
            <TabsContent value="testimonios" className="space-y-4 mt-4">
              {testimonials.map((t, idx) => (
                <div key={idx} className="p-3 border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Input value={t.name} onChange={e => updateTestimonial(idx, "name", e.target.value)} placeholder="Nombre del cliente" className="max-w-xs" />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => updateTestimonial(idx, "stars", s)}>
                          <Star className={`w-4 h-4 ${s <= t.stars ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                      <button onClick={() => removeTestimonial(idx)} className="p-1 ml-2 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                  <Textarea value={t.text} onChange={e => updateTestimonial(idx, "text", e.target.value)} placeholder="Texto del testimonio..." rows={2} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTestimonial}>+ Agregar testimonio</Button>
            </TabsContent>
            <TabsContent value="visibilidad" className="space-y-4 mt-4">
              {[
                { key: "show_services", label: "Mostrar Servicios" },
                { key: "show_testimonials", label: "Mostrar Testimonios" },
                { key: "show_team", label: "Mostrar Equipo" },
                { key: "show_contact", label: "Mostrar Contacto" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label>{item.label}</Label>
                  <Switch checked={visibility[item.key as keyof Visibility]} onCheckedChange={v => setVisibility(prev => ({ ...prev, [item.key]: v }))} />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
      </div>
    </div>
  );
};

export default BrandingSection;
