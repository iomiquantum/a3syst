import { useState, useCallback } from "react";
import { Wand2, Loader2, Plus, Minus, Sparkles, RefreshCw, Mic, MicOff, Save, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ContentPost } from "@/hooks/useContentPosts";
import { supabase } from "@/integrations/supabase/client";
import { usePsychoStrategies } from "@/hooks/usePsychoMatrix";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useActivePromptTemplate } from "@/hooks/usePromptTemplates";
import { useBusiness } from "@/hooks/useBusiness";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada, canalsPNL,
} from "@/lib/psychoMatrixData";

interface Props {
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const tones = ["Profesional", "Casual", "Inspirador", "Educativo", "Humorístico", "Urgente", "Emotivo"];
const platforms = ["Instagram", "Facebook", "TikTok", "WhatsApp"];
const copyLengths = [
  { value: "short", label: "Corto", desc: "~50-100 caracteres" },
  { value: "medium", label: "Mediano", desc: "~150-250 caracteres" },
  { value: "long", label: "Amplio", desc: "~300-500 caracteres" },
  { value: "custom", label: "Personalizado", desc: "caracteres a medida" },
];

const MAX_PIECES_DEFAULT = 4;
const MAX_PIECES_ADMIN = 10;

interface GeneratedCopy {
  id: number;
  copy: string;
  status: "generating" | "done" | "approved";
}

const CopyAIGenerator = ({ content }: Props) => {
  const [count, setCount] = useState(3);
  const [mainPrompt, setMainPrompt] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [platform, setPlatform] = useState("Instagram");
  const [copyLength, setCopyLength] = useState("medium");
  const [customCopyChars, setCustomCopyChars] = useState(300);
  const [extraNotes, setExtraNotes] = useState("");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("none");
  const [magicMode, setMagicMode] = useState(false);
  const [magicFormula, setMagicFormula] = useState<{
    archetype: string; brand_voice: string; persuasion_trigger: string; generation: string; advanced_tech: string; canal_pnl: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copies, setCopies] = useState<GeneratedCopy[]>([]);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(new Set());
  const [copiedIds, setCopiedIds] = useState<Set<number>>(new Set());

  const { data: strategies = [] } = usePsychoStrategies();
  const { isSuperAdmin } = useBusiness();
  const { data: copyPromptTemplate } = useActivePromptTemplate("copy");

  const handleVoiceResult = useCallback((transcript: string) => {
    setMainPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
  }, []);
  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({ onResult: handleVoiceResult });

  const maxPieces = isSuperAdmin ? MAX_PIECES_ADMIN : MAX_PIECES_DEFAULT;
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
  };

  const handleMagicToggle = (checked: boolean) => {
    setMagicMode(checked);
    if (checked) hacerMagia();
    else setMagicFormula(null);
  };

  const getEffectiveCopyLength = () => {
    if (copyLength === "custom") return { value: "custom", label: "Personalizado", desc: `~${customCopyChars} caracteres` };
    return copyLengths.find(c => c.value === copyLength) || copyLengths[1];
  };

  const buildCopyPrompt = (variationNum: number, totalVariations: number) => {
    const selectedStrategy = magicMode && magicFormula ? magicFormula : strategies.find(s => s.id === selectedStrategyId);
    const lengthInfo = getEffectiveCopyLength();
    const copyTpl = copyPromptTemplate?.template || "";
    const baseTemplate = copyTpl.trim() ? `${copyTpl}\n\n` : "";

    let strategyContext = "";
    if (selectedStrategy) {
      let pnlBlock = "";
      const canal = (selectedStrategy as any).canal_pnl;
      if (canal) {
        const vakOption = canalsPNL.find(c => c.label === canal || c.id === canal);
        if (vakOption) {
          pnlBlock = `\n\nPROGRAMACIÓN NEUROLINGÜÍSTICA (PNL) - CANAL SENSORIAL:
- Canal: ${vakOption.label}
- PATRONES LINGÜÍSTICOS OBLIGATORIOS: ${vakOption.languagePatterns}
- Ejemplo: ${vakOption.example}`;
        }
      }
      strategyContext = `\n\nESTRATEGIA PSYCHO-MATRIX:
- Arquetipo: ${selectedStrategy.archetype}
- Voz: ${selectedStrategy.brand_voice}
- Gatillo: ${selectedStrategy.persuasion_trigger}
- Generación: ${selectedStrategy.generation}
${(selectedStrategy as any).advanced_tech ? `- Técnica: ${(selectedStrategy as any).advanced_tech}` : ""}${pnlBlock}`;
    }

    const extraContext = extraNotes?.trim() ? `\nNOTAS ADICIONALES: ${extraNotes}` : "";
    const lengthInstruction = `\nLONGITUD: ${lengthInfo.label.toUpperCase()} (${lengthInfo.desc}). Respeta estrictamente.`;

    return `${baseTemplate}${mainPrompt}${strategyContext}${lengthInstruction}${extraContext}

Genera SOLO el copy de texto (sin imagen). Variación #${variationNum} de ${totalVariations}.
Cada variación usa un enfoque distinto:
- V1: emocional/sentimental
- V2: oferta/urgencia
- V3: educativo/informativo
- V4+: testimonial/social proof o creativo único

Incluye hashtags relevantes al final. Responde SOLO con el copy, sin explicaciones.`;
  };

  const handleGenerate = async () => {
    if (!mainPrompt.trim()) { toast.error("Describe tu campaña o idea"); return; }
    setGenerating(true);
    setCopies(Array.from({ length: count }, (_, i) => ({ id: i + 1, copy: "", status: "generating" })));

    const results = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => {
        const prompt = buildCopyPrompt(i + 1, count);
        return supabase.functions.invoke("ai-generate-content", {
          body: { prompt, tone, platform, type: "copy" },
        });
      })
    );

    setCopies(results.map((r, i) => ({
      id: i + 1,
      copy: r.status === "fulfilled" && !r.value.error ? r.value.data?.content || "" : "Error generando copy",
      status: "done",
    })));
    setGenerating(false);
  };

  const handleRegenerate = async (id: number) => {
    setRegeneratingIds(prev => new Set(prev).add(id));
    try {
      const prompt = buildCopyPrompt(id, copies.length) + "\n\nIMPORTANTE: Genera un copy COMPLETAMENTE NUEVO y DIFERENTE al anterior.";
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone, platform, type: "copy" },
      });
      if (error) throw error;
      setCopies(prev => prev.map(c => c.id === id ? { ...c, copy: data?.content || c.copy } : c));
    } catch { toast.error("Error regenerando copy"); }
    finally { setRegeneratingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const handleCopyToClipboard = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIds(prev => new Set(prev).add(id));
    setTimeout(() => setCopiedIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
    toast.success("Copy copiado al portapapeles");
  };

  const handleSaveAsDraft = async (id: number) => {
    const piece = copies.find(c => c.id === id);
    if (!piece) return;
    await content.createPost({
      body: piece.copy,
      title: mainPrompt.slice(0, 60),
      status: "draft",
      ai_generated: true,
      ai_prompt: mainPrompt,
      platforms: [platform.toLowerCase()],
      media_type: "text",
    });
    setCopies(prev => prev.map(c => c.id === id ? { ...c, status: "approved" } : c));
  };

  const handleEditCopy = (id: number, newCopy: string) => {
    setCopies(prev => prev.map(c => c.id === id ? { ...c, copy: newCopy } : c));
  };

  const allDone = copies.length > 0 && copies.every(c => c.status === "done" || c.status === "approved");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Copies con IA</h2>
        <p className="text-sm text-muted-foreground">
          Genera solo textos publicitarios optimizados. Los copies aprobados se guardan como borradores.
        </p>
      </div>

      {/* Main prompt */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">¿Qué quieres promocionar?</Label>
        <div className="relative">
          <Textarea
            placeholder="Ej: Promocionar paquetes de blanqueamiento dental con 30% de descuento para mujeres de 25-50 años..."
            className="min-h-[100px] pr-12"
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
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Magic mode */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Checkbox id="magic-copy" checked={magicMode} onCheckedChange={(c) => handleMagicToggle(c === true)} />
          <label htmlFor="magic-copy" className="flex items-center gap-1.5 text-sm font-medium cursor-pointer text-foreground">
            <Sparkles className="w-4 h-4 text-primary" /> ✨ Hacer magia
          </label>
        </div>
        {magicMode && (
          <Button variant="outline" onClick={hacerMagia} className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <RefreshCw className="w-4 h-4" /> Abra cadabra
          </Button>
        )}
      </div>

      {magicMode && magicFormula && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          {[
            { label: "Arquetipo", value: magicFormula.archetype },
            { label: "Voz", value: magicFormula.brand_voice },
            { label: "Gatillo", value: magicFormula.persuasion_trigger },
            { label: "Generación", value: magicFormula.generation },
            ...(magicFormula.advanced_tech ? [{ label: "Técnica", value: magicFormula.advanced_tech }] : []),
            ...(magicFormula.canal_pnl ? [{ label: "Canal PNL", value: magicFormula.canal_pnl }] : []),
          ].map(item => (
            <div key={item.label} className="space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strategy selector */}
      {!magicMode && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Estrategia Psycho-Matrix (opcional)</Label>
          <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
            <SelectTrigger><SelectValue placeholder="Sin estrategia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin estrategia</SelectItem>
              {strategies.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} — {s.archetype} / {s.brand_voice}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!magicMode && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Notas adicionales (opcional)</Label>
          <Textarea placeholder="Hashtags, público objetivo, detalles extras..." className="min-h-[50px]" value={extraNotes} onChange={e => setExtraNotes(e.target.value)} />
        </div>
      )}

      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-4">
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
              <SelectContent>{tones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-sm font-medium">Plataforma</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium">Longitud</Label>
          <Select value={copyLength} onValueChange={setCopyLength}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {copyLengths.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label} ({c.desc})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {copyLength === "custom" && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Caracteres</Label>
          <Input type="number" min={20} max={5000} value={customCopyChars} onChange={e => setCustomCopyChars(Number(e.target.value))} className="w-32" />
        </div>
      )}

      <Button onClick={handleGenerate} disabled={generating || !mainPrompt.trim()} className="gradient-primary text-primary-foreground gap-2">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : magicMode ? <Sparkles className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
        {generating ? "Generando copies..." : magicMode ? `✨ Hacer magia (${count})` : `Generar ${count} cop${count > 1 ? "ies" : "y"}`}
      </Button>

      {/* Generating skeleton */}
      {generating && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4 bg-card animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {allDone && (
        <div className="grid gap-4 md:grid-cols-2">
          {copies.map(c => (
            <Card key={c.id} className={cn("shadow-card transition-all", c.status === "approved" && "ring-2 ring-[hsl(var(--success))]")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Copy #{c.id}</Badge>
                    {c.status === "approved" && <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px]">Guardado</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyToClipboard(c.id, c.copy)}
                    >
                      {copiedIds.has(c.id) ? <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRegenerate(c.id)}
                      disabled={regeneratingIds.has(c.id)}
                    >
                      {regeneratingIds.has(c.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={c.copy}
                  onChange={e => handleEditCopy(c.id, e.target.value)}
                  className="min-h-[120px] text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{c.copy.length} caracteres</span>
                  <Button
                    size="sm"
                    onClick={() => handleSaveAsDraft(c.id)}
                    disabled={c.status === "approved" || !c.copy.trim()}
                    className="gap-1.5 text-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar borrador
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CopyAIGenerator;
