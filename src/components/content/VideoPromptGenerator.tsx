import { useState, useCallback, useRef } from "react";
import { Video, Loader2, Plus, Minus, Sparkles, RefreshCw, Mic, MicOff, Copy, Check, Wand2, Save, Upload, Settings2, Eye, EyeOff, Zap, Edit3 } from "lucide-react";
import type { ContentPost } from "@/hooks/useContentPosts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePsychoStrategies, usePsychoServices } from "@/hooks/usePsychoMatrix";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useClinic } from "@/hooks/useClinic";
import { useActivePromptTemplate, usePromptTemplates, useSavePromptTemplate } from "@/hooks/usePromptTemplates";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada, canalsPNL,
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

// Expert mode: all video formats with exact resolutions
interface VideoFormat {
  label: string;
  platform: string;
  ratio: string;
  width: number;
  height: number;
  desc: string;
}

const expertVideoFormats: VideoFormat[] = [
  // Instagram
  { label: "IG Reels / Stories", platform: "Instagram", ratio: "9:16", width: 1080, height: 1920, desc: "Vertical full-screen" },
  { label: "IG Feed (cuadrado)", platform: "Instagram", ratio: "1:1", width: 1080, height: 1080, desc: "Post cuadrado" },
  { label: "IG Feed (vertical)", platform: "Instagram", ratio: "4:5", width: 1080, height: 1350, desc: "Post vertical feed" },
  { label: "IG Feed (landscape)", platform: "Instagram", ratio: "1.91:1", width: 1080, height: 566, desc: "Post horizontal" },
  // TikTok
  { label: "TikTok estándar", platform: "TikTok", ratio: "9:16", width: 1080, height: 1920, desc: "Vertical full-screen" },
  { label: "TikTok HD", platform: "TikTok", ratio: "9:16", width: 2160, height: 3840, desc: "4K vertical" },
  // YouTube
  { label: "YouTube Shorts", platform: "YouTube", ratio: "9:16", width: 1080, height: 1920, desc: "Vertical short" },
  { label: "YouTube 1080p", platform: "YouTube", ratio: "16:9", width: 1920, height: 1080, desc: "Full HD landscape" },
  { label: "YouTube 4K", platform: "YouTube", ratio: "16:9", width: 3840, height: 2160, desc: "Ultra HD landscape" },
  { label: "YouTube 1440p", platform: "YouTube", ratio: "16:9", width: 2560, height: 1440, desc: "QHD landscape" },
  // Facebook
  { label: "FB Reels / Stories", platform: "Facebook", ratio: "9:16", width: 1080, height: 1920, desc: "Vertical full-screen" },
  { label: "FB Feed (cuadrado)", platform: "Facebook", ratio: "1:1", width: 1080, height: 1080, desc: "Post cuadrado" },
  { label: "FB Feed (landscape)", platform: "Facebook", ratio: "16:9", width: 1280, height: 720, desc: "Post horizontal" },
  { label: "FB In-stream ad", platform: "Facebook", ratio: "16:9", width: 1920, height: 1080, desc: "Anuncio in-stream" },
  // WhatsApp
  { label: "WhatsApp Status", platform: "WhatsApp", ratio: "9:16", width: 1080, height: 1920, desc: "Estado vertical" },
  // X / Twitter
  { label: "X / Twitter", platform: "X", ratio: "16:9", width: 1920, height: 1080, desc: "Landscape estándar" },
  { label: "X / Twitter (cuadrado)", platform: "X", ratio: "1:1", width: 1080, height: 1080, desc: "Post cuadrado" },
  // LinkedIn
  { label: "LinkedIn video", platform: "LinkedIn", ratio: "1:1", width: 1080, height: 1080, desc: "Cuadrado profesional" },
  { label: "LinkedIn landscape", platform: "LinkedIn", ratio: "16:9", width: 1920, height: 1080, desc: "Landscape profesional" },
  // Pinterest
  { label: "Pinterest Idea Pin", platform: "Pinterest", ratio: "9:16", width: 1080, height: 1920, desc: "Pin vertical" },
  { label: "Pinterest estándar", platform: "Pinterest", ratio: "2:3", width: 1000, height: 1500, desc: "Pin video" },
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
  { value: "veo3", label: "Google Veo 3", promptStyle: "concise" },
  { value: "sora", label: "OpenAI Sora 2", promptStyle: "detailed" },
  { value: "runway", label: "Runway Gen-4", promptStyle: "timeline" },
  { value: "kling", label: "Kling AI 2.6", promptStyle: "structured" },
  { value: "grok", label: "Grok (xAI Aurora)", promptStyle: "detailed" },
  { value: "pika", label: "Pika Labs", promptStyle: "concise" },
  { value: "generic", label: "Genérico (cualquier herramienta)", promptStyle: "detailed" },
];

const defaultVideoTemplate = `Eres un director de video publicitario y experto en IA generativa de video de clase mundial.

ESTRUCTURA DEL SUPER-PROMPT:
Tu prompt debe ser cinematográfico, ultra-detallado y optimizado para la herramienta de IA seleccionada.

REGLAS UNIVERSALES:
- Cada escena debe incluir: sujeto, acción, cámara, iluminación, ambiente, color, transición
- Usa lenguaje cinematográfico técnico (dolly, tracking, rack focus, etc.)
- Incluye timing exacto para cada segmento del video
- El prompt debe estar LISTO PARA COPIAR Y PEGAR directamente
- Escribe en ESPAÑOL con terminología técnica en inglés cuando sea necesario
- NO incluyas meta-comentarios, explicaciones ni instrucciones — SOLO el prompt de video
- Prioriza coherencia visual: paleta de colores consistente, continuidad de iluminación

OPTIMIZACIÓN POR HERRAMIENTA:
- Veo 3/3.1: Prompts concisos (3-5 oraciones por escena). Especifica camera movement. Enfócate en mood/estilo sobre detalles granulares.
- Sora 2: Prompts narrativos largos (5-8 oraciones). Incluye lógica causal y secuencias multi-paso. Excelente para interacciones entre personajes.
- Runway Gen-4: Prompts tipo timeline con beat markers. Instrucciones codificadas en tiempo. Especifica fps y motion style.
- Kling 2.6: Estructura de datos tipo JSON-like. Instrucciones precisas de rendering. Incluye reference images si aplica.

ESTRATEGIA PSICOLÓGICA (cuando se proporciona):
- Usa la estrategia para definir: paleta emocional, ritmo de edición, tipo de música, ángulos de cámara
- El arquetipo define el MOOD VISUAL general
- El gatillo de persuasión define la EMOCIÓN que cada escena debe evocar
- La generación objetivo define la ESTÉTICA y referencias culturales`;

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

// ─── Admin-only Video Prompt Template Editor ───
const VideoPromptTemplateEditor = () => {
  const { data: templates = [], isLoading } = usePromptTemplates();
  const saveTemplate = useSavePromptTemplate();
  const [open, setOpen] = useState(false);

  const videoTemplate = templates.find(t => t.type === "video");
  const [videoText, setVideoText] = useState("");
  const [videoActive, setVideoActive] = useState(true);

  // Sync from DB
  useState(() => {
    setVideoText(videoTemplate?.template || defaultVideoTemplate);
    setVideoActive(videoTemplate?.is_active ?? true);
  });

  // Update when templates load
  if (!isLoading && videoTemplate && videoText === "" ) {
    setVideoText(videoTemplate.template);
    setVideoActive(videoTemplate.is_active);
  }
  if (!isLoading && !videoTemplate && videoText === "") {
    setVideoText(defaultVideoTemplate);
  }

  const handleSave = async () => {
    await saveTemplate.mutateAsync({
      id: videoTemplate?.id,
      type: "video",
      name: "Plantilla de video",
      template: videoText,
      is_active: videoActive,
    });
  };

  if (isLoading) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">🎬 Composición de Prompts de Video (Admin)</span>
          </div>
          {open ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 p-4 rounded-xl border border-border bg-card">
        <p className="text-xs text-muted-foreground">
          Configura la estructura base del super-prompt para generación de video. Este template define las reglas, estructura y optimización
          que se aplican a todos los prompts de video generados para esta clínica.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">🎬 Prompt base para Video</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Activo</span>
              <Switch checked={videoActive} onCheckedChange={setVideoActive} />
            </div>
          </div>
          <Textarea
            value={videoText}
            onChange={e => setVideoText(e.target.value)}
            className="min-h-[250px] text-xs font-mono"
            placeholder="Escribe el prompt base para generación de video..."
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveTemplate.isPending}
            className="gap-2"
          >
            {saveTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Guardar plantilla de video
          </Button>
        </div>

        <div className="text-[10px] text-muted-foreground p-2 rounded bg-muted/50">
          <strong>Variables automáticas:</strong> La estrategia Psycho-Matrix, servicio/producto, tono, plataforma, duración, estilo visual y herramienta
          se inyectan automáticamente al final del template base.
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Main Component ───
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>("none");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("none");
  const [magicMode, setMagicMode] = useState(false);
  const [magicFormula, setMagicFormula] = useState<{
    archetype: string; brand_voice: string; persuasion_trigger: string; generation: string; advanced_tech: string; canal_pnl: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedVideoPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [uploadingIds, setUploadingIds] = useState<Set<number>>(new Set());
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Expert mode state
  const [expertMode, setExpertMode] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1920);
  const [customRatio, setCustomRatio] = useState("9:16");
  const [useCustomFormat, setUseCustomFormat] = useState(false);

  const { data: strategies = [] } = usePsychoStrategies();
  const { data: services = [] } = usePsychoServices();
  const { isSuperAdmin } = useClinic();
  const { data: videoPromptTemplate } = useActivePromptTemplate("video");

  // Filter strategies by selected service
  const filteredStrategies = selectedServiceId !== "none"
    ? strategies.filter(s => s.service_id === selectedServiceId)
    : strategies;

  const handleVoiceResult = useCallback((transcript: string) => {
    setMainPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
  }, []);
  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({ onResult: handleVoiceResult });

  const maxPieces = isSuperAdmin ? 10 : 4;
  const updateCount = (n: number) => setCount(Math.max(1, Math.min(maxPieces, n)));

  const randomPick = <T extends { label: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].label;

  const hacerMagia = () => {
    setTone(tones[Math.floor(Math.random() * tones.length)]);
    const randomVAK = canalsPNL[Math.floor(Math.random() * canalsPNL.length)];
    setMagicFormula({
      archetype: randomPick(arquetiposDigitales),
      brand_voice: randomPick(arquetiposMarca),
      persuasion_trigger: randomPick(disparadoresPersuasion),
      generation: randomPick(codigosGeneracionales),
      advanced_tech: Math.random() > 0.4 ? randomPick(psicologiaAvanzada) : "",
      canal_pnl: randomVAK.label,
    });
    setSelectedStrategyId("none");
    setSelectedServiceId("none");
  };

  const handleMagicToggle = (checked: boolean) => {
    setMagicMode(checked);
    if (checked) hacerMagia();
    else setMagicFormula(null);
  };

  // When service changes, reset strategy if it doesn't belong to the new service
  const handleServiceChange = (svcId: string) => {
    setSelectedServiceId(svcId);
    if (svcId !== "none" && selectedStrategyId !== "none") {
      const strat = strategies.find(s => s.id === selectedStrategyId);
      if (strat && strat.service_id !== svcId) {
        setSelectedStrategyId("none");
      }
    }
  };

  const getEffectiveDuration = () => duration === "custom" ? `${customDuration} segundos` : `${duration} segundos`;
  const platformInfo = videoPlatforms.find(p => p.value === videoPlatform) || videoPlatforms[0];
  const styleInfo = videoStyles.find(s => s.value === videoStyle);
  const toolInfo = videoTools.find(t => t.value === videoTool) || videoTools[videoTools.length - 1];

  // Get effective resolution for prompt injection
  const getEffectiveResolution = () => {
    if (expertMode) {
      if (useCustomFormat) return { width: customWidth, height: customHeight, ratio: customRatio };
      if (selectedFormat) return { width: selectedFormat.width, height: selectedFormat.height, ratio: selectedFormat.ratio };
    }
    // Default resolutions based on platform ratio
    const ratioDefaults: Record<string, { width: number; height: number }> = {
      "9:16": { width: 1080, height: 1920 },
      "16:9": { width: 1920, height: 1080 },
      "1:1": { width: 1080, height: 1080 },
      "4:5": { width: 1080, height: 1350 },
    };
    const def = ratioDefaults[platformInfo.ratio] || { width: 1080, height: 1920 };
    return { ...def, ratio: platformInfo.ratio };
  };

  const buildVideoPrompt = (variationNum: number, totalVariations: number): string => {
    const strategy = magicMode && magicFormula
      ? magicFormula
      : strategies.find(s => s.id === selectedStrategyId);

    const service = services.find(s => s.id === selectedServiceId);

    // Base template from admin config or default
    const baseTemplate = videoPromptTemplate?.template || defaultVideoTemplate;

    // Service/product block
    let serviceBlock = "";
    if (service) {
      serviceBlock = `\n\nPRODUCTO/SERVICIO A PROMOCIONAR:
- Nombre: "${service.name}"
- Beneficio principal: "${service.core_benefit}"
- Dolor que resuelve: "${service.pain_point}"
- Rango de precio: ${service.target_price}`;
    }

    // Strategy block
    let strategyBlock = "";
    if (strategy) {
      // PNL block for video
      let pnlVideoBlock = "";
      if ((strategy as any).canal_pnl) {
        const vakOption = canalsPNL.find(c => c.label === (strategy as any).canal_pnl || c.id === (strategy as any).canal_pnl);
        if (vakOption) {
          const channelVideoMap: Record<string, string> = {
            "visual": "Prioriza tomas visualmente impactantes: colores vibrantes, slow-motion, antes/después, composiciones simétricas, luz dramática",
            "auditivo": "Enfatiza el diseño sonoro: narración voice-over emotiva, música con buildup, SFX en momentos clave, subtítulos siempre visibles, diálogo directo",
            "kinestésico": "Transmite sensaciones físicas: close-ups de texturas, tacto, expresiones faciales emotivas, contacto humano, movimientos de cámara orgánicos tipo handheld",
          };
          const videoHints = vakOption.channels.map(ch => channelVideoMap[ch] || "").filter(Boolean).join(". ");
          pnlVideoBlock = `\n- Canal sensorial PNL (${vakOption.label}): ${videoHints}
  - Patrones lingüísticos para voice-over/textos: ${vakOption.languagePatterns}
  - El video debe evocar el sistema representacional ${vakOption.channels.join(" + ")} del espectador en CADA escena`;
        }
      }

      strategyBlock = `\n\nESTRATEGIA PSYCHO-MATRIX APLICADA:
- Arquetipo digital: ${strategy.archetype} → Define el mood visual, paleta emocional, tipo de personajes/escenarios y ritmo narrativo
- Voz de marca: ${strategy.brand_voice} → Determina el estilo de edición, tipografía en pantalla, música y tono general
- Gatillo de persuasión: ${strategy.persuasion_trigger} → La emoción central que cada escena debe evocar en el espectador
- Generación objetivo: ${strategy.generation} → Adapta la estética, referencias culturales, códigos visuales y lenguaje
${strategy.advanced_tech ? `- Técnica psicológica avanzada: ${strategy.advanced_tech} → Aplica este principio en la estructura narrativa y cierre del video` : ""}${pnlVideoBlock}`;
    }

    const extraBlock = extraNotes?.trim() ? `\n\nINSTRUCCIONES ADICIONALES DEL USUARIO: ${extraNotes}` : "";

    // Platform-specific optimization instructions
    const platformOptimization = getPlatformOptimization(videoPlatform, getEffectiveDuration());

    // Tool-specific prompt structure
    const toolOptimization = getToolOptimization(videoTool, toolInfo.label);

    const variationAngles = [
      "ENFOQUE EMOCIONAL: Prioriza conexión sentimental, caras expresivas, música emotiva, ritmo pausado en momentos clave, close-ups de reacciones genuinas",
      "ENFOQUE DE IMPACTO: Cortes rápidos tipo montage, datos impactantes como text overlay, urgencia visual con flash frames, CTA agresivo, ritmo acelerado con beat drops",
      "ENFOQUE NARRATIVO: Mini-historia con arco dramático completo (inicio-nudo-desenlace). Usa continuidad de personaje, motivación clara y resolución emocional",
      "ENFOQUE ESTÉTICO: Prioriza belleza visual extrema: composiciones artísticas con regla de tercios, paleta cromática sofisticada, slow motion en 120fps, flares y bokeh",
      "ENFOQUE TESTIMONIAL: Perspectiva en primera persona o POV. Simula experiencia real: antes/después, reacción genuina, autenticidad sin filtros, formato vlog/UGC",
      "ENFOQUE TRENDING: Formato viral actual, hooks de pattern interrupt, text-on-screen dinámico, transiciones trending (zoom through, morph cut), música trending",
    ];
    const angleIdx = (variationNum - 1) % variationAngles.length;

    return `${baseTemplate}

─── BRIEFING CREATIVO ───
"${mainPrompt}"
${serviceBlock}${strategyBlock}${extraBlock}

─── ESPECIFICACIONES TÉCNICAS ───
- Plataforma destino: ${videoPlatform} (aspect ratio: ${(() => { const r = getEffectiveResolution(); return r.ratio; })()})
- Resolución de salida: ${(() => { const r = getEffectiveResolution(); return `${r.width}x${r.height}px`; })()}
- IMPORTANTE: El video DEBE generarse en resolución ${(() => { const r = getEffectiveResolution(); return `${r.width}x${r.height}`; })()} con aspect ratio ${(() => { const r = getEffectiveResolution(); return r.ratio; })()}. Especifica esto explícitamente al inicio del prompt.
- Duración total: ${getEffectiveDuration()}
- Estilo visual: ${styleInfo?.label} — ${styleInfo?.desc}
- Tono comunicacional: ${tone}
- FPS recomendado: ${(() => { const r = getEffectiveResolution(); return r.width >= 1920 ? "30-60 fps" : "24-30 fps"; })()}
${platformOptimization}
${toolOptimization}

─── ESTRUCTURA REQUERIDA DEL PROMPT ───

1. **HOOK (0:00–0:03):** Toma de apertura ultra-impactante. Describe con precisión cinematográfica:
   - Sujeto/objeto principal, posición en cuadro, escala
   - Tipo de plano (extreme close-up, wide, POV, etc.)
   - Movimiento de cámara exacto (velocidad + dirección)
   - Iluminación (fuente, temperatura, contraste, shadows)
   - Color grading dominante (LUT reference si es posible)
   - Elemento de pattern interrupt que detenga el scroll

2. **DESARROLLO (timing exacto por escena):** Cada escena debe incluir:
   - Shot description cinematográfica (qué se ve, composición, profundidad)
   - Camera movement (dolly in/out, pan L-R, tilt, crane, orbital, steadicam, handheld)
   - Lighting setup (key light, fill, rim, practicals, motivated vs stylized)
   - Color palette y mood (warm/cool, saturated/desaturated, specific hex si es posible)
   - Motion design (velocidad del sujeto, blur, slow-mo, speed ramp)
   - Transición a la siguiente escena (cut, match cut, whip pan, morph, zoom through, dissolve)
   - Audio cue (música, SFX, silencio, cambio de intensidad)

3. **CLIMAX / CTA (últimos 2-3 segundos):**
   - Toma de cierre con máximo impacto emocional
   - Text overlay con CTA (tipografía, animación de entrada, posición)
   - Stinger musical o sound design de cierre
   - Logo/branding reveal (si aplica)

4. **DIRECCIÓN DE ARTE GLOBAL:**
   - Paleta de colores específica (hex codes)
   - Referencias de mood board (ej: "estética Wes Anderson", "look médico premium")
   - Textura visual (film grain amount, clean digital, anamorphic)
   - Consistencia de iluminación entre escenas

5. **DISEÑO SONORO:**
   - Género musical, BPM aproximado, mood
   - Sound effects clave con timing
   - Momentos de silencio estratégico
   - Voice-over (si aplica): tono, cadencia, idioma

6. **TEXT ON SCREEN (si aplica):**
   - Textos exactos con timing (ej: "0:02 → 'Transforma tu sonrisa'")
   - Estilo tipográfico (sans-serif bold, serif elegant, handwritten, etc.)
   - Animación de entrada/salida (fade, slide, typewriter, glitch)

VARIACIÓN #${variationNum} de ${totalVariations}: ${variationAngles[angleIdx]}

⚠️ REGLAS FINALES:
- El prompt debe estar LISTO PARA COPIAR Y PEGAR en ${toolInfo.label}
- Escribe el prompt final en ESPAÑOL con términos técnicos cinematográficos en inglés
- Sé EXTREMADAMENTE descriptivo — cada detalle visual importa para la IA generativa
- NO incluyas explicaciones, meta-comentarios ni headers — SOLO el super-prompt de video listo para usar
- Incluye SIEMPRE indicaciones de timing exacto (ej: "0:00-0:03", "0:03-0:08")`;
  };

  // Platform-specific optimization
  const getPlatformOptimization = (platform: string, dur: string): string => {
    const map: Record<string, string> = {
      "Instagram Reels": `\nOPTIMIZACIÓN INSTAGRAM REELS:
- Formato vertical 9:16, safe zone: evitar texto en los 250px superiores e inferiores (UI de IG)
- Hook en los primeros 1.5 segundos es CRÍTICO para retención
- Usar trending audio patterns: build-up → drop → payoff
- Text overlay centrado, máx 3-4 palabras por pantalla, duración mín 2s por texto
- Loops: el final debe conectar visualmente con el inicio para fomentar replay`,
      "TikTok": `\nOPTIMIZACIÓN TIKTOK:
- Formato vertical 9:16, safe zone: 150px arriba, 400px abajo (botones de TikTok)
- Pattern interrupt en el segundo 0 — la primera frame define si el usuario se queda
- Formato UGC/auténtico performa mejor que producción pulida
- Usar green screen, split screen o POV cuando sea posible
- Text hooks tipo "POV:", "Wait for it…", "No one talks about this" adaptan engagement`,
      "YouTube Shorts": `\nOPTIMIZACIÓN YOUTUBE SHORTS:
- Formato vertical 9:16, safe zone similar a Reels
- YouTube favorece valor educativo o informativo — incluir datos/facts
- Thumbnail-first: la primera frame debe funcionar como thumbnail
- CTA: "Suscríbete" o "Mira el video completo" al final`,
      "Facebook Reels": `\nOPTIMIZACIÓN FACEBOOK REELS:
- Formato vertical 9:16, audiencia tiende a ser mayor (35-55)
- Menos trending-driven, más storytelling y valor práctico
- Usar subtítulos siempre (alto % de visualización sin sonido)
- Hooks informativos funcionan mejor que hooks de shock`,
      "YouTube": `\nOPTIMIZACIÓN YOUTUBE LANDSCAPE:
- Formato horizontal 16:9, resolución mínima 1080p
- Intro de 5s máximo antes de entrar al contenido
- Usar B-roll cinematográfico para mantener interés visual
- Thumbnail bait: crear un momento visualmente impactante para usar como thumbnail`,
    };
    return map[platform] || "";
  };

  // Tool-specific prompt structure advice
  const getToolOptimization = (tool: string, toolLabel: string): string => {
    const map: Record<string, string> = {
      "veo3": `\nOPTIMIZACIÓN PARA ${toolLabel.toUpperCase()}:
- Mantén cada escena en 3-5 oraciones concisas y descriptivas
- Especifica SIEMPRE el camera movement (dolly, pan, orbit, crane)
- Enfócate en MOOD y ESTILO sobre detalles granulares — Veo interpreta mejor la atmósfera
- Usa verbos de acción presentes ("la cámara se mueve", "la luz cambia")
- Evita instrucciones contradictorias — Veo las procesa literalmente
- Incluye audio/diálogo cues directamente en el prompt (Veo 3 soporta generación de audio nativo)`,
      "sora": `\nOPTIMIZACIÓN PARA ${toolLabel.toUpperCase()}:
- Prompts narrativos LARGOS (5-8 oraciones por escena) funcionan mejor
- Incluye LÓGICA CAUSAL: "cuando X sucede, entonces Y cambia" — Sora modela física y causa-efecto
- Excelente para interacciones multi-personaje y secuencias complejas
- Describe el mundo/entorno con detalle — Sora simula el espacio 3D
- Usa cadenas causales: "el viento mueve las cortinas → la luz parpadea → la sombra se desplaza"
- Especifica materiales y texturas ("seda suave", "metal pulido", "piel bronceada")`,
      "runway": `\nOPTIMIZACIÓN PARA ${toolLabel.toUpperCase()}:
- Estructura tipo TIMELINE con beat markers temporales
- Instrucciones codificadas en tiempo: "[0:00-0:03] escena A → [0:03-0:06] escena B"
- Especifica fps y motion style (slow motion, normal speed, speed ramp)
- Runway responde mejor a instrucciones de estilo visual: "estilo Film Noir", "look Blade Runner"
- Usa image-to-video cuando sea posible: genera keyframes primero
- Incluye motion intensity: "sutil movimiento", "movimiento enérgico", "estático"`,
      "kling": `\nOPTIMIZACIÓN PARA ${toolLabel.toUpperCase()}:
- Estructura DETALLADA con instrucciones precisas de rendering
- Kling excele en movimientos de cámara complejos y tomas aéreas
- Especifica profundidad de campo (f-stop), lens type (35mm, 85mm, anamorphic)
- Incluye referencias de iluminación específicas (golden hour, blue hour, neon)
- Los prompts negativos ayudan: "sin distorsión, sin artefactos, sin flickering"`,
      "pika": `\nOPTIMIZACIÓN PARA ${toolLabel.toUpperCase()}:
- Prompts concisos y directos, 2-3 oraciones por escena
- Enfócate en UN movimiento claro por generación
- Pika funciona mejor con scenes simples y movimientos predecibles
- Ideal para: loops, cinemagraphs, animaciones sutiles
- Especifica el tipo de movimiento: "zoom lento", "pan suave", "objeto flotando"`,
      "grok": `\nOPTIMIZACIÓN PARA GROK (xAI AURORA):
- Grok genera imágenes y animaciones de alta calidad via Aurora — ideal para motion graphics, ilustraciones animadas y secuencias estilizadas
- Usa descripciones detalladas del ESTILO ARTÍSTICO: "ilustración digital hiperrealista", "estilo anime cinematográfico", "3D render Pixar-quality"
- Para ANIMACIONES: describe frame by frame la transición y movimiento deseado
- Especifica la paleta de colores exacta y el mood board de referencia
- Grok responde bien a referencias culturales y de estilo: "estética cyberpunk", "paleta Wes Anderson", "look Studio Ghibli"
- Para secuencias: genera keyframes individuales y describe la interpolación entre ellos
- Incluye instrucciones de iluminación volumétrica y atmosférica para profundidad visual
- Soporta texto en imagen: especifica tipografía, posición y animación del texto
- IMPORTANTE: Grok es excelente para crear storyboards animados y concept art en movimiento`,
    };
    return map[tool] || `\nOPTIMIZACIÓN GENÉRICA:\n- Incluye todos los detalles posibles: sujeto, cámara, iluminación, color, movimiento\n- Usa lenguaje cinematográfico universal\n- Estructura clara con timing`;
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
        body: { prompt: prompt + "\n\nIMPORTANTE: Genera un super-prompt COMPLETAMENTE NUEVO y DIFERENTE al anterior. Nuevo enfoque visual, nueva narrativa, nueva estructura.", tone, platform: videoPlatform, type: "copy" },
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
      let generatedCopy = "";
      try {
        const service = services.find(s => s.id === selectedServiceId);
        const strategy = magicMode && magicFormula
          ? magicFormula
          : strategies.find(s => s.id === selectedStrategyId);
        
        let pnlCopyHint = "";
        if (strategy && (strategy as any).canal_pnl) {
          const vakOpt = canalsPNL.find(c => c.label === (strategy as any).canal_pnl || c.id === (strategy as any).canal_pnl);
          if (vakOpt) {
            pnlCopyHint = `\nCANAL SENSORIAL PNL: Escribe usando predicados del canal ${vakOpt.channels.join(" + ")}. Patrones: ${vakOpt.languagePatterns}`;
          }
        }

        const copyPrompt = `Genera un copy profesional para publicar un video en redes sociales.

CONTEXTO DEL VIDEO: "${mainPrompt}"
${service ? `PRODUCTO/SERVICIO: "${service.name}" — ${service.core_benefit}` : ""}
${strategy ? `ESTRATEGIA: Arquetipo ${strategy.archetype}, Voz ${strategy.brand_voice}, Gatillo ${strategy.persuasion_trigger}, Generación ${strategy.generation}` : ""}${pnlCopyHint}
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
          Generador de Super-Prompts de Video
        </h2>
        <p className="text-sm text-muted-foreground">
          Genera super-prompts cinematográficos optimizados para cada herramienta de video con IA.
          Cada prompt incluye timing, cámara, iluminación, color grading y diseño sonoro.
        </p>
      </div>

      {/* Admin-only prompt composition */}
      {isSuperAdmin && <VideoPromptTemplateEditor />}

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
              ...(magicFormula.canal_pnl ? [{ label: "Canal PNL", value: magicFormula.canal_pnl }] : []),
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-xs font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service + Strategy selectors */}
      {!magicMode && (
        <div className="space-y-4">
          {/* Service/Product selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Producto / Servicio (opcional)</Label>
            <Select value={selectedServiceId} onValueChange={handleServiceChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sin servicio seleccionado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin servicio</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.core_benefit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {services.length === 0 && (
              <p className="text-xs text-muted-foreground">No tienes servicios creados. Crea uno en Psycho-Matrix AI → Constructor.</p>
            )}
          </div>

          {/* Strategy selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Estrategia Psycho-Matrix (opcional)</Label>
            <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sin estrategia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin estrategia</SelectItem>
                {filteredStrategies.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.archetype} / {s.brand_voice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredStrategies.length === 0 && selectedServiceId !== "none" && (
              <p className="text-xs text-muted-foreground">No hay estrategias para este servicio. Crea una en Psycho-Matrix AI.</p>
            )}
            {strategies.length === 0 && (
              <p className="text-xs text-muted-foreground">No tienes estrategias creadas. Crea una en Psycho-Matrix AI.</p>
            )}
          </div>

          {/* Show selected strategy details */}
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
          <div className="flex gap-2 mt-1.5">
            <Select value={videoPlatform} onValueChange={setVideoPlatform}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {videoPlatforms.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label} <span className="text-muted-foreground ml-1">({p.ratio})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={expertMode ? "default" : "outline"}
              size="icon"
              className={cn("h-10 w-10 shrink-0", expertMode && "gradient-primary text-primary-foreground")}
              onClick={() => setExpertMode(!expertMode)}
              title="Modo experto: formatos exactos"
            >
              <Zap className="w-4 h-4" />
            </Button>
          </div>
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

      {/* Expert mode panel */}
      {expertMode && (
        <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Modo Experto — Formatos de Video</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Personalizar</span>
              <Switch checked={useCustomFormat} onCheckedChange={setUseCustomFormat} />
            </div>
          </div>

          {useCustomFormat ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ancho (px)</Label>
                <input
                  type="number"
                  min={360}
                  max={7680}
                  value={customWidth}
                  onChange={e => setCustomWidth(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alto (px)</Label>
                <input
                  type="number"
                  min={360}
                  max={7680}
                  value={customHeight}
                  onChange={e => setCustomHeight(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select value={customRatio} onValueChange={setCustomRatio}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["9:16", "16:9", "1:1", "4:5", "4:3", "3:4", "2:3", "3:2", "1.91:1", "21:9"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 text-xs text-muted-foreground">
                Resolución final: <strong>{customWidth}×{customHeight}px</strong> ({customRatio})
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group by platform */}
              {Array.from(new Set(expertVideoFormats.map(f => f.platform))).map(platform => (
                <div key={platform}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{platform}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {expertVideoFormats.filter(f => f.platform === platform).map(f => (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => setSelectedFormat(f)}
                        className={cn(
                          "p-2 rounded-lg border text-left transition-all text-xs",
                          selectedFormat?.label === f.label
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <p className="font-medium text-foreground">{f.label}</p>
                        <p className="text-[10px] text-muted-foreground">{f.width}×{f.height} · {f.ratio}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolution summary */}
          {(() => {
            const res = getEffectiveResolution();
            return (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs font-semibold text-foreground">📐 Resolución seleccionada:</span>
                <span className="text-xs text-primary font-bold">{res.width}×{res.height}px</span>
                <span className="text-xs text-muted-foreground">({res.ratio})</span>
                <span className="text-xs text-muted-foreground ml-auto">Se inyectará en el super-prompt</span>
              </div>
            );
          })()}
        </div>
      )}

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
          <Label className="text-sm font-medium">Optimizar super-prompt para</Label>
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
        {generating ? "Generando super-prompts..." : magicMode ? `✨ Hacer magia (${count} super-prompts)` : `Generar ${count} super-prompt${count > 1 ? "s" : ""} de video`}
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
                  <span className="text-sm font-semibold text-foreground">Super-prompt #{p.id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {platformInfo.label} · {getEffectiveResolution().width}×{getEffectiveResolution().height} · {getEffectiveDuration()} · {styleInfo?.label} · {toolInfo.label}
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
