import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ExternalLink, Loader2, AlertCircle, ArrowLeft, ArrowRight, PartyPopper, Link2 } from "lucide-react";
import type { useSocialConnections } from "@/hooks/useSocialConnections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  social: ReturnType<typeof useSocialConnections>;
}

const InstagramWizard = ({ open, onOpenChange, social }: Props) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const fb = social.fbConnection;

  const [igAccountId, setIgAccountId] = useState("");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    username?: string;
    error?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const validateIG = async () => {
    if (!igAccountId || !fb) return;
    setValidating(true);
    setValidation(null);

    try {
      // Verify the IG account ID is valid and linked to the FB page
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username,profile_picture_url,followers_count&access_token=${fb.access_token}`
      );
      const data = await res.json();

      if (data.error) {
        setValidation({ valid: false, error: data.error.message });
      } else {
        setValidation({
          valid: true,
          username: data.username,
        });
      }
    } catch (err: any) {
      setValidation({ valid: false, error: err.message });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validation?.valid || !fb) return;
    setSaving(true);
    const ok = await social.saveConnection({
      platform: "instagram",
      platform_name: `@${validation.username}`,
      platform_account_id: igAccountId,
      access_token: fb.access_token, // Uses same token as FB
      metadata: {
        username: validation.username,
        linked_facebook_page: fb.platform_name,
        linked_page_id: fb.platform_account_id,
      },
    });
    setSaving(false);
    if (ok) setStep(3);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paso {step} de {totalSteps}
            </p>
            <p className="text-xs text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</p>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-1.5" />
        </div>

        <div className="p-6 space-y-6">
          {/* STEP 1 - Requirements */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-orange-500/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Conectar Instagram Business</h3>
                  <p className="text-sm text-muted-foreground">Requisitos previos</p>
                </div>
              </div>

              <div className="space-y-3 bg-muted/30 rounded-xl p-5 border border-border/50">
                <div className="flex items-start gap-3">
                  {fb ? (
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm ${fb ? "text-foreground" : "text-destructive"}`}>
                      Facebook Page conectada en a3syst
                    </p>
                    {fb && <p className="text-xs text-muted-foreground">{fb.platform_name}</p>}
                    {!fb && <p className="text-xs text-destructive">Debes conectar Facebook primero</p>}
                  </div>
                </div>
                {[
                  "Cuenta de Instagram convertida a 'Business' o 'Creator'",
                  "Instagram vinculado a tu Facebook Page",
                ].map((req, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{req}</p>
                  </div>
                ))}
              </div>

              {!fb && (
                <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
                  <p className="text-sm text-muted-foreground">
                    Para conectar Instagram, primero necesitas conectar tu Facebook Page. Cierra este diálogo y conecta Facebook.
                  </p>
                </div>
              )}

              <div className="bg-muted/30 rounded-xl p-4 border border-border/50 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Si tu Instagram no está vinculado a tu Facebook Page:</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Ve a tu Facebook Page → Configuración → Instagram</li>
                  <li>Conecta tu cuenta de Instagram</li>
                </ol>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!fb} className="gap-2 gradient-primary text-primary-foreground">
                  Mi Instagram ya está vinculado <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 - Get IG Business ID */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-orange-500/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Obtener Instagram Business ID</h3>
                  <p className="text-sm text-muted-foreground">Un paso rápido en el Graph API Explorer</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <ol className="list-decimal ml-5 space-y-2.5 text-muted-foreground">
                  <li>
                    Ve al{" "}
                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener"
                      className="text-primary hover:underline inline-flex items-center gap-0.5">
                      Graph API Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    En la barra escribe:{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {fb?.platform_account_id || "TU_PAGE_ID"}?fields=instagram_business_account
                    </code>
                  </li>
                  <li>Método: <strong className="text-foreground">GET</strong> → <strong className="text-foreground">Enviar</strong></li>
                  <li>
                    Copia el <strong className="text-foreground">"id"</strong> que aparece dentro de <code className="bg-muted px-1.5 py-0.5 rounded text-xs">instagram_business_account</code>
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instagram Business Account ID</Label>
                <Input
                  value={igAccountId}
                  onChange={e => setIgAccountId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 17841477352048682"
                  className="h-11 font-mono text-sm"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </Button>
                <Button onClick={() => { validateIG(); }}
                  disabled={!igAccountId || igAccountId.length < 5 || validating}
                  className="gap-2 gradient-primary text-primary-foreground">
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Verificar y Guardar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Inline validation result */}
              {validation && !validating && (
                <div className="mt-4">
                  {validation.valid ? (
                    <div className="bg-[hsl(var(--success))]/5 rounded-xl p-5 border border-[hsl(var(--success))]/20 space-y-2.5">
                      {[
                        "Instagram Business ID válido",
                        `Conectado a Facebook Page: "${fb?.platform_name}"`,
                        `Nombre de usuario: @${validation.username}`,
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </div>
                      ))}
                      <Button onClick={handleSave} disabled={saving} className="mt-3 gap-2 gradient-primary text-primary-foreground w-full">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Guardar Conexión
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20">
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {validation.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 - Done! */}
          {step === 3 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-orange-500/10 flex items-center justify-center mx-auto">
                <PartyPopper className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">¡Instagram Conectado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  @{validation?.username} está lista para publicar desde a3syst.
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl p-5 text-left space-y-2.5">
                {[
                  "Publicar imágenes y videos en Instagram",
                  "Crear carousels de hasta 10 imágenes",
                  "Publicar Reels y Stories",
                  "Agregar primer comentario automático",
                ].map((item, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" /> {item}
                  </p>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Nota: Instagram requiere que las publicaciones incluyan al menos una imagen.
              </p>

              <Button onClick={() => onOpenChange(false)} className="gradient-primary text-primary-foreground">
                Finalizar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstagramWizard;
