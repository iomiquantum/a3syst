import { useState, useEffect } from "react";
import { Settings2, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePromptTemplates, useSavePromptTemplate, type PromptTemplate } from "@/hooks/usePromptTemplates";

const defaultImageTemplate = `Eres un diseñador gráfico profesional y director de arte de nivel senior. Crea una imagen publicitaria profesional para redes sociales.

REGLAS DE TEXTO EN LA IMAGEN:
- SOLO incluir: título/gancho principal (máx 6-8 palabras) y CTA principal
- NUNCA incluir párrafos largos, descripciones de estrategia, ni nombres de técnicas psicológicas
- El texto debe ser tipográficamente integrado al diseño, legible y con alto contraste

COMPOSICIÓN VISUAL:
- Paleta de colores coherente y atractiva
- Jerarquía visual: imagen de fondo > título > CTA
- Diseño que detenga el scroll
- Profesional y moderno

ESTRATEGIA (solo para composición visual, NO como texto):
- La estrategia influye en: colores, emociones transmitidas, estilo fotográfico, iluminación y mood general
- NUNCA escribir nombres de arquetipos, técnicas o gatillos como texto en la imagen`;

const defaultCopyTemplate = `Eres un experto en marketing digital, copywriting y neuromarketing para redes sociales.

REGLAS:
- Usa emojis relevantes pero sin exceso
- Incluye un call-to-action claro y persuasivo
- Escribe en español
- Responde SOLO con el texto de la publicación
- Aplica principios de neuromarketing: escasez, prueba social, reciprocidad según corresponda

ESTRATEGIA:
- Si se proporciona una estrategia, úsala para definir: tono emocional, enfoque persuasivo, público objetivo y ángulo del mensaje
- Adapta el lenguaje al código generacional indicado`;

const PromptTemplateEditor = () => {
  const { data: templates = [], isLoading } = usePromptTemplates();
  const saveTemplate = useSavePromptTemplate();
  const [open, setOpen] = useState(false);

  const imageTemplate = templates.find(t => t.type === "image");
  const copyTemplate = templates.find(t => t.type === "copy");

  const [imageText, setImageText] = useState("");
  const [copyText, setCopyText] = useState("");
  const [imageActive, setImageActive] = useState(true);
  const [copyActive, setCopyActive] = useState(true);

  useEffect(() => {
    setImageText(imageTemplate?.template || defaultImageTemplate);
    setCopyText(copyTemplate?.template || defaultCopyTemplate);
    setImageActive(imageTemplate?.is_active ?? true);
    setCopyActive(copyTemplate?.is_active ?? true);
  }, [templates]);

  const handleSave = async (type: "image" | "copy") => {
    const existing = type === "image" ? imageTemplate : copyTemplate;
    const text = type === "image" ? imageText : copyText;
    const active = type === "image" ? imageActive : copyActive;
    await saveTemplate.mutateAsync({
      id: existing?.id,
      type,
      name: type === "image" ? "Plantilla de imagen" : "Plantilla de copy",
      template: text,
      is_active: active,
    });
  };

  if (isLoading) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">🔧 Composición de Prompts (Admin)</span>
          </div>
          {open ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-6 p-4 rounded-xl border border-border bg-card">
        <p className="text-xs text-muted-foreground">
          Configura la estructura base de los prompts para la generación de imágenes y copies.
          Estos templates se aplicarán a todas las generaciones de contenido de esta clínica.
        </p>

        {/* Image prompt template */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">📸 Prompt base para Imágenes</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Activo</span>
              <Switch checked={imageActive} onCheckedChange={setImageActive} />
            </div>
          </div>
          <Textarea
            value={imageText}
            onChange={e => setImageText(e.target.value)}
            className="min-h-[200px] text-xs font-mono"
            placeholder="Escribe el prompt base para generación de imágenes..."
          />
          <Button
            size="sm"
            onClick={() => handleSave("image")}
            disabled={saveTemplate.isPending}
            className="gap-2"
          >
            {saveTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Guardar plantilla de imagen
          </Button>
        </div>

        {/* Copy prompt template */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">✍️ Prompt base para Copies</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Activo</span>
              <Switch checked={copyActive} onCheckedChange={setCopyActive} />
            </div>
          </div>
          <Textarea
            value={copyText}
            onChange={e => setCopyText(e.target.value)}
            className="min-h-[200px] text-xs font-mono"
            placeholder="Escribe el prompt base para generación de copies..."
          />
          <Button
            size="sm"
            onClick={() => handleSave("copy")}
            disabled={saveTemplate.isPending}
            className="gap-2"
          >
            {saveTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Guardar plantilla de copy
          </Button>
        </div>

        <div className="text-[10px] text-muted-foreground p-2 rounded bg-muted/50">
          <strong>Variables disponibles en los prompts:</strong> La estrategia, tono, plataforma, dimensiones y copy del usuario se inyectan automáticamente al final del template.
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PromptTemplateEditor;
