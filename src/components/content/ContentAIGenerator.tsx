import { useState } from "react";
import { Sparkles, Image, Video, FileText, Wand2, Loader2, Copy, Save, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  { key: "video" as GenType, icon: Video, label: "Video con IA", desc: "Genera videos cortos (próximamente)" },
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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Escribe una descripción"); return; }
    setGenerating(true);
    setResult(null);
    setGeneratedImageUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone, platform, type: genType },
      });
      if (error) throw error;
      
      if (genType === "image" && data?.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setResult(data.content || "Imagen generada exitosamente");
      } else if (genType === "copy") {
        setResult(data?.content || "No se pudo generar el contenido");
      } else {
        toast.info("La generación de videos estará disponible próximamente");
      }
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("429")) {
        toast.error("Límite de solicitudes excedido, intenta en unos segundos");
      } else if (err?.message?.includes("402")) {
        toast.error("Créditos de IA insuficientes");
      } else {
        toast.error("Error generando contenido");
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveAsDraft = async () => {
    if (!result && !generatedImageUrl) return;
    await content.createPost({
      body: genType === "copy" ? result || "" : prompt,
      title: prompt.slice(0, 60),
      status: "draft",
      ai_generated: true,
      ai_prompt: prompt,
      platforms: [platform.toLowerCase()],
      media_urls: generatedImageUrl ? [generatedImageUrl] : [],
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
            onClick={() => { setGenType(key); setResult(null); setGeneratedImageUrl(null); }}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              genType === key ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30",
              key === "video" && "opacity-60"
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
                  ? "Ej: Publicación promocionando limpieza dental con 20% descuento..."
                  : genType === "image"
                  ? "Ej: Imagen profesional de una clínica dental moderna, colores azul y blanco, estilo minimalista..."
                  : "Ej: Video corto mostrando un blanqueamiento dental..."
              }
              className="mt-1.5 min-h-[120px]"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>
        </div>

        {genType === "copy" && (
          <div>
            <Label className="text-sm font-medium">Tono</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

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

      <Button onClick={handleGenerate} disabled={generating || !prompt.trim() || genType === "video"} className="gradient-primary text-primary-foreground gap-2">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {generating ? "Generando..." : genType === "image" ? "Generar imagen" : genType === "video" ? "Próximamente" : "Generar contenido"}
      </Button>

      {/* Text result */}
      {result && genType === "copy" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Resultado generado</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ IA</Badge>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result}</div>
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

      {/* Image result */}
      {generatedImageUrl && genType === "image" && (
        <div className="border border-border rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Imagen generada</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ IA</Badge>
          </div>
          <div className="rounded-lg overflow-hidden border border-border">
            <img src={generatedImageUrl} alt="Generated" className="w-full max-h-[400px] object-contain bg-muted" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={generatedImageUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="w-3.5 h-3.5" /> Descargar
              </a>
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
