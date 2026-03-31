import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AvanzadoSection = ({ clinicId }: { clinicId: string }) => {
  const queryClient = useQueryClient();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["avanzado-clinic", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinics")
        .select("facebook_pixel_id, google_tag_manager_id, google_analytics_id, consent_text, slug")
        .eq("id", clinicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [pixelId, setPixelId] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [gaId, setGaId] = useState("");
  const [consentText, setConsentText] = useState("");
  const [savingAnalytics, setSavingAnalytics] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState<string | null>(null);

  useEffect(() => {
    if (clinic) {
      setPixelId(clinic.facebook_pixel_id || "");
      setGtmId(clinic.google_tag_manager_id || "");
      setGaId(clinic.google_analytics_id || "");
      setConsentText(clinic.consent_text || "");
    }
  }, [clinic]);

  const slug = clinic?.slug || "";

  const saveAnalytics = async () => {
    setSavingAnalytics(true);
    try {
      const { error } = await (supabase as any).from("clinics").update({
        facebook_pixel_id: pixelId || null,
        google_tag_manager_id: gtmId || null,
        google_analytics_id: gaId || null,
      }).eq("id", clinicId);
      if (error) throw error;
      toast.success("Analytics guardado");
      queryClient.invalidateQueries({ queryKey: ["avanzado-clinic", clinicId] });
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingAnalytics(false); }
  };

  const saveConsent = async () => {
    setSavingConsent(true);
    try {
      const { error } = await (supabase as any).from("clinics").update({ consent_text: consentText || null }).eq("id", clinicId);
      if (error) throw error;
      toast.success("Documento guardado");
      queryClient.invalidateQueries({ queryKey: ["avanzado-clinic", clinicId] });
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingConsent(false); }
  };

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedWidget(key);
    toast.success("Código copiado");
    setTimeout(() => setCopiedWidget(null), 2000);
  };

  const reservaCode = `<iframe src="https://a3networth.com/negocio/${slug}/reservar" width="100%" height="600" frameborder="0"></iframe>`;
  const contactoCode = `<iframe src="https://a3networth.com/negocio/${slug}/contacto" width="100%" height="500" frameborder="0"></iframe>`;

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analytics y Tracking</CardTitle>
          <CardDescription>Configura herramientas de analítica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Facebook Pixel ID</Label><Input value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="123456789" /><p className="text-xs text-muted-foreground">ID de tu Facebook Pixel</p></div>
          <div className="space-y-2"><Label>Google Tag Manager ID</Label><Input value={gtmId} onChange={e => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" /><p className="text-xs text-muted-foreground">ID de GTM</p></div>
          <div className="space-y-2"><Label>Google Analytics ID</Label><Input value={gaId} onChange={e => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX" /><p className="text-xs text-muted-foreground">ID de GA4</p></div>
          <div className="flex justify-end"><Button onClick={saveAnalytics} disabled={savingAnalytics}>{savingAnalytics ? "Guardando..." : "Guardar"}</Button></div>
        </CardContent>
      </Card>

      {/* Widgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Widgets Embebibles</CardTitle>
          <CardDescription>Integra formularios en tu sitio web</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "reserva", title: "Widget de Reserva", code: reservaCode },
            { key: "contacto", title: "Formulario de Contacto", code: contactoCode },
          ].map(w => (
            <div key={w.key} className="space-y-2">
              <Label>{w.title}</Label>
              <div className="relative">
                <textarea readOnly value={w.code} className="w-full p-3 text-xs font-mono bg-muted rounded-lg border border-border resize-none" rows={3} />
                <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyCode(w.code, w.key)}>
                  {copiedWidget === w.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos Legales</CardTitle>
          <CardDescription>Configura documentos de consentimiento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Consentimiento Informado</Label>
            <Textarea value={consentText} onChange={e => setConsentText(e.target.value)} placeholder="Escribe el texto del consentimiento informado..." rows={6} />
            <p className="text-xs text-muted-foreground">Este texto se mostrará al paciente antes de su primera cita</p>
          </div>
          <div className="flex justify-end"><Button onClick={saveConsent} disabled={savingConsent}>{savingConsent ? "Guardando..." : "Guardar"}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvanzadoSection;
