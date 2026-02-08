import { useState } from "react";
import { Sparkles, Image, Video, FileText, Wand2, Loader2, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ContentPost } from "@/hooks/useContentPosts";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

type GenType = "copy" | "image" | "video";

const genTypes = [
  { key: "copy" as GenType, icon: FileText, label: "Copy / Texto", desc: "Genera textos para publicaciones" },
  { key: "image" as GenType, icon: Image, label: "Imagen con IA", desc: "Genera imágenes únicas" },
  { key: "video" as GenType, icon: Video, label: "Video con IA", desc: "Genera videos cortos" },
];

const tones = ["Profesional", "Casual", "Inspirador", "Educativo", "Humorístico", "Urgente", "Emotivo"];
const platforms = ["Instagram", "Facebook", "TikTok"];

const ContentAIGenerator = ({ content }: Props) => {
  const [genType, setGenType] = useState<GenType>("copy");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [platform, setPlatform] = useState("Instagram");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Escribe una descripción"); return; }
    setGenerating(true);
    setResult(null);

    try {
      if (genType === "copy") {
        const { data, error } = await supabase.functions.invoke("ai-generate-content", {
          body: { prompt, tone, platform, type: "copy" },
        });
        if (error) throw error;
        setResult(data?.content || "No se pudo generar el contenido");
      } else {
        // For image/video - placeholder for future integration
        toast.info("La generación de imágenes y videos estará disponible próximamente con la integración de APIs externas");
        setResult(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error generando contenido");
    } finally {
      setGenerating(false);
    }
  };

  const saveAsDraft = async () => {
    if (!result) return;
    await content.createPost({
      body: result,
      title: prompt.slice(0, 60),
      status: "draft",
      ai_generated: true,
      ai_prompt: prompt,
      platforms: [platform.toLowerCase()],
      media_type: genType === "image" ? "image" : genType === "video" ? "video" : "image",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Generar contenido con IA</h2>
        <p className="text-sm text-muted-foreground">Usa inteligencia artificial para crear textos, imágenes y videos</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-3">
        {genTypes.map(({ key, icon: Icon, label, desc }) => (
          <button
            key={key}
            onClick={() => setGenType(key)}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              genType === key
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-2", genType === key ? "text-primary" : "text-muted-foreground")} />
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 md:col-span-2">
          <div>
            <Label className="text-sm font-medium">Describe lo que necesitas</Label>
            <Textarea
              placeholder={
                genType === "copy"
                  ? "Ej: Publicación promocionando nuestro servicio de limpieza dental con 20% de descuento..."
                  : genType === "image"
                  ? "Ej: Imagen moderna de una clínica dental con colores azules y blancos..."
                  : "Ej: Video corto mostrando el antes y después de un blanqueamiento dental..."
              }
              className="mt-1.5 min-h-[120px]"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Tono</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Plataforma destino</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="gradient-primary text-primary-foreground gap-2">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {generating ? "Generando..." : "Generar contenido"}
      </Button>

      {/* Result */}
      {result && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Resultado generado</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ IA</Badge>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copiado"); }}>
              <Copy className="w-3.5 h-3.5" /> Copiar
            </Button>
            <Button size="sm" className="gap-1.5 gradient-primary text-primary-foreground" onClick={saveAsDraft}>
              <Save className="w-3.5 h-3.5" /> Guardar como borrador
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentAIGenerator;
