import { useState, useCallback, useRef } from "react";
import { Video, Loader2, Plus, Minus, Sparkles, RefreshCw, Mic, MicOff, Copy, Check, Wand2, Save, Upload } from "lucide-react";
import type { ContentPost } from "@/hooks/useContentPosts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePsychoStrategies } from "@/hooks/usePsychoMatrix";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useClinic } from "@/hooks/useClinic";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada,
} from "@/lib/psychoMatrixData";

const tones = ["Profesional", "Casual", "Inspirador", "Educativo", "Humorístico", "Urgente", "Emotivo"];

const videoPlatforms = [
  { value: "Instagram Reels", label: "Instagram Reels", ratio: "9:16", duration: "15-90s" },
  { value: "TikTok", label: "TikTok", ratio: "9:16", duration: "15-60s" },
  { value: "YouTube Shorts", label: "YouTube Shorts", ratio: "9:16", duration: "hasta 60s" },
  { value: "Facebook Reels", label: "Facebook Reels", ratio: "9:16", duration: "15-90s" },
  { value: "YouTube", label: "YouTube (landscape)", ratio: "16:9", duration: "variable" },
  { value: "General", label: "General / Otro", ratio: "variable", duration: "variable" },
];

const videoDurations = [
  { value: "5", label: "5 segundos", desc: "Ultra corto — impacto rápido" },
  { value: "15", label: "15 segundos", desc: "Story / Ad corto" },
  { value: "30", label: "30 segundos", desc: "Reel / TikTok estándar" },
  { value: "60", label: "60 segundos", desc: "Reel / Short completo" },
  { value: "custom", label: "Personalizado", desc: "Define la duración" },
];

const videoStyles = [
  { value: "cinematic", label: "🎬 Cinemático", desc: "Tomas lentas, iluminación dramática, profundidad de campo" },
  { value: "dynamic", label: "⚡ Dinámico", desc: "Cortes rápidos, transiciones energéticas, ritmo alto" },
  { value: "minimal", label: "✨ Minimalista", desc: "Fondos limpios, movimientos suaves, elegancia" },
  { value: "organic", label: "🌿 Orgánico / Natural", desc: "Luz natural, texturas reales, sensación auténtica" },
  { value: "3d-motion", label: "🔮 3D / Motion Graphics", desc: "Elementos 3D, animaciones fluidas, futurista" },
  { value: "storytelling", label: "📖 Narrativo", desc: "Secuencia de escenas que cuentan una historia" },
];

const videoTools = [
  { value: "veo3", label: "Google Veo 3" },
  { value: "sora", label: "OpenAI Sora" },
  { value: "runway", label: "Runway Gen-3" },
  { value: "kling", label: "Kling AI" },
  { value: "pika", label: "Pika Labs" },
  { value: "generic", label: "Genérico (cualquier herramienta)" },
];

interface GeneratedVideoPrompt {
  id: number;
  prompt: string;
  status: "generating" | "done";
  savedPostId?: string;
}

interface Props {
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
    updatePost: (id: string, data: Partial<ContentPost>) => Promise<boolean>;
  };
}

const VideoPromptGenerator = ({ content }: Props) => {
  const [mainPrompt, setMainPrompt] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [videoPlatform, setVideoPlatform] = useState("Instagram Reels");
  const [duration, setDuration] = useState("30");
  const [customDuration, setCustomDuration] = useState(45);
  const [videoStyle, setVideoStyle] = useState("cinematic");
  const [videoTool, setVideoTool] = useState("generic");
  const [count, setCount] = useState(2);
  const [extraNotes, setExtraNotes] = useState("");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("none");
  const [magicMode, setMagicMode] = useState(false);
  const [magicFormula, setMagicFormula] = useState<{
    archetype: string; brand_voice: string; persuasion_trigger: string; generation: string; advanced_tech: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedVideoPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [uploadingIds, setUploadingIds] = useState<Set<number>>(new Set());
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: strategies = [] } = usePsychoStrategies();
  const { isSuperAdmin } = useClinic();

  const handleVoiceResult = useCallback((transcript: string) => {
    setMainPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
  }, []);
  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({ onResult: handleVoiceResult });

  const maxPieces = isSuperAdmin ? 10 : 4;
  const updateCount = (n: number) => setCount(Math.max(1, Math.min(maxPieces, n)));

  const randomPick = <T extends { label: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].label;

  const hacerMagia = () => {
    setTone(tones[Math.floor(Math.random() * tones.length)]);
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

  const getEffectiveDuration = () => duration === "custom" ? `${customDuration} segundos` : `${duration} segundos`;
  const platformInfo = videoPlatforms.find(p => p.value === videoPlatform) || videoPlatforms[0];
  const styleInfo = videoStyles.find(s => s.value === videoStyle);

  const buildVideoPrompt = (variationNum: number, totalVariations: number): string => {
    const strategy = magicMode && magicFormula
      ? magicFormula
      : strategies.find(s => s.id === selectedStrategyId);

    const toolInfo = videoTools.find(t => t.value === videoTool);
    const toolSpecific = videoTool !== "generic"
      ? `\n\nOPTIMIZADO PARA: ${toolInfo?.label}. Usa la terminología y estructura de prompts que mejor funciona con esta herramienta.`
      : "";

    let strategyBlock = "";
    if (strategy) {
      strategyBlock = `\n\nESTRATEGIA PSYCHO-MATRIX APLICADA:
- Arquetipo: ${strategy.archetype} → Define el mood visual, la paleta emocional y el tipo de personajes/escenarios
- Voz de marca: ${strategy.brand_voice} → Determina el ritmo de edición, la música y el estilo narrativo
- Gatillo de persuasión: ${strategy.persuasion_trigger} → La emoción central que cada escena debe evocar
- Generación objetivo: ${strategy.generation} → Adapta la estética, referencias culturales y códigos visuales
${strategy.advanced_tech ? `- Técnica avanzada: ${strategy.advanced_tech} → Aplica este principio psicológico en la secuencia visual` : ""}`;
    }

    const extraBlock = extraNotes?.trim() ? `\n\nINSTRUCCIONES ADICIONALES: ${extraNotes}` : "";

    const variationAngles = [
      "ENFOQUE EMOCIONAL: Prioriza conexión sentimental, caras expresivas, música emotiva, ritmo pausado en momentos clave",
      "ENFOQUE DE IMPACTO: Cortes rápidos, datos impactantes, urgencia visual, CTA agresivo, ritmo acelerado",
      "ENFOQUE NARRATIVO: Cuenta una mini-historia con inicio, nudo y desenlace en el tiempo disponible",
      "ENFOQUE ESTÉTICO: Prioriza la belleza visual, composiciones artísticas, colores vibrantes, slow motion",
      "ENFOQUE TESTIMONIAL: Simula un antes/después o una experiencia de cliente, perspectiva en primera persona",
    ];
    const angleIdx = (variationNum - 1) % variationAngles.length;

    return `Genera un prompt DETALLADO y PROFESIONAL para crear un video publicitario con IA generativa.

BRIEFING CREATIVO:
"${mainPrompt}"

ESPECIFICACIONES TÉCNICAS:
- Plataforma: ${videoPlatform} (${platformInfo.ratio})
- Duración: ${getEffectiveDuration()}
- Estilo visual: ${styleInfo?.label} — ${styleInfo?.desc}
- Tono: ${tone}
${strategyBlock}${extraBlock}${toolSpecific}

ESTRUCTURA DEL PROMPT DE VIDEO QUE DEBES GENERAR:

1. **ESCENA INICIAL (Hook — primeros 2-3 segundos):** Describe con detalle visual extremo la primera toma que debe capturar atención inmediatamente. Incluye: ángulo de cámara, iluminación, sujeto/objeto principal, movimiento de cámara, colores dominantes.

2. **SECUENCIA PRINCIPAL:** Describe cada escena o toma importante con transiciones específicas entre ellas. Para cada escena incluye:
   - Descripción visual detallada (qué se ve)
   - Movimiento de cámara (pan, tilt, zoom, tracking, drone, steadicam)
   - Iluminación y atmósfera
   - Transición a la siguiente escena (corte, fade, morph, zoom through, etc.)

3. **CIERRE / CTA (últimos 2-3 segundos):** Toma final con el mensaje de cierre o llamada a la acción visual.

4. **DIRECCIÓN DE ARTE:** Paleta de colores específica (hex si es posible), referencias de mood, textura visual (grain, clean, warm, cold).

5. **AUDIO / MÚSICA:** Tipo de música o sonido recomendado (género, BPM, mood), momentos de silencio o énfasis sonoro.

6. **TEXTO EN PANTALLA (si aplica):** Textos overlay con timing exacto (ej: "a los 3s aparece: 'Transforma tu sonrisa'").

VARIACIÓN #${variationNum} de ${totalVariations}: ${variationAngles[angleIdx]}

REGLAS:
- El prompt debe estar LISTO PARA COPIAR Y PEGAR en ${toolInfo?.label || "una herramienta de generación de video con IA"}
- Escribe el prompt en ESPAÑOL
- Sé extremadamente descriptivo y visual — cada detalle importa para la IA generativa
- NO incluyas explicaciones ni meta-comentarios, SOLO el prompt de video listo para usar
- Incluye indicaciones de timing (ej: "0:00-0:03", "0:03-0:08")`;
  };

  const handleGenerate = async () => {
    if (!mainPrompt.trim()) {
      toast.error("Describe tu campaña o idea para el video");
      return;
    }

    setGenerating(true);
    setPrompts(Array.from({ length: count }, (_, i) => ({ id: i + 1, prompt: "", status: "generating" })));

    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => {
        const prompt = buildVideoPrompt(i + 1, count);
        return supabase.functions.invoke("ai-generate-content", {
          body: { prompt, tone, platform: videoPlatform, type: "copy" },
        });
      })
    );

    setPrompts(results.map((r, i) => {
      if (r.status === "fulfilled" && !r.value.error) {
        return { id: i + 1, prompt: r.value.data?.content || "Error al generar", status: "done" as const };
      }
      console.error(`Video prompt ${i + 1} failed:`, r);
      toast.error(`Error generando prompt #${i + 1}`);
      return { id: i + 1, prompt: "Error al generar el prompt", status: "done" as const };
    }));

    setGenerating(false);
  };

  const handleCopy = async (id: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Prompt copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (id: number) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: "generating" as const } : p));
    const prompt = buildVideoPrompt(id, prompts.length);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt: prompt + "\n\nIMPORTANTE: Genera un prompt COMPLETAMENTE NUEVO y DIFERENTE al anterior.", tone, platform: videoPlatform, type: "copy" },
      });
      if (error) throw error;
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, prompt: data?.content || p.prompt, status: "done" as const } : p));
    } catch (err) {
      console.error(err);
      toast.error("Error regenerando prompt");
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, status: "done" as const } : p));
    }
  };

  const handleSaveAsDraft = async (id: number) => {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;
    setSavingIds(prev => new Set(prev).add(id));
    try {
      // Generate a social media copy for the video post
      let generatedCopy = "";
      try {
        const copyPrompt = `Genera un copy profesional para publicar un video en redes sociales.

CONTEXTO DEL VIDEO: "${mainPrompt}"
PLATAFORMA: ${videoPlatform}
TONO: ${tone}

REGLAS:
- Escribe SOLO el copy listo para publicar (sin explicaciones)
- Incluye emojis relevantes
- Incluye hashtags al final
- Máximo 2200 caracteres
- Incluye un call-to-action sutil
- El copy debe complementar el video, NO describir lo que se ve`;

        const { data: copyData, error: copyError } = await supabase.functions.invoke("ai-generate-content", {
          body: { prompt: copyPrompt, tone, platform: videoPlatform, type: "copy" },
        });
        if (!copyError && copyData?.content) {
          generatedCopy = copyData.content;
        }
      } catch (copyErr) {
        console.error("Error generating copy for video draft:", copyErr);
      }

      const platformLower = videoPlatform.toLowerCase().replace(/\s+/g, "-");
      const result = await content.createPost({
        title: mainPrompt.slice(0, 60) || "Video IA",
        body: generatedCopy || `📹 Video: ${mainPrompt}`,
        status: "draft",
        ai_generated: true,
        ai_prompt: prompt.prompt,
        platforms: [platformLower],
        media_type: "video",
        media_urls: [],
      });
      if (result) {
        setPrompts(prev => prev.map(p => p.id === id ? { ...p, savedPostId: result.id } : p));
        toast.success("Borrador guardado con copy y prompt de video");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error guardando borrador");
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleUploadVideo = async (promptId: number, postId: string, file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("El video no puede superar los 100MB");
      return;
    }
    setUploadingIds(prev => new Set(prev).add(promptId));
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("content-media")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("content-media").getPublicUrl(fileName);
      await content.updatePost(postId, { media_urls: [urlData.publicUrl] });
      toast.success("Video subido y vinculado al borrador");
    } catch (err) {
      console.error(err);
      toast.error("Error subiendo video");
    } finally {
      setUploadingIds(prev => { const n = new Set(prev); n.delete(promptId); return n; });
    }
  };

  const allDone = prompts.length > 0 && prompts.every(p => p.status === "done");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Generador de Prompts de Video
        </h2>
        <p className="text-sm text-muted-foreground">
          Genera prompts profesionales optimizados para herramientas de video con IA (Veo 3, Sora, Runway, etc.).
          Copia el prompt y pégalo directamente en tu herramienta favorita.
        </p>
      </div>

      {/* Main prompt */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">¿Qué quieres mostrar en el video?</Label>
        <div className="relative">
          <Textarea
            placeholder="Ej: Video promocional para blanqueamiento dental, mostrar el proceso y resultados antes/después, dirigido a mujeres jóvenes que buscan mejorar su sonrisa..."
            className="min-h-[120px] pr-12"
            value={mainPrompt}
            onChange={e => setMainPrompt(e.target.value)}
          />
          {voiceSupported && (
            <Button
              type="button"
              variant={isListening ? "default" : "ghost"}
              size="icon"
              className={cn(
                "absolute top-2 right-2 h-8 w-8 rounded-full transition-all",
                isListening && "bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse"
              )}
              onClick={toggleListening}
              title={isListening ? "Detener grabación" : "Dictar con voz"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
        </div>
        {isListening && (
          <p className="text-xs text-destructive font-medium animate-pulse">🎙️ Escuchando… habla y tu texto aparecerá aquí</p>
        )}
      </div>

      {/* Magic mode */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="magic-mode-video"
              checked={magicMode}
              onCheckedChange={(checked) => handleMagicToggle(checked === true)}
            />
            <label htmlFor="magic-mode-video" className="flex items-center gap-1.5 text-sm font-medium cursor-pointer text-foreground">
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

        {magicMode && magicFormula && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            {[
              { label: "Arquetipo", value: magicFormula.archetype },
              { label: "Voz", value: magicFormula.brand_voice },
              { label: "Gatillo", value: magicFormula.persuasion_trigger },
              { label: "Generación", value: magicFormula.generation },
              ...(magicFormula.advanced_tech ? [{ label: "Psico Avanzada", value: magicFormula.advanced_tech }] : []),
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-xs font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strategy selector */}
      {!magicMode && (
        <div className="space-y-2">
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
          </div>

          {selectedStrategyId !== "none" && (() => {
            const strat = strategies.find(s => s.id === selectedStrategyId);
            if (!strat) return null;
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                {[
                  { label: "Arquetipo", value: strat.archetype },
                  { label: "Voz", value: strat.brand_voice },
                  { label: "Gatillo", value: strat.persuasion_trigger },
                  { label: "Generación", value: strat.generation },
                  ...(strat.advanced_tech ? [{ label: "Psico Avanzada", value: strat.advanced_tech }] : []),
                ].map(item => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-xs font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Extra notes */}
      {!magicMode && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Notas adicionales (opcional)</Label>
          <Textarea
            placeholder="Detalles extra: tipo de música, colores específicos, referencias visuales, público objetivo..."
            className="min-h-[60px]"
            value={extraNotes}
            onChange={e => setExtraNotes(e.target.value)}
          />
        </div>
      )}

      {/* Configuration grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Variaciones</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCount(count - 1)} disabled={count <= 1}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{count}</span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCount(count + 1)} disabled={count >= maxPieces}>
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
          <Select value={videoPlatform} onValueChange={setVideoPlatform}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {videoPlatforms.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label} <span className="text-muted-foreground ml-1">({p.ratio})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Duración</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {videoDurations.map(d => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label} <span className="text-muted-foreground ml-1">({d.desc})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {duration === "custom" && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Segundos</Label>
            <input
              type="number"
              min={3}
              max={300}
              value={customDuration}
              onChange={e => setCustomDuration(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Video style + tool */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Estilo visual del video</Label>
          <div className="grid grid-cols-2 gap-2">
            {videoStyles.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setVideoStyle(s.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  videoStyle === s.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Optimizar prompt para</Label>
          <div className="grid grid-cols-2 gap-2">
            {videoTools.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setVideoTool(t.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  videoTool === t.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                <p className="text-sm font-semibold">{t.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Magic summary */}
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

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !mainPrompt.trim()}
        className="gradient-primary text-primary-foreground gap-2"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : magicMode ? <Sparkles className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        {generating ? "Generando prompts de video..." : magicMode ? `✨ Hacer magia (${count} prompts)` : `Generar ${count} prompt${count > 1 ? "s" : ""} de video`}
      </Button>

      {/* Generating skeleton */}
      {generating && (
        <div className="grid gap-4 md:grid-cols-1">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4 bg-card animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-4/6" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {allDone && (
        <div className="space-y-4">
          {prompts.map(p => (
            <div key={p.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Prompt de video #{p.id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {platformInfo.label} · {getEffectiveDuration()} · {styleInfo?.label}
                  </span>
                  {p.savedPostId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                      ✓ Guardado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleRegenerate(p.id)}
                    disabled={p.status === "generating"}
                  >
                    {p.status === "generating" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Regenerar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 text-xs gradient-primary text-primary-foreground"
                    onClick={() => handleCopy(p.id, p.prompt)}
                  >
                    {copiedId === p.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === p.id ? "¡Copiado!" : "Copiar prompt"}
                  </Button>
                  {!p.savedPostId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleSaveAsDraft(p.id)}
                      disabled={savingIds.has(p.id)}
                    >
                      {savingIds.has(p.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Guardar borrador
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => fileInputRefs.current[p.id]?.click()}
                      disabled={uploadingIds.has(p.id)}
                    >
                      {uploadingIds.has(p.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Subir video
                    </Button>
                  )}
                  <input
                    ref={el => { fileInputRefs.current[p.id] = el; }}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file && p.savedPostId) handleUploadVideo(p.id, p.savedPostId, file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="p-4">
                <Textarea
                  value={p.prompt}
                  onChange={e => setPrompts(prev => prev.map(pr => pr.id === p.id ? { ...pr, prompt: e.target.value } : pr))}
                  className="min-h-[200px] text-sm font-mono leading-relaxed border-none shadow-none resize-y bg-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPromptGenerator;
