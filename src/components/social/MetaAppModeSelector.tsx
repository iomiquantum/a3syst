import { useState } from "react";
import { Settings, Shield, Building2, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useMetaAppConfig } from "@/hooks/useMetaAppConfig";
import CustomAppWizard from "./CustomAppWizard";

interface Props {
  metaConfig: ReturnType<typeof useMetaAppConfig>;
}

const MetaAppModeSelector = ({ metaConfig }: Props) => {
  const { currentMode, config, switchToShared } = metaConfig;
  const [showConfirmCustom, setShowConfirmCustom] = useState(false);
  const [showCustomWizard, setShowCustomWizard] = useState(false);
  const [showConfirmShared, setShowConfirmShared] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitchToShared = async () => {
    setSwitching(true);
    await switchToShared();
    setSwitching(false);
    setShowConfirmShared(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Configuración de App Meta</h3>
          <p className="text-sm text-muted-foreground">Elige cómo tu negocio se conecta con Facebook e Instagram</p>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Shared App Card */}
        <Card
          className={`cursor-pointer transition-all duration-300 ${
            currentMode === "shared"
              ? "border-2 border-[#1877F2] shadow-lg shadow-[#1877F2]/10"
              : "border-border/50 hover:border-border"
          }`}
          onClick={() => {
            if (currentMode === "custom") setShowConfirmShared(true);
          }}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#1877F2]" />
                </div>
                <span className="font-bold text-foreground">App Compartida a3syst</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                currentMode === "shared" ? "border-[#1877F2] bg-[#1877F2]" : "border-muted-foreground/30"
              }`}>
                {currentMode === "shared" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            <div className="space-y-1.5">
              {["Recomendado", "Sin configuración extra", "Listo para usar"].map((item, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0" /> {item}
                </p>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Todos los negocios usan la misma app certificada de a3syst. Solo necesitas pegar tu token.
            </p>

            {currentMode === "shared" && (
              <Badge className="bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20">Seleccionado</Badge>
            )}
          </CardContent>
        </Card>

        {/* Custom App Card */}
        <Card
          className={`cursor-pointer transition-all duration-300 ${
            currentMode === "custom"
              ? "border-2 border-purple-500 shadow-lg shadow-purple-500/10"
              : "border-border/50 hover:border-border"
          }`}
          onClick={() => {
            if (currentMode === "shared") setShowConfirmCustom(true);
          }}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-purple-500" />
                </div>
                <span className="font-bold text-foreground">App Propia (Avanzado)</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                currentMode === "custom" ? "border-purple-500 bg-purple-500" : "border-muted-foreground/30"
              }`}>
                {currentMode === "custom" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Control total</p>
              <p className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Independencia de a3syst</p>
              <p className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Requiere configuración técnica</p>
            </div>

            {currentMode === "custom" && config?.custom_app_name && (
              <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                {config.custom_app_name}
              </Badge>
            )}
            {currentMode !== "custom" && (
              <Badge variant="outline" className="text-muted-foreground">Seleccionar</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border/50">
        💡 La app compartida es perfecta para la mayoría de negocios. Solo elige "App Propia" si necesitas control total o si tu negocio requiere independencia operativa.
      </p>

      {/* Confirm Custom Dialog */}
      <Dialog open={showConfirmCustom} onOpenChange={setShowConfirmCustom}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-500" />
              Modo Avanzado: App Propia de Meta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este modo requiere que crees y configures tu propia aplicación en Meta for Developers.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Ventajas:</p>
              {[
                "Independencia total de a3syst",
                "Tu app, tus reglas, tu control",
                "Si a3syst tiene problemas con Meta, tu negocio sigue publicando",
              ].map((v, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0" /> {v}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Requiere:</p>
              {[
                "Cuenta en Meta for Developers",
                'Crear una app tipo "Business"',
                "Configurar permisos manualmente",
                "Conocimiento técnico básico",
              ].map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0" /> {r}
                </p>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmCustom(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-purple-500 hover:bg-purple-600 text-white"
                onClick={() => { setShowConfirmCustom(false); setShowCustomWizard(true); }}
              >
                Activar App Propia <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Switch to Shared */}
      <Dialog open={showConfirmShared} onOpenChange={setShowConfirmShared}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#1877F2]" />
              Cambiar a App Compartida
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro? Perderás la independencia de tu app propia. Necesitarás regenerar tus tokens usando la app a3syst.
            </p>
            <div className="bg-destructive/5 rounded-xl p-3 border border-destructive/10">
              <p className="text-xs text-muted-foreground">
                ⚠️ Tus publicaciones programadas seguirán funcionando con el token anterior. Te recomendamos regenerar tu token después del cambio.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmShared(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-1.5 gradient-primary text-primary-foreground"
                onClick={handleSwitchToShared}
                disabled={switching}
              >
                {switching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirmar Cambio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom App Wizard */}
      <CustomAppWizard
        open={showCustomWizard}
        onOpenChange={setShowCustomWizard}
        metaConfig={metaConfig}
      />
    </div>
  );
};

export default MetaAppModeSelector;
