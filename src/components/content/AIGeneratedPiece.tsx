import { useState } from "react";
import { Check, RefreshCw, Loader2, Pencil, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface GeneratedPiece {
  id: number;
  instruction: string;
  copy: string | null;
  imageUrl: string | null;
  status: "idle" | "generating" | "done" | "approved";
}

interface Props {
  piece: GeneratedPiece;
  onCopyChange: (id: number, copy: string) => void;
  onRegenerateImage: (id: number) => void;
  onApprove: (id: number) => void;
  regeneratingImage: boolean;
}

const AIGeneratedPiece = ({ piece, onCopyChange, onRegenerateImage, onApprove, regeneratingImage }: Props) => {
  const [editing, setEditing] = useState(false);

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
        {piece.imageUrl ? (
          <img src={piece.imageUrl} alt={`Generada #${piece.id}`} className="w-full max-h-[280px] object-contain bg-muted" />
        ) : (
          <div className="w-full h-[200px] bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {!isApproved && piece.imageUrl && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => onRegenerateImage(piece.id)}
              disabled={regeneratingImage}
            >
              {regeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerar imagen
            </Button>
          </div>
        )}
      </div>

      {/* Copy */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Copy</span>
          {!isApproved && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setEditing(!editing)}>
              <Pencil className="w-3 h-3" />
              {editing ? "Listo" : "Editar"}
            </Button>
          )}
        </div>
        {editing && !isApproved ? (
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
