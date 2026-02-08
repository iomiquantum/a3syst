import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClinic } from "@/hooks/useClinic";
import { Copy, Code, ExternalLink, Globe, Palette, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const WidgetConfigPage = () => {
  const { clinicId, clinicName } = useClinic();
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [title, setTitle] = useState("Chat con nosotros");
  const [subtitle, setSubtitle] = useState("Te responderemos lo antes posible");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const embedCode = `<!-- IOMI Chat Widget - ${clinicName || "Mi Clínica"} -->
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

  const steps = [
    {
      num: 1,
      title: "Copia el código",
      desc: "Haz clic en el botón \"Copiar código\" de abajo para copiar el fragmento de instalación.",
    },
    {
      num: 2,
      title: "Abre el editor de tu sitio web",
      desc: "Accede al panel de administración de tu sitio web (WordPress, Wix, Squarespace, HTML personalizado, etc.).",
    },
    {
      num: 3,
      title: "Pega el código antes de </body>",
      desc: "En WordPress: ve a Apariencia → Editor de temas → footer.php. En Wix/Squarespace: busca la sección de \"Código personalizado\" o \"Custom Code\" en los ajustes.",
    },
    {
      num: 4,
      title: "Guarda y verifica",
      desc: "Guarda los cambios y abre tu sitio web. Deberías ver el botón de chat en la esquina inferior derecha.",
    },
  ];

  const platformInstructions = [
    {
      name: "WordPress",
      steps: "Apariencia → Personalizar → Código adicional → Pie de página. O usa el plugin \"Insert Headers and Footers\" y pega el código en la sección Footer.",
    },
    {
      name: "Wix",
      steps: "Configuración → Código personalizado → Agregar código → Pegar el código → Seleccionar \"Body - end\" → Aplicar a todas las páginas.",
    },
    {
      name: "Squarespace",
      steps: "Configuración → Avanzado → Inyección de código → Pegar en el campo \"Footer\" → Guardar.",
    },
    {
      name: "Shopify",
      steps: "Tienda online → Temas → Acciones → Editar código → layout/theme.liquid → Pegar antes de </body> → Guardar.",
    },
    {
      name: "HTML personalizado",
      steps: "Abre tu archivo HTML principal → Pega el código justo antes de la etiqueta </body> de cierre → Guarda el archivo.",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Widget de Chat Web</h1>
            <p className="text-muted-foreground mt-1">
              Instala el widget en tu sitio web para recibir mensajes directamente en tu buzón
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-success" />
            Código único para: {clinicName || "tu clínica"}
          </Badge>
        </div>

        {/* Identification card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Este código es único para tu clínica <span className="font-bold">{clinicName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ID de clínica: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{clinicId || "—"}</code>
                &nbsp;· Los mensajes recibidos llegarán automáticamente al buzón de esta clínica.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-5 h-5" /> Personalización
              </CardTitle>
              <CardDescription>Personaliza la apariencia del widget para que coincida con tu sitio web</CardDescription>
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
                <Label>Título del chat</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Clínica asignada</Label>
                <Input value={clinicName || ""} disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-5 h-5" /> Vista previa
              </CardTitle>
              <CardDescription>Así se verá el widget en tu sitio web</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 relative h-[380px] overflow-hidden">
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Installation steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-success" /> Guía de instalación paso a paso
            </CardTitle>
            <CardDescription>Sigue estos 4 sencillos pasos para instalar el widget en tu sitio web</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map(step => (
                <div key={step.num} className="flex flex-col gap-2 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {step.num}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code className="w-5 h-5" /> Tu código de instalación
            </CardTitle>
            <CardDescription>
              Este es el código único de tu clínica. Cópialo y pégalo antes de <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> en tu sitio web.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-[hsl(var(--muted))] rounded-lg p-4 text-xs overflow-x-auto text-foreground whitespace-pre-wrap font-mono border border-border leading-relaxed">
                {embedCode}
              </pre>
              <Button
                size="sm"
                onClick={copyCode}
                className="absolute top-2 right-2 gap-1.5 h-7 text-xs"
              >
                <Copy className="w-3 h-3" /> Copiar
              </Button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Importante:</span> No modifiques el valor de <code className="bg-muted px-1 py-0.5 rounded">clinicId</code> ni <code className="bg-muted px-1 py-0.5 rounded">apiUrl</code>. Estos valores son únicos para tu clínica.
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={copyCode} className="gap-2">
                <Copy className="w-4 h-4" /> Copiar código completo
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(`<!DOCTYPE html><html><head><title>Prueba Widget - ${clinicName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;padding:40px}h1{font-size:24px;margin-bottom:8px}p{font-size:14px;color:#64748b;max-width:480px;text-align:center;line-height:1.6}.badge{background:#e0e7ff;color:#4338ca;font-size:11px;padding:4px 12px;border-radius:99px;margin-top:12px;display:inline-block}</style></head><body><h1>Página de prueba</h1><p>Esta es una simulación de tu sitio web. El widget de chat aparece en la esquina inferior derecha.</p><span class="badge">Widget activo para: ${clinicName}</span><script>window.IOMI_WIDGET={clinicId:"${clinicId}",apiUrl:"${supabaseUrl}",primaryColor:"${primaryColor}",title:"${title}",subtitle:"${subtitle}"};</script><script src="${window.location.origin}/widget.js" defer></script></body></html>`);
                  w.document.close();
                }
              }}>
                <ExternalLink className="w-4 h-4" /> Probar widget en vivo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform-specific instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Instrucciones por plataforma</CardTitle>
            <CardDescription>Selecciona la plataforma de tu sitio web para ver instrucciones específicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformInstructions.map(p => (
                <div key={p.name} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <Badge variant="secondary" className="shrink-0 mt-0.5">{p.name}</Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.steps}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">❓ Preguntas frecuentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">¿Puedo instalar el widget en varias páginas?</p>
              <p className="text-xs text-muted-foreground mt-1">Sí. Si pegas el código en el footer o en la plantilla global de tu sitio, aparecerá en todas las páginas automáticamente.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">¿Los mensajes del widget llegan al mismo buzón?</p>
              <p className="text-xs text-muted-foreground mt-1">Sí. Todos los mensajes del widget aparecen en tu buzón de Mensajes con el icono 🌐 Web, y puedes filtrar por canal.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">¿Se guarda la conversación del visitante?</p>
              <p className="text-xs text-muted-foreground mt-1">Sí. La sesión se guarda en el navegador del visitante, así que si vuelve a la página podrá continuar la conversación.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">¿Puedo cambiar los colores después?</p>
              <p className="text-xs text-muted-foreground mt-1">Sí. Solo cambia los valores en esta página, copia el nuevo código y reemplázalo en tu sitio web.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default WidgetConfigPage;
