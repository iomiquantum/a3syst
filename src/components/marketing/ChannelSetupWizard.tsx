import { useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Save, Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANNELS, type ChannelKey } from "@/hooks/useChannelCredentials";
import { supabase } from "@/integrations/supabase/client";

interface ChannelSetupWizardProps {
  channelKey: ChannelKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCredentials?: Record<string, string>;
  onSave: (channel: string, fields: Record<string, string>) => Promise<boolean>;
}

type ValidationState = "idle" | "validating" | "success" | "error";

const ChannelSetupWizard = ({ channelKey, open, onOpenChange, existingCredentials, onSave }: ChannelSetupWizardProps) => {
  const channel = CHANNELS.find(c => c.key === channelKey)!;
  // steps: guide steps + credential form + validation result
  const totalSteps = channel.steps.length + 2;
  const [currentStep, setCurrentStep] = useState(0);
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    channel.fields.forEach(f => { init[f.key] = existingCredentials?.[f.key] || ""; });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validationDetail, setValidationDetail] = useState("");

  const isCredentialStep = currentStep === channel.steps.length;
  const isValidationStep = currentStep === channel.steps.length + 1;

  const allRequiredFilled = channel.fields
    .filter(f => f.required)
    .every(f => fields[f.key]?.trim());

  const handleValidate = async () => {
    setValidationState("validating");
    setValidationDetail("");
    try {
      const res = await supabase.functions.invoke("validate-channel", {
        body: { channel: channelKey, credentials: fields },
      });
      const data = res.data as { valid: boolean; detail: string } | null;
      if (data?.valid) {
        setValidationState("success");
        setValidationDetail(data.detail);
      } else {
        setValidationState("error");
        setValidationDetail(data?.detail || res.error?.message || "Error desconocido");
      }
    } catch (e: any) {
      setValidationState("error");
      setValidationDetail(`Error de conexión: ${e.message}`);
    }
  };

  const handleGoToValidation = () => {
    setCurrentStep(channel.steps.length + 1);
    // Auto-trigger validation
    setTimeout(() => handleValidate(), 100);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(channelKey, fields);
    setSaving(false);
    if (ok) {
      setCurrentStep(0);
      setValidationState("idle");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setValidationState("idle");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{channel.icon}</span>
            Configurar {channel.label}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          Paso {currentStep + 1} de {totalSteps}
          {isValidationStep && " — Verificación"}
        </div>

        {/* Guide steps */}
        {!isCredentialStep && !isValidationStep && (
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0 bg-primary/10 text-primary border-primary/20">
                  {currentStep + 1}
                </Badge>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{channel.steps[currentStep].title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {channel.steps[currentStep].description}
                  </p>
                  {"link" in channel.steps[currentStep] && (channel.steps[currentStep] as any).link && (
                    <a
                      href={(channel.steps[currentStep] as any).link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir enlace
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credential form */}
        {isCredentialStep && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa las credenciales que obtuviste en los pasos anteriores. En el siguiente paso verificaremos que funcionen correctamente.
            </p>
            {channel.fields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-sm">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={f.type === "password" && !showPasswords[f.key] ? "password" : "text"}
                    placeholder={f.placeholder}
                    value={fields[f.key]}
                    onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                  {f.type === "password" && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPasswords(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    >
                      {showPasswords[f.key] ? "Ocultar" : "Mostrar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Validation step */}
        {isValidationStep && (
          <div className="space-y-4">
            <Card className={`border-0 shadow-none ${
              validationState === "success" ? "bg-[hsl(var(--success))]/5" :
              validationState === "error" ? "bg-destructive/5" :
              "bg-muted/30"
            }`}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                {validationState === "validating" && (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground">Verificando credenciales...</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Conectando con la API de {channel.label} para validar tus credenciales.
                      </p>
                    </div>
                  </>
                )}
                {validationState === "success" && (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-[hsl(var(--success))]" />
                    <div>
                      <h3 className="font-semibold text-foreground">¡Credenciales válidas!</h3>
                      <p className="text-sm text-muted-foreground mt-1">{validationDetail}</p>
                    </div>
                  </>
                )}
                {validationState === "error" && (
                  <>
                    <XCircle className="w-12 h-12 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-foreground">Credenciales inválidas</h3>
                      <p className="text-sm text-destructive mt-1">{validationDetail}</p>
                      <p className="text-xs text-muted-foreground mt-3">
                        Revisa los datos ingresados y vuelve al paso anterior para corregirlos.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0 || validationState === "validating"}
            onClick={() => {
              if (isValidationStep) setValidationState("idle");
              setCurrentStep(s => s - 1);
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          {isCredentialStep ? (
            <Button
              size="sm"
              disabled={!allRequiredFilled}
              onClick={handleGoToValidation}
            >
              <ShieldCheck className="w-4 h-4 mr-1" />
              Verificar credenciales
            </Button>
          ) : isValidationStep ? (
            <div className="flex gap-2">
              {validationState === "error" && (
                <Button variant="outline" size="sm" onClick={handleValidate}>
                  Reintentar
                </Button>
              )}
              {validationState === "success" && (
                <Button size="sm" disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Guardar credenciales
                </Button>
              )}
              {validationState === "error" && (
                <Button variant="ghost" size="sm" disabled={saving} onClick={handleSave}>
                  Guardar sin verificar
                </Button>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={() => setCurrentStep(s => s + 1)}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelSetupWizard;
