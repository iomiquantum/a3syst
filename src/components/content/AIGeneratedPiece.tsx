import { useState, useEffect } from "react";
import { Check, RefreshCw, Loader2, Pencil, Image as ImageIcon, RotateCcw, Eye, EyeOff, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface GeneratedPiece {
  id: number;
  instruction: string;
  imagePrompt: string;
  copy: string | null;
  imageUrl: string | null;
  status: "idle" | "generating" | "done" | "approved";
}

interface Props {
  piece: GeneratedPiece;
  onCopyChange: (id: number, copy: string) => void;
  onRegenerateImage: (id: number, customPrompt?: string) => void;
  onRegenerateCopy: (id: number) => void;
  onApprove: (id: number) => void;
  regeneratingImage: boolean;
  regeneratingCopy: boolean;
}

const AIGeneratedPiece = ({ piece, onCopyChange, onRegenerateImage, onRegenerateCopy, onApprove, regeneratingImage, regeneratingCopy }: Props) => {
  const [editingCopy, setEditingCopy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(piece.imagePrompt);
  const [imgProgress, setImgProgress] = useState(0);

  // Simulate progress while regenerating image
  useEffect(() => {
    if (!regeneratingImage) {
      setImgProgress(0);
      return;
    }
    setImgProgress(5);
    const interval = setInterval(() => {
      setImgProgress(prev => {
        if (prev >= 92) { clearInterval(interval); return 92; }
        return prev + Math.random() * 8;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [regeneratingImage]);

  if (piece.status === "idle" || piece.status === "generating") return null;

  const isApproved = piece.status === "approved";

  return (
    <div className={cn(
      "border rounded-xl p-4 bg-card space-y-3 transition-all",
      isApproved ? "border-green-500/50 bg-green-500/5" : "border-border"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">#{piece.id}</Badge>
          {isApproved && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
              ✓ Aprobado
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ IA</Badge>
      </div>

      {/* Image */}
      <div className="rounded-lg overflow-hidden border border-border relative group">
        {regeneratingImage ? (
          <div className="w-full h-[280px] bg-muted flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Generando imagen…</p>
            <div className="w-3/4">
              <Progress value={imgProgress} className="h-1.5" />
            </div>
          </div>
        ) : piece.imageUrl ? (
          <img src={piece.imageUrl} alt={`Generada #${piece.id}`} className="w-full max-h-[280px] object-contain bg-muted" />
        ) : (
          <div className="w-full h-[200px] bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {!isApproved && piece.imageUrl && !regeneratingImage && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => onRegenerateImage(piece.id)}
              disabled={regeneratingImage}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerar imagen
            </Button>
          </div>
        )}
      </div>

      {/* Image Prompt */}
      {piece.imageUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 text-muted-foreground"
              onClick={() => { setShowPrompt(!showPrompt); if (!showPrompt) setCustomPrompt(piece.imagePrompt); }}
            >
              {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPrompt ? "Ocultar prompt" : "Ver prompt de imagen"}
            </Button>
          </div>
          {showPrompt && (
            <div className="space-y-2">
              {editingPrompt && !isApproved ? (
                <div className="space-y-2">
                  <Textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    className="min-h-[80px] text-xs"
                    placeholder="Edita el prompt para regenerar la imagen..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="text-xs gap-1 gradient-primary text-primary-foreground"
                      onClick={() => {
                        onRegenerateImage(piece.id, customPrompt);
                        setEditingPrompt(false);
                      }}
                      disabled={regeneratingImage}
                    >
                      {regeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Regenerar con este prompt
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditingPrompt(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-2.5 text-xs text-muted-foreground italic leading-relaxed">
                  {piece.imagePrompt}
                  {!isApproved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] gap-1 mt-1"
                      onClick={() => { setEditingPrompt(true); setCustomPrompt(piece.imagePrompt); }}
                    >
                      <Pencil className="w-2.5 h-2.5" /> Editar prompt
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Copy */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Copy</span>
          {!isApproved && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onRegenerateCopy(piece.id)} disabled={regeneratingCopy}>
                {regeneratingCopy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Regenerar
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setEditingCopy(!editingCopy)}>
                <Pencil className="w-3 h-3" />
                {editingCopy ? "Listo" : "Editar"}
              </Button>
            </div>
          )}
        </div>
        {editingCopy && !isApproved ? (
          <Textarea
            value={piece.copy || ""}
            onChange={e => onCopyChange(piece.id, e.target.value)}
            className="min-h-[100px] text-sm"
          />
        ) : (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed min-h-[60px]">
            {piece.copy || "Sin contenido"}
          </div>
        )}
      </div>

      {/* Approve button */}
      {!isApproved && piece.copy && piece.imageUrl && (
        <Button
          onClick={() => onApprove(piece.id)}
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4" />
          Aprobar y guardar como borrador
        </Button>
      )}
    </div>
  );
};

export default AIGeneratedPiece;
