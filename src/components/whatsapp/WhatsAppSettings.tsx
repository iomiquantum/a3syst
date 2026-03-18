import { useState } from "react";
import { useWhatsAppConnections, WhatsAppConnection } from "@/hooks/useWhatsAppConnections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageCircle, Plus, RefreshCw, Trash2, Key, ExternalLink } from "lucide-react";
import WhatsAppConnectionWizard from "./WhatsAppConnectionWizard";

const statusConfig: Record<string, { label: string; color: string; border: string }> = {
  active: { label: "Activo", color: "bg-green-500", border: "border-green-300" },
  pending: { label: "Pendiente", color: "bg-yellow-500", border: "border-yellow-300" },
  error: { label: "Error", color: "bg-red-500", border: "border-red-300" },
  inactive: { label: "Inactivo", color: "bg-gray-400", border: "border-gray-300" },
};

const WhatsAppSettings = () => {
  const { connections, loading, deleteConnection, updateToken, refetch } = useWhatsAppConnections();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tokenDialog, setTokenDialog] = useState<{ open: boolean; connectionId: string }>({ open: false, connectionId: "" });
  const [newToken, setNewToken] = useState("");

  const handleUpdateToken = async () => {
    if (!newToken.startsWith("EAA") || newToken.length < 50) {
      toast.error("Token inválido");
      return;
    }
    await updateToken(tokenDialog.connectionId, newToken);
    setTokenDialog({ open: false, connectionId: "" });
    setNewToken("");
  };

  if (loading) {
    return <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">💬 WhatsApp Business</h2>
          <p className="text-sm text-muted-foreground">Conecta los números de WhatsApp de tu negocio.</p>
        </div>
      </div>

      {connections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold">Conecta WhatsApp Business</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Recibe y responde mensajes directamente desde a3syst
            </p>
            <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Conectar WhatsApp
            </Button>
            <a
              href="https://developers.facebook.com/apps/creation/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-3"
            >
              ¿No tienes app de Meta? Ver cómo crear una →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => {
            const status = statusConfig[conn.status] || statusConfig.inactive;
            return (
              <Card key={conn.id} className={`border-l-4 ${status.border}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                      {conn.business_name || conn.display_name || "WhatsApp"}
                      <Badge variant="outline" className="text-xs">{status.label}</Badge>
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTokenDialog({ open: true, connectionId: conn.id }); }}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteConnection(conn.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>📱 {conn.display_phone_number || conn.phone_number || "—"}</div>
                    <div>📦 App: {conn.meta_app_name || conn.meta_app_id || "—"}</div>
                    <div>⭐ Calidad: {conn.quality_rating || "—"}</div>
                    <div>🔗 Webhook: {conn.webhook_configured ? "✅" : "❌"}</div>
                    <div>🕐 Verificado: {conn.last_verified_at ? new Date(conn.last_verified_at).toLocaleDateString() : "—"}</div>
                  </div>
                  {conn.status === "pending" && !conn.webhook_configured && (
                    <div className="mt-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs">
                      ⚠️ Falta configurar el webhook.{" "}
                      <button className="text-primary hover:underline" onClick={() => setWizardOpen(true)}>Configurar ahora</button>
                    </div>
                  )}
                  {conn.status === "error" && conn.last_error && (
                    <div className="mt-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 text-xs">
                      🔴 {conn.last_error}{" "}
                      <button className="text-primary hover:underline" onClick={() => setTokenDialog({ open: true, connectionId: conn.id })}>Actualizar Token</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setWizardOpen(true)}>
            <CardContent className="flex items-center justify-center py-6">
              <Plus className="h-5 w-5 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Conectar otro WhatsApp</span>
            </CardContent>
          </Card>
        </div>
      )}

      <WhatsAppConnectionWizard open={wizardOpen} onOpenChange={(v) => { setWizardOpen(v); if (!v) refetch(); }} />

      <Dialog open={tokenDialog.open} onOpenChange={(v) => setTokenDialog({ open: v, connectionId: tokenDialog.connectionId })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Access Token</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            placeholder="EAAG..."
            value={newToken}
            onChange={(e) => setNewToken(e.target.value.trim())}
          />
          <p className="text-xs text-muted-foreground">
            {newToken.startsWith("EAA") && newToken.length > 50 ? "✅ Formato válido" : "El token debe empezar con 'EAA'"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenDialog({ open: false, connectionId: "" })}>Cancelar</Button>
            <Button onClick={handleUpdateToken}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppSettings;
