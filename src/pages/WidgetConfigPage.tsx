import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClinic } from "@/hooks/useClinic";
import { Copy, Code, ExternalLink, Globe, Palette } from "lucide-react";
import { toast } from "sonner";

const WidgetConfigPage = () => {
  const { clinicId, clinicName } = useClinic();
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [title, setTitle] = useState("Chat con nosotros");
  const [subtitle, setSubtitle] = useState("Te responderemos lo antes posible");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const embedCode = `<!-- IOMI Chat Widget -->
<script>
  window.IOMI_WIDGET = {
    clinicId: "${clinicId || 'TU_CLINIC_ID'}",
    apiUrl: "${supabaseUrl}",
    primaryColor: "${primaryColor}",
    title: "${title}",
    subtitle: "${subtitle}"
  };
</script>
<script src="${window.location.origin}/widget.js" defer></script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success("Código copiado al portapapeles");
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Widget de Chat Web</h1>
          <p className="text-muted-foreground mt-1">
            Instala el widget en tu sitio web para recibir mensajes directamente en tu buzón
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" /> Personalización
              </CardTitle>
              <CardDescription>Personaliza la apariencia del widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Color principal</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Clínica</Label>
                <Input value={clinicName || ""} disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> Vista previa
              </CardTitle>
              <CardDescription>Así se verá el widget en tu sitio web</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 relative h-[380px] overflow-hidden">
                {/* Mini preview of widget */}
                <div className="absolute bottom-4 right-4 w-[280px]">
                  <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
                    <div className="p-4" style={{ backgroundColor: primaryColor }}>
                      <h3 className="text-white font-semibold text-sm">{title}</h3>
                      <p className="text-white/80 text-xs mt-1">{subtitle}</p>
                    </div>
                    <div className="p-3 bg-muted/30 min-h-[80px]">
                      <div className="flex">
                        <div className="bg-card border border-border rounded-xl rounded-bl-sm px-3 py-2 text-xs max-w-[70%]">
                          ¡Hola! 👋 ¿En qué podemos ayudarte?
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-border space-y-2">
                      <div className="h-7 rounded-lg border border-border bg-background px-2 flex items-center text-xs text-muted-foreground">Tu nombre *</div>
                      <div className="h-7 rounded-lg border border-border bg-background px-2 flex items-center text-xs text-muted-foreground">Tu email</div>
                      <div className="h-12 rounded-lg border border-border bg-background px-2 flex items-start pt-2 text-xs text-muted-foreground">Tu mensaje...</div>
                      <div className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}>
                        Enviar mensaje
                      </div>
                    </div>
                    <div className="text-center text-[9px] text-muted-foreground py-1">Powered by IOMI Clínicas</div>
                  </div>
                </div>
                {/* FAB preview */}
                <div className="absolute bottom-4 right-4 hidden">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" /> Código de instalación
            </CardTitle>
            <CardDescription>
              Copia este código y pégalo antes del cierre de <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> en tu sitio web
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto text-foreground whitespace-pre-wrap font-mono border border-border">
              {embedCode}
            </pre>
            <div className="flex gap-3">
              <Button onClick={copyCode} className="gap-2">
                <Copy className="w-4 h-4" /> Copiar código
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(`<!DOCTYPE html><html><head><title>Widget Test</title></head><body style="background:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif"><h1 style="color:#64748b">Página de prueba del widget</h1><script>window.IOMI_WIDGET={clinicId:"${clinicId}",apiUrl:"${supabaseUrl}",primaryColor:"${primaryColor}",title:"${title}",subtitle:"${subtitle}"};</script><script src="${window.location.origin}/widget.js" defer></script></body></html>`);
                  w.document.close();
                }
              }}>
                <ExternalLink className="w-4 h-4" /> Probar widget
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default WidgetConfigPage;
