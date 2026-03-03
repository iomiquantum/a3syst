import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ArrowRight, PartyPopper, ShieldCheck, Link2 } from "lucide-react";
import type { useSocialConnections } from "@/hooks/useSocialConnections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  social: ReturnType<typeof useSocialConnections>;
  onConnectInstagram?: () => void;
}

const FacebookWizard = ({ open, onOpenChange, social, onConnectInstagram }: Props) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    pageName?: string;
    permissions?: string[];
    tokenType?: string;
    expires?: string;
    igLinked?: boolean;
    igUsername?: string;
    error?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const validateConnection = async () => {
    if (!pageId || !accessToken) return;
    setValidating(true);
    setValidation(null);

    try {
      // 1. Check token validity
      const meRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=id,name,access_token&access_token=${accessToken}`);
      const meData = await meRes.json();

      if (meData.error) {
        setValidation({ valid: false, error: meData.error.message });
        setValidating(false);
        return;
      }

      // 2. Check permissions
      const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`);
      const permData = await permRes.json();
      const grantedPerms = (permData.data || [])
        .filter((p: any) => p.status === "granted")
        .map((p: any) => p.permission);

      // 3. Check token debug info
      const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
      const debugData = await debugRes.json();
      const tokenData = debugData.data || {};

      // 4. Check IG link
      const igRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${accessToken}`);
      const igData = await igRes.json();

      setValidation({
        valid: true,
        pageName: meData.name,
        permissions: grantedPerms,
        tokenType: tokenData.type || "Unknown",
        expires: tokenData.expires_at === 0 ? "Nunca" : new Date(tokenData.expires_at * 1000).toLocaleDateString(),
        igLinked: !!igData.instagram_business_account,
        igUsername: igData.instagram_business_account?.username,
      });
    } catch (err: any) {
      setValidation({ valid: false, error: err.message });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validation?.valid) return;
    setSaving(true);
    const ok = await social.saveConnection({
      platform: "facebook",
      platform_name: validation.pageName || "Facebook Page",
      platform_account_id: pageId,
      access_token: accessToken,
      metadata: {
        permissions: validation.permissions,
        token_type: validation.tokenType,
        expires: validation.expires,
        ig_linked: validation.igLinked,
        ig_username: validation.igUsername,
      },
    });
    setSaving(false);
    if (ok) setStep(5);
  };

  const requiredPerms = ["pages_manage_posts", "pages_read_engagement"];
  const optionalPerms = ["instagram_basic", "instagram_content_publish"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Progress bar */}
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
                <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Requisitos Previos</h3>
                  <p className="text-sm text-muted-foreground">Antes de empezar, verifica lo siguiente</p>
                </div>
              </div>

              <div className="space-y-3 bg-muted/30 rounded-xl p-5 border border-border/50">
                {[
                  "Ser administrador de la Página de Facebook de tu negocio",
                  "Tener una cuenta en Meta for Developers (es gratis)",
                  "Tu página debe ser una 'Página de Facebook para empresas'",
                ].map((req, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{req}</p>
                  </div>
                ))}
              </div>

              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">⏱️ Tiempo estimado:</span> 10-15 minutos (solo la primera vez)
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  💡 Una vez configurado, no necesitas repetir estos pasos
                </p>
              </div>

              <a href="https://developers.facebook.com" target="_blank" rel="noopener"
                className="text-sm text-primary hover:underline flex items-center gap-1">
                ¿No tienes cuenta en Meta for Developers? Créala aquí <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} className="gap-2 gradient-primary text-primary-foreground">
                  Tengo todo listo, continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 - Get Page ID */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Obtener el Page ID</h3>
                  <p className="text-sm text-muted-foreground">Sigue estos pasos en el Graph API Explorer</p>
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
                  <li>En <strong className="text-foreground">"App de Meta"</strong> selecciona: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">a3syst</code></li>
                  <li>
                    Agrega estos permisos con <strong className="text-foreground">"Agregar un permiso"</strong>:
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {["pages_manage_posts", "pages_read_engagement", "pages_show_list", "instagram_basic", "instagram_content_publish"].map(p => (
                        <code key={p} className="bg-muted px-2 py-0.5 rounded text-[10px]">{p}</code>
                      ))}
                    </div>
                  </li>
                  <li>Click en <strong className="text-foreground">"Generate Access Token"</strong> y autoriza todas las páginas</li>
                  <li>En la barra de consulta escribe: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">me/accounts</code> → GET → <strong className="text-foreground">Enviar</strong></li>
                  <li>Busca tu página en la respuesta y copia el campo <strong className="text-foreground">"id"</strong></li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page ID</Label>
                <Input
                  value={pageId}
                  onChange={e => setPageId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 926759950522229"
                  className="h-11 font-mono text-sm"
                />
                {pageId && pageId.length < 10 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> El Page ID debe tener al menos 10 dígitos
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </Button>
                <Button onClick={() => setStep(3)} disabled={!pageId || pageId.length < 10} className="gap-2 gradient-primary text-primary-foreground">
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 - Get Permanent Token */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Generar Token Permanente</h3>
                  <p className="text-sm text-muted-foreground">Este es el paso más importante</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <ol className="list-decimal ml-5 space-y-2.5 text-muted-foreground">
                  <li>Copia el token del Graph API Explorer (el que generaste antes)</li>
                  <li>
                    Abre el{" "}
                    <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener"
                      className="text-primary hover:underline inline-flex items-center gap-0.5">
                      Access Token Debugger <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Pega el token y click en <strong className="text-foreground">"Depurar"</strong></li>
                  <li>Click en <strong className="text-foreground">"Ampliar token de acceso"</strong> → te dará un token de 60 días</li>
                  <li>Copia ese <strong className="text-foreground">NUEVO token largo</strong></li>
                  <li>Vuelve al Graph API Explorer → pega el token largo → escribe <code className="bg-muted px-1.5 py-0.5 rounded text-xs">me/accounts</code> → GET → Enviar</li>
                  <li>Busca tu página y copia el <strong className="text-foreground">"access_token"</strong> — este es tu <strong className="text-[hsl(var(--success))]">Token Permanente</strong></li>
                  <li>Verifica en el Debugger que diga <strong className="text-foreground">Tipo: Page</strong> y <strong className="text-foreground">Caducidad: Nunca</strong></li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page Access Token Permanente</Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    placeholder="EAAGm0PX4ZCps..."
                    className="h-11 font-mono text-xs pr-10"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {accessToken && !accessToken.startsWith("EAA") && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> El token debe empezar con "EAA"
                  </p>
                )}
                {accessToken && accessToken.length > 0 && accessToken.length < 100 && (
                  <p className="text-xs text-[hsl(var(--warning))] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> El token parece muy corto. Asegúrate de copiar el token completo
                  </p>
                )}
              </div>

              <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
                <p className="text-xs text-muted-foreground">
                  ⚠️ <strong className="text-foreground">IMPORTANTE:</strong> Guarda este token en un lugar seguro. No lo compartas con nadie. a3syst lo almacena de forma segura.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </Button>
                <Button onClick={() => { setStep(4); validateConnection(); }}
                  disabled={!accessToken || accessToken.length < 50 || !accessToken.startsWith("EAA")}
                  className="gap-2 gradient-primary text-primary-foreground">
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 - Verification */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Verificación</h3>
                  <p className="text-sm text-muted-foreground">Comprobando tu conexión...</p>
                </div>
              </div>

              {validating && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#1877F2]" />
                  <p className="text-sm text-muted-foreground">Verificando token y permisos...</p>
                </div>
              )}

              {!validating && validation?.valid && (
                <div className="space-y-3">
                  <div className="bg-[hsl(var(--success))]/5 rounded-xl p-5 border border-[hsl(var(--success))]/20 space-y-2.5">
                    {[
                      { label: "Page ID válido", ok: true },
                      { label: "Token válido y activo", ok: true },
                      ...requiredPerms.map(p => ({
                        label: `Permiso: ${p}`,
                        ok: validation.permissions?.includes(p),
                      })),
                      { label: `Nombre de la página: "${validation.pageName}"`, ok: true },
                      { label: `Token permanente (expira: ${validation.expires})`, ok: validation.expires === "Nunca" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {item.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span className={item.ok ? "text-foreground" : "text-destructive"}>{item.label}</span>
                      </div>
                    ))}
                    {validation.igLinked && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                        <span className="text-foreground">Instagram vinculado: @{validation.igUsername}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Atrás
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary text-primary-foreground">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Guardar Conexión
                    </Button>
                  </div>
                </div>
              )}

              {!validating && validation && !validation.valid && (
                <div className="space-y-4">
                  <div className="bg-destructive/5 rounded-xl p-5 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <p className="font-bold text-destructive">Error de verificación</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{validation.error}</p>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Errores comunes:</p>
                      <p>• "Token inválido" → Verifica que copiaste el token completo</p>
                      <p>• "Permisos insuficientes" → Regenera el token con todos los permisos</p>
                      <p>• "Page ID no encontrado" → Verifica que el ID sea correcto</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Atrás
                    </Button>
                    <Button onClick={validateConnection} className="gap-2">
                      <Loader2 className="w-4 h-4" /> Reintentar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 - Done! */}
          {step === 5 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mx-auto">
                <PartyPopper className="w-8 h-8 text-[hsl(var(--success))]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">¡Facebook Conectado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu página "{validation?.pageName}" está lista para publicar desde a3syst.
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl p-5 text-left space-y-2.5">
                <p className="text-sm font-medium text-foreground">¿Qué puedes hacer ahora?</p>
                {[
                  "Publicar texto en tu página desde a3syst",
                  "Publicar imágenes con texto",
                  "Programar publicaciones para después",
                  "Ver métricas de tus publicaciones",
                ].map((item, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" /> {item}
                  </p>
                ))}
              </div>

              {validation?.igLinked && (
                <div className="bg-gradient-to-r from-purple-500/5 to-orange-500/5 rounded-xl p-5 border border-purple-500/10">
                  <p className="text-sm font-medium text-foreground mb-2">¿Quieres conectar Instagram ahora?</p>
                  <p className="text-xs text-muted-foreground mb-3">Tu página ya tiene Instagram vinculado (@{validation.igUsername})</p>
                  <Button variant="outline" onClick={() => { onOpenChange(false); onConnectInstagram?.(); }} className="gap-2">
                    Conectar Instagram <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

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

export default FacebookWizard;
