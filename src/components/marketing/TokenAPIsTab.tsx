import { useState } from "react";
import { Key, Plus, Eye, EyeOff, Trash2, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TokenConfig {
  id: string;
  name: string;
  provider: string;
  tokenMasked: string;
  status: "activo" | "inactivo" | "error";
  lastUsed: string;
}

const mockTokens: TokenConfig[] = [
  { id: "1", name: "WhatsApp Business API", provider: "Meta", tokenMasked: "EAAx...k9F2", status: "activo", lastUsed: "Hace 5 min" },
  { id: "2", name: "Instagram Messaging", provider: "Meta", tokenMasked: "IGA...r8P1", status: "inactivo", lastUsed: "Nunca" },
];

const statusMap: Record<string, { color: string; label: string }> = {
  activo: { color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]", label: "Activo" },
  inactivo: { color: "bg-muted text-muted-foreground", label: "Inactivo" },
  error: { color: "bg-destructive/10 text-destructive", label: "Error" },
};

const TokenAPIsTab = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Configura los tokens de API para conectar canales de comunicación.</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Agregar token
        </Button>
      </div>

      <div className="space-y-3">
        {mockTokens.map((t) => {
          const st = statusMap[t.status];
          return (
            <Card key={t.id} className="shadow-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.provider} · Token: {t.tokenMasked}</p>
                </div>
                <Badge variant="outline" className={st.color}>{st.label}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{t.lastUsed}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(t.id, t.tokenMasked)}
                  >
                    {copiedId === t.id ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">¿Cómo obtener tus tokens?</CardTitle>
          <CardDescription className="text-xs">
            Para conectar WhatsApp Business, necesitas un token de acceso permanente de la plataforma Meta Business. 
            Ve a developers.facebook.com → Tu app → WhatsApp → Configuración de la API y copia el token de acceso.
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar token de API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta_whatsapp">Meta - WhatsApp Business</SelectItem>
                  <SelectItem value="meta_instagram">Meta - Instagram</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre descriptivo</Label>
              <Input placeholder="Ej: WhatsApp producción" />
            </div>
            <div className="space-y-2">
              <Label>Token / API Key</Label>
              <Input type="password" placeholder="Pega tu token aquí" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number ID (WhatsApp)</Label>
              <Input placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setDialogOpen(false)}>Guardar token</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TokenAPIsTab;
