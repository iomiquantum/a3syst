import { useState, useEffect } from "react";
import { Wand2, Loader2, Plus, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { ContentPost } from "@/hooks/useContentPosts";
import { supabase } from "@/integrations/supabase/client";
import AIGeneratedPiece, { type GeneratedPiece } from "./AIGeneratedPiece";
import { usePsychoStrategies } from "@/hooks/usePsychoMatrix";

interface Props {
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const tones = ["Profesional", "Casual", "Inspirador", "Educativo", "Humorístico", "Urgente", "Emotivo"];
const platforms = ["Instagram", "Facebook", "TikTok"];
const copyLengths = [
  { value: "short", label: "Corto", desc: "~50-100 caracteres" },
  { value: "medium", label: "Mediano", desc: "~150-250 caracteres" },
  { value: "long", label: "Amplio", desc: "~300-500 caracteres" },
];
const MAX_PIECES = 4;

const ContentAIGenerator = ({ content }: Props) => {
  const [count, setCount] = useState(2);
  const [mainPrompt, setMainPrompt] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [platform, setPlatform] = useState("Instagram");
  const [copyLength, setCopyLength] = useState("medium");
  const [extraNotes, setExtraNotes] = useState("");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("none");
  const [magicMode, setMagicMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pieces, setPieces] = useState<GeneratedPiece[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [regeneratingCopyId, setRegeneratingCopyId] = useState<number | null>(null);

  const { data: strategies = [] } = usePsychoStrategies();

  const updateCount = (n: number) => {
    setCount(Math.max(1, Math.min(MAX_PIECES, n)));
  };

  // When magic mode is toggled on, randomize fields
  useEffect(() => {
    if (magicMode) {
      setTone(tones[Math.floor(Math.random() * tones.length)]);
      setCopyLength(copyLengths[Math.floor(Math.random() * copyLengths.length)].value);
      if (strategies.length > 0) {
        const rand = strategies[Math.floor(Math.random() * strategies.length)];
        setSelectedStrategyId(rand.id);
      }
    }
  }, [magicMode, strategies]);

  const getEffectiveCopyLength = () => copyLengths.find(c => c.value === copyLength) || copyLengths[1];

  const handleGenerate = async () => {
    if (!mainPrompt.trim()) {
      toast.error("Describe tu campaña o idea");
      return;
    }

    setGenerating(true);
    setPieces(Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      instruction: mainPrompt,
      imagePrompt: "",
      copy: null,
      imageUrl: null,
      status: "generating",
    })));

    const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);
    const lengthInfo = getEffectiveCopyLength();

    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) =>
        generateVariation(mainPrompt, i + 1, count, tone, platform, lengthInfo, selectedStrategy, extraNotes)
      )
    );

    setPieces(results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      console.error(`Variación ${i + 1} falló:`, r.reason);
      toast.error(`Error generando variación #${i + 1}`);
      return {
        id: i + 1, instruction: mainPrompt, imagePrompt: "", copy: null, imageUrl: null, status: "done" as const,
      };
    }));

    setGenerating(false);
  };

  const handleCopyChange = (id: number, copy: string) => {
    setPieces(prev => prev.map(p => (p.id === id ? { ...p, copy } : p)));
  };

  const handleRegenerateImage = async (id: number, customPrompt?: string) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece) return;
    setRegeneratingId(id);
    const prompt = customPrompt || `Variación visual diferente para: ${piece.instruction}. Crear una imagen completamente distinta a las anteriores, con otro estilo, composición y enfoque visual.`;
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone, platform, type: "image" },
      });
      if (error) throw error;
      setPieces(prev => prev.map(p => (p.id === id ? { ...p, imageUrl: data?.imageUrl || p.imageUrl, imagePrompt: prompt } : p)));
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
      const variationPrompt = `${piece.instruction}\n\nIMPORTANTE: Genera un copy COMPLETAMENTE NUEVO y DIFERENTE al anterior. Usa un enfoque, ángulo o estilo de escritura distinto. Sé creativo y original.`;
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

      {/* ✨ Hacer Magia checkbox */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <Checkbox
          id="magic-mode"
          checked={magicMode}
          onCheckedChange={(checked) => setMagicMode(checked === true)}
          className="h-5 w-5"
        />
        <label htmlFor="magic-mode" className="flex items-center gap-2 cursor-pointer select-none">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <span className="text-sm font-bold text-foreground">Hacer magia</span>
            <p className="text-xs text-muted-foreground">Déjanos a nosotros hacer la magia ✨</p>
          </div>
        </label>
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

      {/* Strategy selector */}
      {!magicMode && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Estrategia Psycho-Matrix (opcional)</Label>
          <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Sin estrategia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin estrategia</SelectItem>
              {strategies.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {s.archetype} / {s.brand_voice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {strategies.length === 0 && (
            <p className="text-xs text-muted-foreground">No tienes estrategias creadas. Crea una en Psycho-Matrix AI.</p>
          )}
        </div>
      )}

      {/* Extra notes */}
      {!magicMode && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Notas adicionales (opcional)</Label>
          <Textarea
            placeholder="Agrega instrucciones extras, detalles del público, hashtags que quieras incluir..."
            className="min-h-[60px]"
            value={extraNotes}
            onChange={e => setExtraNotes(e.target.value)}
          />
        </div>
      )}

      {/* Count + Tone + Platform + Copy Length */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        {!magicMode && (
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

        {!magicMode && (
          <div>
            <Label className="text-sm font-medium">Tamaño del copy</Label>
            <Select value={copyLength} onValueChange={setCopyLength}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {copyLengths.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label} <span className="text-muted-foreground ml-1">({c.desc})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Magic mode summary */}
      {magicMode && (
        <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 border border-border space-y-1">
          <p><span className="font-medium text-foreground">🎲 Modo magia activado:</span> Tono: <strong>{tone}</strong> · Tamaño: <strong>{getEffectiveCopyLength().label}</strong>
            {selectedStrategyId !== "none" && strategies.find(s => s.id === selectedStrategyId) && (
              <> · Estrategia: <strong>{strategies.find(s => s.id === selectedStrategyId)?.name}</strong></>
            )}
          </p>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generating || !mainPrompt.trim()}
        className="gradient-primary text-primary-foreground gap-2"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : magicMode ? <Sparkles className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
        {generating ? "Generando variaciones..." : magicMode ? `✨ Hacer magia (${count})` : `Generar ${count} variación${count > 1 ? "es" : ""}`}
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
  lengthInfo: { value: string; label: string; desc: string },
  strategy?: any,
  extraNotes?: string,
): Promise<GeneratedPiece> {
  let strategyContext = "";
  if (strategy) {
    strategyContext = `\n\nESTRATEGIA DE MARKETING:
- Arquetipo: ${strategy.archetype}
- Voz de marca: ${strategy.brand_voice}
- Gatillo de persuasión: ${strategy.persuasion_trigger}
- Generación objetivo: ${strategy.generation}
${strategy.advanced_tech ? `- Técnica avanzada: ${strategy.advanced_tech}` : ""}
${strategy.generated_prompt ? `- Prompt estratégico: ${strategy.generated_prompt}` : ""}
Aplica esta estrategia al copy generado.`;
  }

  const lengthInstruction = `\nLONGITUD DEL COPY: Genera un copy ${lengthInfo.label.toUpperCase()} (${lengthInfo.desc}). Respeta estrictamente este límite de caracteres.`;

  const extraContext = extraNotes?.trim() ? `\nNOTAS ADICIONALES DEL USUARIO: ${extraNotes}` : "";

  const variationPrompt = `${mainPrompt}${strategyContext}${lengthInstruction}${extraContext}

IMPORTANTE: Esta es la variación #${variationNum} de ${totalVariations} variaciones totales. 
Genera un copy COMPLETAMENTE DIFERENTE a las demás variaciones. Usa un enfoque, ángulo o público objetivo distinto.
- Variación 1: enfoque emocional/sentimental
- Variación 2: enfoque de oferta/urgencia  
- Variación 3: enfoque educativo/informativo
- Variación 4: enfoque testimonial/social proof
Usa el enfoque correspondiente a tu número de variación.`;

  const imagePrompt = `${mainPrompt}. 
Variación visual #${variationNum} de ${totalVariations}: Crear una imagen con estilo, composición y paleta de colores COMPLETAMENTE DIFERENTE a las otras variaciones. Usar un enfoque visual único y creativo.`;

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
    imagePrompt,
    copy,
    imageUrl,
    status: "done",
  };
}
