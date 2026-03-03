import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Send, Image as ImageIcon } from "lucide-react";
import type { SocialConnection } from "@/hooks/useSocialConnections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: SocialConnection;
  onPublish: (connectionId: string, message: string, imageUrl?: string) => Promise<{ success: boolean; postId?: string; error?: string }>;
}

const TestPublishModal = ({ open, onOpenChange, connection, onPublish }: Props) => {
  const [message, setMessage] = useState(
    connection.platform === "instagram"
      ? "Primera publicación automática desde a3syst! 🚀 #a3syst"
      : "¡Hola! Esta es una prueba desde a3syst 🚀"
  );
  const [imageUrl, setImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const isIG = connection.platform === "instagram";
  const canPublish = message.trim() && (!isIG || imageUrl.trim());

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);
    const res = await onPublish(connection.id, message, imageUrl || undefined);
    setResult(res);
    setPublishing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🧪 Publicación de Prueba
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Plataforma:</span>{" "}
              {connection.platform === "facebook" ? "Facebook Page" : "Instagram Business"}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Cuenta:</span> {connection.platform_name}
            </p>
          </div>

          {isIG && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> URL de imagen (requerida)
              </Label>
              <Input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="text-sm"
              />
              {isIG && !imageUrl && (
                <p className="text-xs text-muted-foreground">Instagram requiere al menos una imagen</p>
              )}
            </div>
          )}

          {!isIG && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> URL de imagen (opcional)
              </Label>
              <Input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="text-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Mensaje</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>

          <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Esto publicará en tu {connection.platform === "facebook" ? "página real de Facebook" : "cuenta real de Instagram"}.
            </p>
          </div>

          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.success ? "bg-[hsl(var(--success))]/5 text-[hsl(var(--success))]" : "bg-destructive/5 text-destructive"}`}>
              {result.success ? "✅ ¡Publicación exitosa!" : `❌ Error: ${result.error}`}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-1.5 gradient-primary text-primary-foreground"
              onClick={handlePublish}
              disabled={publishing || !canPublish}
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {publishing ? "Publicando..." : "Publicar Ahora"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestPublishModal;
