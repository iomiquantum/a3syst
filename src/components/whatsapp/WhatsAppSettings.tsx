import { useState } from "react";
import { useWhatsAppConnections, WhatsAppConnection } from "@/hooks/useWhatsAppConnections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { MessageCircle, Plus, RefreshCw, Trash2, Key, Copy, ChevronDown, ExternalLink, Info } from "lucide-react";
import WhatsAppConnectionWizard from "./WhatsAppConnectionWizard";

const statusConfig: Record<string, { label: string; color: string; border: string }> = {
  active: { label: "Activo", color: "bg-green-500", border: "border-green-300" },
  pending: { label: "Pendiente", color: "bg-yellow-500", border: "border-yellow-300" },
  error: { label: "Error", color: "bg-red-500", border: "border-red-300" },
  inactive: { label: "Inactivo", color: "bg-gray-400", border: "border-gray-300" },
};

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-1">
        <Input readOnly value={value} className="text-xs font-mono bg-muted/50 h-8" />
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

const WhatsAppSettings = () => {
  const { connections, loading, deleteConnection, updateToken, refetch } = useWhatsAppConnections();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tokenDialog, setTokenDialog] = useState<{ open: boolean; connectionId: string }>({ open: false, connectionId: "" });
  const [newToken, setNewToken] = useState("");
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const handleUpdateToken = async () => {
    if (!newToken.startsWith("EAA") || newToken.length < 50) {
      toast.error("Token inválido");
      return;
    }
    await updateToken(tokenDialog.connectionId, newToken);
    setTokenDialog({ open: false, connectionId: "" });
    setNewToken("");
  };

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
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
            const isExpanded = expandedDetails[conn.id] || false;
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTokenDialog({ open: true, connectionId: conn.id })}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteConnection(conn.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>📱 {conn.display_phone_number || conn.phone_number || "—"}</div>
                    <div>📦 App: {conn.meta_app_name || conn.meta_app_id || "—"}</div>
                    <div>⭐ Calidad: {conn.quality_rating || "—"}</div>
                    <div>🔗 Webhook: {conn.webhook_configured ? "✅" : "❌"}</div>
                    <div>🕐 Verificado: {conn.last_verified_at ? new Date(conn.last_verified_at).toLocaleDateString() : "—"}</div>
                  </div>

                  {/* Webhook setup banner for pending connections */}
                  {conn.status === "pending" && !conn.webhook_configured && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Configura el Webhook en Meta</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            Pega la URL y el token en Meta → Verificar y guardar → Suscríbete a "<strong>messages</strong>"
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <CopyField label="URL del Webhook" value={conn.webhook_url || `https://ecdshvqxvjbeizdivpuz.supabase.co/functions/v1/whatsapp-webhook`} />
                        <CopyField label="Token de Verificación" value={conn.webhook_verify_token || "—"} />
                      </div>
                      {conn.meta_app_id && (
                        <a
                          href={`https://developers.facebook.com/apps/${conn.meta_app_id}/whatsapp-business/wa-settings/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Abrir Configuración en Meta <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {conn.status === "error" && conn.last_error && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 text-xs">
                      🔴 {conn.last_error}{" "}
                      <button className="text-primary hover:underline" onClick={() => setTokenDialog({ open: true, connectionId: conn.id })}>Actualizar Token</button>
                    </div>
                  )}

                  {/* Expandable technical details */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleDetails(conn.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 gap-1">
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        Ver detalles técnicos
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2 border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Meta App ID:</span> <span className="font-mono">{conn.meta_app_id || "—"}</span></div>
                          <div><span className="text-muted-foreground">WABA ID:</span> <span className="font-mono">{conn.waba_id || "—"}</span></div>
                          <div><span className="text-muted-foreground">Phone Number ID:</span> <span className="font-mono">{conn.phone_number_id || "—"}</span></div>
                          <div><span className="text-muted-foreground">Status:</span> <span className="font-mono">{conn.status}</span></div>
                        </div>
                        <CopyField label="Webhook URL" value={conn.webhook_url || `https://ecdshvqxvjbeizdivpuz.supabase.co/functions/v1/whatsapp-webhook`} />
                        <CopyField label="Webhook Verify Token" value={conn.webhook_verify_token || "—"} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
