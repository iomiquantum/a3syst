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
  const [count, setCount] = useState(1);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [tone, setTone] = useState("Profesional");
  const [platform, setPlatform] = useState("Instagram");
  const [generating, setGenerating] = useState(false);
  const [pieces, setPieces] = useState<GeneratedPiece[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const updateCount = (n: number) => {
    const next = Math.max(1, Math.min(MAX_PIECES, n));
    setCount(next);
    setInstructions(prev => {
      const copy = [...prev];
      while (copy.length < next) copy.push("");
      return copy.slice(0, next);
    });
  };

  const updateInstruction = (idx: number, val: string) => {
    setInstructions(prev => prev.map((v, i) => (i === idx ? val : v)));
  };

  const handleGenerate = async () => {
    const valid = instructions.slice(0, count);
    if (valid.some(v => !v.trim())) {
      toast.error("Completa todas las instrucciones");
      return;
    }

    setGenerating(true);
    setPieces(valid.map((inst, i) => ({
      id: i + 1,
      instruction: inst,
      copy: null,
      imageUrl: null,
      status: "generating",
    })));

    // Generate all pieces in parallel
    const results = await Promise.allSettled(
      valid.map(async (inst, i) => {
        // Generate copy
        const { data: copyData, error: copyErr } = await supabase.functions.invoke("ai-generate-content", {
          body: { prompt: inst, tone, platform, type: "copy" },
        });
        if (copyErr) throw copyErr;

        // Generate image
        const { data: imgData, error: imgErr } = await supabase.functions.invoke("ai-generate-content", {
          body: { prompt: inst, tone, platform, type: "image" },
        });
        if (imgErr) throw imgErr;

        return {
          id: i + 1,
          instruction: inst,
          copy: copyData?.content || "",
          imageUrl: imgData?.imageUrl || null,
          status: "done" as const,
        };
      })
    );

    setPieces(results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      console.error(`Piece ${i + 1} failed:`, r.reason);
      toast.error(`Error generando pieza #${i + 1}`);
      return {
        id: i + 1,
        instruction: valid[i],
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
        body: { prompt: piece.instruction, tone, platform, type: "image" },
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

  const handleApprove = async (id: number) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece || !piece.copy || !piece.imageUrl) return;

    await content.createPost({
      body: piece.copy,
      title: piece.instruction.slice(0, 60),
      status: "draft",
      ai_generated: true,
      ai_prompt: piece.instruction,
      platforms: [platform.toLowerCase()],
      media_urls: [piece.imageUrl],
      media_type: "image",
    });

    setPieces(prev => prev.map(p => (p.id === id ? { ...p, status: "approved" } : p)));
  };

  const allDone = pieces.length > 0 && pieces.every(p => p.status === "done" || p.status === "approved");
  const anyGenerating = generating;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Generar contenido con IA</h2>
        <p className="text-sm text-muted-foreground">Genera múltiples publicaciones (copy + imagen) de una vez. Máximo {MAX_PIECES}.</p>
      </div>

      {/* Count selector */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium whitespace-nowrap">¿Cuántas publicaciones generar?</Label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(count - 1)} disabled={count <= 1}>
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-lg font-bold w-8 text-center">{count}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(count + 1)} disabled={count >= MAX_PIECES}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Label className="text-sm font-medium">
              Instrucción #{i + 1}
            </Label>
            <Textarea
              placeholder={`Ej: Publicación sobre blanqueamiento dental con 20% de descuento, estilo moderno...`}
              className="min-h-[80px]"
              value={instructions[i] || ""}
              onChange={e => updateInstruction(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Tone & Platform */}
      <div className="grid gap-4 md:grid-cols-2">
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
        disabled={anyGenerating}
        className="gradient-primary text-primary-foreground gap-2"
      >
        {anyGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {anyGenerating ? "Generando..." : `Generar ${count} publicación${count > 1 ? "es" : ""}`}
      </Button>

      {/* Generating skeleton */}
      {anyGenerating && (
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
              onApprove={handleApprove}
              regeneratingImage={regeneratingId === piece.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentAIGenerator;
