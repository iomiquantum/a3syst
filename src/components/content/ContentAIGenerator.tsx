import { useState } from "react";
import { Wand2, Loader2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { ContentPost } from "@/hooks/useContentPosts";
import { supabase } from "@/integrations/supabase/client";
import AIGeneratedPiece, { type GeneratedPiece } from "./AIGeneratedPiece";

interface Props {
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const tones = ["Profesional", "Casual", "Inspirador", "Educativo", "Humorístico", "Urgente", "Emotivo"];
const platforms = ["Instagram", "Facebook", "TikTok"];
const MAX_PIECES = 4;

const ContentAIGenerator = ({ content }: Props) => {
  const [count, setCount] = useState(2);
  const [mainPrompt, setMainPrompt] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [platform, setPlatform] = useState("Instagram");
  const [generating, setGenerating] = useState(false);
  const [pieces, setPieces] = useState<GeneratedPiece[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [regeneratingCopyId, setRegeneratingCopyId] = useState<number | null>(null);

  const updateCount = (n: number) => {
    setCount(Math.max(1, Math.min(MAX_PIECES, n)));
  };

  const handleGenerate = async () => {
    if (!mainPrompt.trim()) {
      toast.error("Describe tu campaña o idea");
      return;
    }

    setGenerating(true);
    setPieces(Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      instruction: mainPrompt,
      copy: null,
      imageUrl: null,
      status: "generating",
    })));

    // Generate all variations in parallel — each call gets a unique variation prompt
    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) =>
        generateVariation(mainPrompt, i + 1, count, tone, platform)
      )
    );

    setPieces(results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      console.error(`Variación ${i + 1} falló:`, r.reason);
      toast.error(`Error generando variación #${i + 1}`);
      return {
        id: i + 1,
        instruction: mainPrompt,
        copy: null,
        imageUrl: null,
        status: "done" as const,
      };
    }));

    setGenerating(false);
  };

  const handleCopyChange = (id: number, copy: string) => {
    setPieces(prev => prev.map(p => (p.id === id ? { ...p, copy } : p)));
  };

  const handleRegenerateImage = async (id: number) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece) return;
    setRegeneratingId(id);

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: {
          prompt: `Variación visual diferente para: ${piece.instruction}. Crear una imagen completamente distinta a las anteriores, con otro estilo, composición y enfoque visual.`,
          tone,
          platform,
          type: "image",
        },
      });
      if (error) throw error;
      setPieces(prev => prev.map(p => (p.id === id ? { ...p, imageUrl: data?.imageUrl || p.imageUrl } : p)));
    } catch (err) {
      console.error(err);
      toast.error("Error regenerando imagen");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRegenerateCopy = async (id: number) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece) return;
    setRegeneratingCopyId(id);

    try {
      const variationPrompt = `${piece.instruction}

IMPORTANTE: Genera un copy COMPLETAMENTE NUEVO y DIFERENTE al anterior. Usa un enfoque, ángulo o estilo de escritura distinto. Sé creativo y original.`;

      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt: variationPrompt, tone, platform, type: "copy" },
      });
      if (error) throw error;
      setPieces(prev => prev.map(p => (p.id === id ? { ...p, copy: data?.content || p.copy } : p)));
    } catch (err) {
      console.error(err);
      toast.error("Error regenerando copy");
    } finally {
      setRegeneratingCopyId(null);
    }
  };


  const handleApprove = async (id: number) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece || !piece.copy || !piece.imageUrl) return;

    await content.createPost({
      body: piece.copy,
      title: mainPrompt.slice(0, 60),
      status: "draft",
      ai_generated: true,
      ai_prompt: mainPrompt,
      platforms: [platform.toLowerCase()],
      media_urls: [piece.imageUrl],
      media_type: "image",
    });

    setPieces(prev => prev.map(p => (p.id === id ? { ...p, status: "approved" } : p)));
  };

  const allDone = pieces.length > 0 && pieces.every(p => p.status === "done" || p.status === "approved");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Generar campaña con IA</h2>
        <p className="text-sm text-muted-foreground">
          Describe tu campaña y elige cuántas variaciones quieres. La IA generará copies e imágenes diferentes,
          cada uno enfocado a un ángulo o público distinto.
        </p>
      </div>

      {/* Main prompt */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">¿Qué quieres promocionar?</Label>
        <Textarea
          placeholder="Ej: Campaña por el Día de la Madre, promocionar paquetes de blanqueamiento dental y limpieza con 30% de descuento, dirigido a mujeres de 25-50 años..."
          className="min-h-[120px]"
          value={mainPrompt}
          onChange={e => setMainPrompt(e.target.value)}
        />
      </div>

      {/* Count + Tone + Platform */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Variaciones a generar</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCount(count - 1)} disabled={count <= 1}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{count}</span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCount(count + 1)} disabled={count >= MAX_PIECES}>
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-1">máx. {MAX_PIECES}</span>
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

      <Button
        onClick={handleGenerate}
        disabled={generating || !mainPrompt.trim()}
        className="gradient-primary text-primary-foreground gap-2"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {generating ? "Generando variaciones..." : `Generar ${count} variación${count > 1 ? "es" : ""}`}
      </Button>

      {/* Generating skeleton */}
      {generating && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4 bg-card animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-[200px] bg-muted rounded" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {allDone && (
        <div className="grid gap-4 md:grid-cols-2">
          {pieces.map(piece => (
            <AIGeneratedPiece
              key={piece.id}
              piece={piece}
              onCopyChange={handleCopyChange}
              onRegenerateImage={handleRegenerateImage}
              onRegenerateCopy={handleRegenerateCopy}
              onApprove={handleApprove}
              regeneratingImage={regeneratingId === piece.id}
              regeneratingCopy={regeneratingCopyId === piece.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentAIGenerator;

// Helper: generate one variation with unique angle
async function generateVariation(
  mainPrompt: string,
  variationNum: number,
  totalVariations: number,
  tone: string,
  platform: string,
): Promise<GeneratedPiece> {
  const variationPrompt = `${mainPrompt}

IMPORTANTE: Esta es la variación #${variationNum} de ${totalVariations} variaciones totales. 
Genera un copy COMPLETAMENTE DIFERENTE a las demás variaciones. Usa un enfoque, ángulo o público objetivo distinto.
- Variación 1: enfoque emocional/sentimental
- Variación 2: enfoque de oferta/urgencia  
- Variación 3: enfoque educativo/informativo
- Variación 4: enfoque testimonial/social proof
Usa el enfoque correspondiente a tu número de variación.`;

  const imagePrompt = `${mainPrompt}. 
Variación visual #${variationNum} de ${totalVariations}: Crear una imagen con estilo, composición y paleta de colores COMPLETAMENTE DIFERENTE a las otras variaciones. Usar un enfoque visual único y creativo.`;

  // Generate copy and image in parallel
  const [copyResult, imgResult] = await Promise.allSettled([
    supabase.functions.invoke("ai-generate-content", {
      body: { prompt: variationPrompt, tone, platform, type: "copy" },
    }),
    supabase.functions.invoke("ai-generate-content", {
      body: { prompt: imagePrompt, tone, platform, type: "image" },
    }),
  ]);

  const copy = copyResult.status === "fulfilled" && !copyResult.value.error
    ? copyResult.value.data?.content || ""
    : null;

  const imageUrl = imgResult.status === "fulfilled" && !imgResult.value.error
    ? imgResult.value.data?.imageUrl || null
    : null;

  return {
    id: variationNum,
    instruction: mainPrompt,
    copy,
    imageUrl,
    status: "done",
  };
}
