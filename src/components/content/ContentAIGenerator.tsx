import { useState, useEffect } from "react";
import { Wand2, Loader2, Plus, Minus, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { ContentPost } from "@/hooks/useContentPosts";
import { supabase } from "@/integrations/supabase/client";
import AIGeneratedPiece, { type GeneratedPiece } from "./AIGeneratedPiece";
import PromptTemplateEditor from "./PromptTemplateEditor";
import { usePsychoStrategies } from "@/hooks/usePsychoMatrix";
import { useActivePromptTemplate } from "@/hooks/usePromptTemplates";
import { useClinic } from "@/hooks/useClinic";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada,
} from "@/lib/psychoMatrixData";

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
  { value: "custom", label: "Personalizado", desc: "caracteres a medida" },
];

const imageSizesByPlatform: Record<string, { label: string; value: string; w: number; h: number }[]> = {
  Instagram: [
    { label: "Feed cuadrado", value: "ig-feed-sq", w: 1080, h: 1080 },
    { label: "Feed vertical", value: "ig-feed-v", w: 1080, h: 1350 },
    { label: "Story / Reel", value: "ig-story", w: 1080, h: 1920 },
    { label: "Anuncio Feed", value: "ig-ad-feed", w: 1080, h: 1080 },
    { label: "Anuncio Story", value: "ig-ad-story", w: 1080, h: 1920 },
  ],
  Facebook: [
    { label: "Feed horizontal", value: "fb-feed", w: 1200, h: 630 },
    { label: "Feed cuadrado", value: "fb-feed-sq", w: 1080, h: 1080 },
    { label: "Story", value: "fb-story", w: 1080, h: 1920 },
    { label: "Anuncio Feed", value: "fb-ad-feed", w: 1200, h: 628 },
    { label: "Anuncio Carrusel", value: "fb-ad-carousel", w: 1080, h: 1080 },
  ],
  TikTok: [
    { label: "Video vertical", value: "tt-video", w: 1080, h: 1920 },
    { label: "Anuncio In-Feed", value: "tt-ad", w: 1080, h: 1920 },
    { label: "Anuncio cuadrado", value: "tt-ad-sq", w: 1080, h: 1080 },
  ],
};

const MAX_PIECES = 4;

const ContentAIGenerator = ({ content }: Props) => {
  const [count, setCount] = useState(2);
  const [mainPrompt, setMainPrompt] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [platform, setPlatform] = useState("Instagram");
  const [imageSize, setImageSize] = useState("ig-feed-sq");
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const [copyLength, setCopyLength] = useState("medium");
  const [customCopyChars, setCustomCopyChars] = useState(300);
  const [extraNotes, setExtraNotes] = useState("");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("none");
  const [magicMode, setMagicMode] = useState(false);
  const [magicFormula, setMagicFormula] = useState<{
    archetype: string; brand_voice: string; persuasion_trigger: string; generation: string; advanced_tech: string;
  } | null>(null);
  const [imageFromCopy, setImageFromCopy] = useState(false);
  const [imageModel, setImageModel] = useState<"flash" | "pro">("pro");
  const [generating, setGenerating] = useState(false);
  const [pieces, setPieces] = useState<GeneratedPiece[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [regeneratingCopyId, setRegeneratingCopyId] = useState<number | null>(null);

  const { data: strategies = [] } = usePsychoStrategies();
  const { isSuperAdmin } = useClinic();
  const { data: imagePromptTemplate } = useActivePromptTemplate("image");
  const { data: copyPromptTemplate } = useActivePromptTemplate("copy");

  const updateCount = (n: number) => setCount(Math.max(1, Math.min(MAX_PIECES, n)));

  const randomPick = <T extends { label: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].label;

  const hacerMagia = () => {
    setTone(tones[Math.floor(Math.random() * tones.length)]);
    // copyLength is no longer randomized - user controls it independently
    setMagicFormula({
      archetype: randomPick(arquetiposDigitales),
      brand_voice: randomPick(arquetiposMarca),
      persuasion_trigger: randomPick(disparadoresPersuasion),
      generation: randomPick(codigosGeneracionales),
      advanced_tech: Math.random() > 0.4 ? randomPick(psicologiaAvanzada) : "",
    });
    setSelectedStrategyId("none");
  };

  const handleMagicToggle = (checked: boolean) => {
    setMagicMode(checked);
    if (checked) hacerMagia();
    else setMagicFormula(null);
  };

  // When platform changes, reset image size to first option
  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    const sizes = imageSizesByPlatform[p];
    if (sizes?.length) setImageSize(sizes[0].value);
  };

  const getEffectiveCopyLength = () => {
    if (copyLength === "custom") {
      return { value: "custom", label: "Personalizado", desc: `~${customCopyChars} caracteres` };
    }
    return copyLengths.find(c => c.value === copyLength) || copyLengths[1];
  };

  const getImageSizeInfo = () => {
    if (imageSize === "custom") {
      return { label: "Personalizado", value: "custom", w: customW, h: customH };
    }
    const sizes = imageSizesByPlatform[platform] || [];
    return sizes.find(s => s.value === imageSize) || sizes[0];
  };

  const handleGenerate = async () => {
    if (!mainPrompt.trim()) {
      toast.error("Describe tu campaña o idea");
      return;
    }

    setGenerating(true);
    setPieces(Array.from({ length: count }, (_, i) => ({
      id: i + 1, instruction: mainPrompt, imagePrompt: "", copy: null, imageUrl: null, status: "generating",
    })));

    const selectedStrategy = magicMode && magicFormula
      ? magicFormula
      : strategies.find(s => s.id === selectedStrategyId);
    const lengthInfo = getEffectiveCopyLength();
    const sizeInfo = getImageSizeInfo();
    const imgTpl = imagePromptTemplate?.template || "";
    const copyTpl = copyPromptTemplate?.template || "";

    // If imageFromCopy, generate copy first then image based on copy
    if (imageFromCopy) {
      const results: GeneratedPiece[] = [];
      for (let i = 0; i < count; i++) {
        const piece = await generateVariationWithCopyBasedImage(
          mainPrompt, i + 1, count, tone, platform, lengthInfo, sizeInfo, selectedStrategy, extraNotes, imgTpl, copyTpl, imageModel
        ).catch(err => {
          console.error(`Variación ${i + 1} falló:`, err);
          toast.error(`Error generando variación #${i + 1}`);
          return { id: i + 1, instruction: mainPrompt, imagePrompt: "", copy: null, imageUrl: null, status: "done" as const };
        });
        results.push(piece);
      }
      setPieces(results);
    } else {
      const results = await Promise.allSettled(
        Array.from({ length: count }, (_, i) =>
          generateVariation(mainPrompt, i + 1, count, tone, platform, lengthInfo, sizeInfo, selectedStrategy, extraNotes, imgTpl, copyTpl, imageModel)
        )
      );
      setPieces(results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        console.error(`Variación ${i + 1} falló:`, r.reason);
        toast.error(`Error generando variación #${i + 1}`);
        return { id: i + 1, instruction: mainPrompt, imagePrompt: "", copy: null, imageUrl: null, status: "done" as const };
      }));
    }

    setGenerating(false);
  };

  const handleCopyChange = (id: number, copy: string) => {
    setPieces(prev => prev.map(p => (p.id === id ? { ...p, copy } : p)));
  };

  const handleRegenerateImage = async (id: number, customPrompt?: string) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece) return;
    setRegeneratingId(id);
    const sizeInfo = getImageSizeInfo();
    const selectedStrategy = magicMode && magicFormula
      ? magicFormula
      : strategies.find(s => s.id === selectedStrategyId);

    const imgTpl = imagePromptTemplate?.template || "";
    let prompt: string;
    if (customPrompt) {
      prompt = buildImagePrompt(customPrompt, piece.id, pieces.length, sizeInfo, selectedStrategy, imgTpl);
    } else if (imageFromCopy && piece.copy) {
      prompt = buildCopyBasedImagePrompt(piece.copy, piece.id, pieces.length, sizeInfo, selectedStrategy, imgTpl);
    } else {
      prompt = buildImagePrompt(
        `${piece.instruction}. Crear una imagen completamente distinta a las anteriores, con otro estilo, composición y enfoque visual.`,
        piece.id, pieces.length, sizeInfo, selectedStrategy, imgTpl,
      );
    }
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone, platform, type: "image", width: sizeInfo?.w, height: sizeInfo?.h, imageModel },
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
    const selectedStrategy = magicMode && magicFormula
      ? magicFormula
      : strategies.find(s => s.id === selectedStrategyId);
    const lengthInfo = getEffectiveCopyLength();
    try {
      const copyTpl = copyPromptTemplate?.template || "";
      const variationPrompt = buildCopyPrompt(
        piece.instruction, piece.id, pieces.length, lengthInfo, selectedStrategy, extraNotes, copyTpl,
      ) + `\n\nIMPORTANTE: Genera un copy COMPLETAMENTE NUEVO y DIFERENTE al anterior. Usa un enfoque, ángulo o estilo de escritura distinto. Sé creativo y original.`;
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
  const currentSizes = imageSizesByPlatform[platform] || [];

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

      {/* ✨ Hacer Magia checkbox + Abra cadabra */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="magic-mode"
            checked={magicMode}
            onCheckedChange={(checked) => handleMagicToggle(checked === true)}
          />
          <label htmlFor="magic-mode" className="flex items-center gap-1.5 text-sm font-medium cursor-pointer text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            ✨ Hacer magia
          </label>
        </div>
        {magicMode && (
          <Button variant="outline" onClick={hacerMagia} className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <RefreshCw className="w-4 h-4" />
            Abra cadabra
          </Button>
        )}
        <p className="text-xs text-muted-foreground ml-1">Genera una estrategia aleatoria del Psycho-Matrix ✨</p>
      </div>

      {/* Strategy selector (only when NOT magic) */}
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

      {/* Extra notes (only when NOT magic) */}
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

      {/* Count + Tone + Platform + Image Size + Copy Length */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Variaciones</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCount(count - 1)} disabled={count <= 1}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{count}</span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCount(count + 1)} disabled={count >= MAX_PIECES}>
              <Plus className="w-4 h-4" />
            </Button>
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
          <Label className="text-sm font-medium">Plataforma</Label>
          <Select value={platform} onValueChange={handlePlatformChange}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Tamaño imagen</Label>
          <Select value={imageSize} onValueChange={setImageSize}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {currentSizes.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label} <span className="text-muted-foreground ml-1">({s.w}×{s.h})</span>
                </SelectItem>
              ))}
              <SelectItem value="custom">📐 Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {imageSize === "custom" && (
          <div className="lg:col-span-2 flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ancho (px)</Label>
              <Input type="number" min={200} max={4096} value={customW} onChange={e => setCustomW(Number(e.target.value))} className="w-28" />
            </div>
            <span className="pb-2 text-muted-foreground font-bold">×</span>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Alto (px)</Label>
              <Input type="number" min={200} max={4096} value={customH} onChange={e => setCustomH(Number(e.target.value))} className="w-28" />
            </div>
          </div>
        )}

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

        {copyLength === "custom" && (
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Caracteres</Label>
              <Input type="number" min={20} max={5000} value={customCopyChars} onChange={e => setCustomCopyChars(Number(e.target.value))} className="w-28" />
            </div>
          </div>
        )}
      </div>

      {/* Image model selector */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <Label className="text-sm font-medium">Modelo de generación de imagen</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setImageModel("flash")}
            className={`p-3 rounded-lg border text-left transition-all ${imageModel === "flash" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">⚡ Flash</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">Económico</span>
            </div>
            <p className="text-xs text-muted-foreground">Rápido y barato. Genera imágenes cuadradas (~1024px). Al descargar puedes elegir dimensiones exactas o cuadrada.</p>
          </button>
          <button
            type="button"
            onClick={() => setImageModel("pro")}
            className={`p-3 rounded-lg border text-left transition-all ${imageModel === "pro" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">🎨 Pro</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Mayor costo</span>
            </div>
            <p className="text-xs text-muted-foreground">Mayor calidad. Genera imágenes en las proporciones nativas solicitadas. Más lento y consume más tokens.</p>
          </button>
        </div>
      </div>

      {/* Image from copy checkbox */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
        <Checkbox
          id="image-from-copy"
          checked={imageFromCopy}
          onCheckedChange={(checked) => setImageFromCopy(checked === true)}
        />
        <label htmlFor="image-from-copy" className="text-sm cursor-pointer text-foreground">
          Generar imagen basada en el copy generado
        </label>
        <span className="text-xs text-muted-foreground ml-1">
          (la imagen se creará a partir del texto generado)
        </span>
      </div>

      {/* Magic mode summary */}
      {magicMode && magicFormula && (
        <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 border border-border space-y-1">
          <p><span className="font-medium text-foreground">🎲 Fórmula mágica:</span></p>
          <p>Tono: <strong>{tone}</strong></p>
          <p>Arquetipo: <strong>{magicFormula.archetype}</strong> · Voz: <strong>{magicFormula.brand_voice}</strong></p>
          <p>Disparador: <strong>{magicFormula.persuasion_trigger}</strong> · Generación: <strong>{magicFormula.generation}</strong>
            {magicFormula.advanced_tech && <> · Técnica: <strong>{magicFormula.advanced_tech}</strong></>}
          </p>
        </div>
      )}

      {/* Admin-only prompt template editor */}
      {isSuperAdmin && <PromptTemplateEditor />}

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
          {pieces.map(piece => {
            const sizeInfo = getImageSizeInfo();
            return (
              <AIGeneratedPiece
                key={piece.id}
                piece={piece}
                onCopyChange={handleCopyChange}
                onRegenerateImage={handleRegenerateImage}
                onRegenerateCopy={handleRegenerateCopy}
                onApprove={handleApprove}
                regeneratingImage={regeneratingId === piece.id}
                regeneratingCopy={regeneratingCopyId === piece.id}
                platform={platform}
                sizeLabel={sizeInfo?.label}
                sizeW={sizeInfo?.w}
                sizeH={sizeInfo?.h}
                imageModel={imageModel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContentAIGenerator;

// ── Helpers ──

function buildStrategyContextForCopy(strategy: any): string {
  if (!strategy) return "";
  return `\n\nESTRATEGIA DE MARKETING (Psycho-Matrix):
- Arquetipo: ${strategy.archetype}
- Voz de marca: ${strategy.brand_voice}
- Gatillo de persuasión: ${strategy.persuasion_trigger}
- Generación objetivo: ${strategy.generation}
${strategy.advanced_tech ? `- Técnica avanzada: ${strategy.advanced_tech}` : ""}
${(strategy as any).generated_prompt ? `- Prompt estratégico: ${(strategy as any).generated_prompt}` : ""}
Aplica esta estrategia al copy generado.`;
}

function buildStrategyContextForImage(strategy: any): string {
  if (!strategy) return "";
  return `\n\nDIRECCIÓN VISUAL BASADA EN ESTRATEGIA (NO escribir estos términos como texto en la imagen):
- Estilo visual inspirado en arquetipo "${strategy.archetype}": adapta colores, iluminación y mood
- Voz visual "${strategy.brand_voice}": refleja este tono en la estética, fotografía y composición
- Emoción del gatillo "${strategy.persuasion_trigger}": transmite esta emoción visualmente (expresiones, colores, escenas)
- Generación "${strategy.generation}": adapta el estilo gráfico a las preferencias visuales de esta audiencia
${strategy.advanced_tech ? `- Técnica visual "${strategy.advanced_tech}": aplica este concepto en la dirección artística` : ""}
IMPORTANTE: Estos elementos son SOLO para dirección artística y composición visual. NUNCA escribas nombres de arquetipos, técnicas psicológicas o gatillos como texto visible en la imagen.`;
}

function buildCopyPrompt(
  mainPrompt: string, variationNum: number, totalVariations: number,
  lengthInfo: { value: string; label: string; desc: string },
  strategy?: any, extraNotes?: string, adminTemplate?: string,
): string {
  const strategyContext = buildStrategyContextForCopy(strategy);
  const lengthInstruction = `\nLONGITUD DEL COPY: Genera un copy ${lengthInfo.label.toUpperCase()} (${lengthInfo.desc}). Respeta estrictamente este límite de caracteres.`;
  const extraContext = extraNotes?.trim() ? `\nNOTAS ADICIONALES DEL USUARIO: ${extraNotes}` : "";
  const baseTemplate = adminTemplate?.trim() ? `${adminTemplate}\n\n` : "";

  return `${baseTemplate}${mainPrompt}${strategyContext}${lengthInstruction}${extraContext}

IMPORTANTE: Esta es la variación #${variationNum} de ${totalVariations} variaciones totales. 
Genera un copy COMPLETAMENTE DIFERENTE a las demás variaciones. Usa un enfoque, ángulo o público objetivo distinto.
- Variación 1: enfoque emocional/sentimental
- Variación 2: enfoque de oferta/urgencia  
- Variación 3: enfoque educativo/informativo
- Variación 4: enfoque testimonial/social proof
Usa el enfoque correspondiente a tu número de variación.`;
}

function buildImagePrompt(
  text: string, variationNum: number, totalVariations: number,
  sizeInfo?: { label: string; w: number; h: number },
  strategy?: any, adminTemplate?: string,
): string {
  const sizeHint = sizeInfo ? `\nDIMENSIONES OBLIGATORIAS: ${sizeInfo.w}x${sizeInfo.h}px (${sizeInfo.label}). Diseña la composición para este formato exacto.` : "";
  const strategyHint = buildStrategyContextForImage(strategy);
  const baseTemplate = adminTemplate?.trim() ? `${adminTemplate}\n\n` : "";

  return `${baseTemplate}Eres un diseñador gráfico profesional, director de arte senior y experto en neuromarketing visual. Crea una imagen publicitaria de alto impacto para redes sociales.

BRIEFING CREATIVO:
"${text}"

REGLAS DE TEXTO EN LA IMAGEN (CRÍTICO):
1. Analiza el briefing y genera texto para la imagen que incluya SOLAMENTE:
   - Un título/gancho principal de MÁXIMO 6-8 palabras que sea vendedor y persuasivo
   - Un CTA principal claro y directo (ej: "Reserva hoy", "50% OFF", "Última oportunidad")
   - Opcionalmente un dato numérico impactante si el briefing lo sugiere
2. El texto DEBE estar correctamente renderizado: ortografía perfecta, palabras completas, sin cortes ni errores tipográficos
3. NUNCA incluir párrafos largos, descripciones extensas, ni términos técnicos de marketing
4. NUNCA escribir nombres de arquetipos, técnicas psicológicas, gatillos de persuasión o estrategias como texto visible

COMPOSICIÓN TIPOGRÁFICA:
- Título principal: tipografía grande, bold, con alto contraste sobre el fondo. Debe leerse a primera vista
- CTA: destacado visualmente como botón, banner, badge o cinta. Debe invitar a la acción
- Jerarquía tipográfica clara: título > CTA > dato secundario
- Asegurar legibilidad total en cualquier dispositivo móvil

DISEÑO VISUAL PROFESIONAL:
- Paleta de colores coherente, armónica y atractiva para la industria
- Imágenes, fotografías o ilustraciones de alta calidad relevantes al contenido
- Composición que detenga el scroll: impactante desde el primer segundo
- Jerarquía visual: imagen/fondo de impacto > título > CTA
- Uso inteligente de espacio negativo para que el texto respire
- Iluminación y mood profesional acorde al mensaje
${sizeHint}${strategyHint}

Variación visual #${variationNum} de ${totalVariations}: Crear una imagen con estilo, composición, paleta de colores y enfoque visual COMPLETAMENTE DIFERENTE a las otras variaciones. Cada variación debe sentirse como una pieza única de una campaña diversa.`;
}

async function generateVariation(
  mainPrompt: string, variationNum: number, totalVariations: number,
  tone: string, platform: string,
  lengthInfo: { value: string; label: string; desc: string },
  sizeInfo: { label: string; w: number; h: number },
  strategy?: any, extraNotes?: string,
  imgTpl?: string, copyTpl?: string, imageModel?: string,
): Promise<GeneratedPiece> {
  const variationPrompt = buildCopyPrompt(mainPrompt, variationNum, totalVariations, lengthInfo, strategy, extraNotes, copyTpl);
  const imagePrompt = buildImagePrompt(mainPrompt, variationNum, totalVariations, sizeInfo, strategy, imgTpl);

  const [copyResult, imgResult] = await Promise.allSettled([
    supabase.functions.invoke("ai-generate-content", { body: { prompt: variationPrompt, tone, platform, type: "copy" } }),
    supabase.functions.invoke("ai-generate-content", { body: { prompt: imagePrompt, tone, platform, type: "image", width: sizeInfo.w, height: sizeInfo.h, imageModel } }),
  ]);

  const copy = copyResult.status === "fulfilled" && !copyResult.value.error ? copyResult.value.data?.content || "" : null;
  const imageUrl = imgResult.status === "fulfilled" && !imgResult.value.error ? imgResult.value.data?.imageUrl || null : null;

  return { id: variationNum, instruction: mainPrompt, imagePrompt, copy, imageUrl, status: "done" };
}

async function generateVariationWithCopyBasedImage(
  mainPrompt: string, variationNum: number, totalVariations: number,
  tone: string, platform: string,
  lengthInfo: { value: string; label: string; desc: string },
  sizeInfo: { label: string; w: number; h: number },
  strategy?: any, extraNotes?: string,
  imgTpl?: string, copyTpl?: string, imageModel?: string,
): Promise<GeneratedPiece> {
  const variationPrompt = buildCopyPrompt(mainPrompt, variationNum, totalVariations, lengthInfo, strategy, extraNotes, copyTpl);

  const { data: copyData, error: copyError } = await supabase.functions.invoke("ai-generate-content", {
    body: { prompt: variationPrompt, tone, platform, type: "copy" },
  });
  const copy = !copyError ? copyData?.content || "" : null;

  const imagePrompt = buildCopyBasedImagePrompt(copy || mainPrompt, variationNum, totalVariations, sizeInfo, strategy, imgTpl);

  const { data: imgData, error: imgError } = await supabase.functions.invoke("ai-generate-content", {
    body: { prompt: imagePrompt, tone, platform, type: "image", width: sizeInfo.w, height: sizeInfo.h, imageModel },
  });
  const imageUrl = !imgError ? imgData?.imageUrl || null : null;

  return { id: variationNum, instruction: mainPrompt, imagePrompt, copy, imageUrl, status: "done" };
}

function buildCopyBasedImagePrompt(
  copyText: string, variationNum: number, totalVariations: number,
  sizeInfo?: { label: string; w: number; h: number },
  strategy?: any, adminTemplate?: string,
): string {
  const sizeHint = sizeInfo
    ? `\nDIMENSIONES OBLIGATORIAS: ${sizeInfo.w}x${sizeInfo.h}px (${sizeInfo.label}). Diseña la composición específicamente para este formato.`
    : "";
  const strategyHint = buildStrategyContextForImage(strategy);
  const baseTemplate = adminTemplate?.trim() ? `${adminTemplate}\n\n` : "";

  return `${baseTemplate}Eres un diseñador gráfico profesional y director de arte senior. A partir del siguiente copy de marketing, crea una imagen publicitaria profesional.

COPY DE REFERENCIA:
"${copyText}"

REGLAS DE TEXTO EN LA IMAGEN (CRÍTICO):
1. Analiza el copy y extrae SOLAMENTE:
   - El título/gancho principal (máximo 6-8 palabras más impactantes)
   - El CTA principal (ej: "Reserva ahora", "50% OFF")
   - Un dato numérico clave si existe
2. NUNCA incluir el copy completo, párrafos largos, ni términos de estrategia/marketing
3. NUNCA escribir nombres de arquetipos, técnicas psicológicas o gatillos como texto

COMPOSICIÓN TIPOGRÁFICA:
- Título: tipografía grande, bold, alto contraste
- CTA: destacado como botón, banner o badge
- Legibilidad total garantizada

DISEÑO VISUAL:
- Paleta coherente y atractiva
- Imágenes/ilustraciones relevantes al contenido
- Visualmente impactante (detener el scroll)
- Jerarquía: imagen de fondo > título > CTA
${sizeHint}${strategyHint}

Variación visual #${variationNum} de ${totalVariations}: Usa estilo, composición y paleta COMPLETAMENTE DIFERENTE.`;
}
