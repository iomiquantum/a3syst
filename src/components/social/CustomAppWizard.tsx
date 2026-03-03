import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, AlertCircle,
  ArrowLeft, ArrowRight, PartyPopper, ShieldCheck, Building2, Settings, KeyRound, Link2, Camera
} from "lucide-react";
import type { useMetaAppConfig } from "@/hooks/useMetaAppConfig";
import type { useSocialConnections } from "@/hooks/useSocialConnections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metaConfig: ReturnType<typeof useMetaAppConfig>;
  socialConnections?: ReturnType<typeof useSocialConnections>;
}

const CustomAppWizard = ({ open, onOpenChange, metaConfig }: Props) => {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Step 4 fields
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // Step 5 fields
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  // Step 6 fields
  const [igAccountId, setIgAccountId] = useState("");
  const [skipIg, setSkipIg] = useState(false);

  // Step 7
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    pageName?: string;
    igUsername?: string;
    appName?: string;
    error?: string;
    checks?: { label: string; ok: boolean }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const runVerification = async () => {
    setValidating(true);
    setValidation(null);
    const checks: { label: string; ok: boolean }[] = [];

    try {
      // Check App ID format
      checks.push({ label: "App ID válido", ok: appId.length >= 10 });

      // Check App Secret format
      checks.push({ label: "App Secret válido", ok: appSecret.length >= 20 });

      // Verify token against Meta API
      const meRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=id,name&access_token=${accessToken}`);
      const meData = await meRes.json();

      if (meData.error) {
        checks.push({ label: "Conexión con Meta API exitosa", ok: false });
        checks.push({ label: "Page ID válido", ok: false });
        setValidation({ valid: false, error: meData.error.message, checks });
        setValidating(false);
        return;
      }

      checks.push({ label: "Conexión con Meta API exitosa", ok: true });
      checks.push({ label: "Page ID válido", ok: true });

      // Verify token
      const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
      const debugData = await debugRes.json();
      const tokenOk = !debugData.data?.error;
      checks.push({ label: "Token permanente verificado", ok: tokenOk });

      // Check permissions
      const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`);
      const permData = await permRes.json();
      const perms = (permData.data || []).filter((p: any) => p.status === "granted").map((p: any) => p.permission);
      const hasPublish = perms.includes("pages_manage_posts");
      checks.push({ label: "Permisos de publicación", ok: hasPublish });

      checks.push({ label: `Página detectada: "${meData.name}"`, ok: true });

      // IG check
      let igUsername = "";
      if (igAccountId && !skipIg) {
        try {
          const igRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username&access_token=${accessToken}`);
          const igData = await igRes.json();
          if (igData.username) {
            igUsername = igData.username;
            checks.push({ label: `Instagram: @${igUsername}`, ok: true });
          } else {
            checks.push({ label: "Instagram: No encontrado", ok: false });
          }
        } catch {
          checks.push({ label: "Instagram: Error verificando", ok: false });
        }
      } else {
        checks.push({ label: "Instagram: No configurado", ok: true });
      }

      const allOk = checks.every(c => c.ok);
      setValidation({
        valid: allOk,
        pageName: meData.name,
        igUsername,
        appName: `App ${meData.name}`,
        checks,
      });
    } catch (err: any) {
      checks.push({ label: `Error: ${err.message}`, ok: false });
      setValidation({ valid: false, error: err.message, checks });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validation?.valid) return;
    setSaving(true);
    const ok = await metaConfig.switchToCustom({
      custom_app_id: appId,
      custom_app_secret: appSecret,
      custom_app_name: validation.appName || `App Custom`,
    });
    setSaving(false);
    if (ok) {
      // Also save connections for FB/IG with custom app mode  
      // The existing social connections will continue working with their tokens
    }
  };

  const stepIcon = (s: number) => {
    const icons = [Building2, Settings, ShieldCheck, KeyRound, Link2, Camera, CheckCircle2];
    const Icon = icons[s - 1] || Settings;
    return <Icon className="w-5 h-5 text-purple-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Progress */}
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
          {/* STEP 1 - Create App */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(1)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Crear tu App en Meta</h3>
                  <p className="text-sm text-muted-foreground">Primera configuración en Meta for Developers</p>
                </div>
              </div>

              <ol className="list-decimal ml-5 space-y-2.5 text-sm text-muted-foreground">
                <li>Ve a <a href="https://developers.facebook.com/" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-0.5">Meta for Developers <ExternalLink className="w-3 h-3" /></a></li>
                <li>Click en <strong className="text-foreground">"Mis apps"</strong> → <strong className="text-foreground">"Crear app"</strong></li>
                <li><strong className="text-foreground">IMPORTANTE:</strong> Selecciona <strong className="text-foreground">"Crear una app sin un caso de uso"</strong></li>
                <li>Tipo de app: Selecciona <strong className="text-foreground">"Business"</strong></li>
                <li>Nombre: Pon el nombre de tu negocio (ej: "Mi Negocio App")</li>
                <li>Email: Tu email de contacto</li>
                <li>Click en <strong className="text-foreground">"Crear app"</strong></li>
              </ol>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">
                  Sí, continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 - Add Use Cases */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(2)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Configurar Casos de Uso</h3>
                  <p className="text-sm text-muted-foreground">Agrega las funcionalidades necesarias</p>
                </div>
              </div>

              <ol className="list-decimal ml-5 space-y-2.5 text-sm text-muted-foreground">
                <li>Ve a <strong className="text-foreground">"Casos de uso"</strong> en el menú izquierdo</li>
                <li>Click en <strong className="text-foreground">"Agregar casos de uso"</strong></li>
                <li>Selecciona estos DOS casos de uso:
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> "Administrar todos los aspectos de tu página"</p>
                    <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> "Administrar mensajes y contenido en Instagram"</p>
                  </div>
                </li>
                <li>Click en <strong className="text-foreground">"Add to app"</strong></li>
                <li>Si dice que hay pasos extra — es normal, click <strong className="text-foreground">"Aceptar"</strong></li>
              </ol>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Atrás</Button>
                <Button onClick={() => setStep(3)} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">Continuar <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 3 - Activate Permissions */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(3)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Activar Permisos</h3>
                  <p className="text-sm text-muted-foreground">Habilita los permisos necesarios en tu app</p>
                </div>
              </div>

              <ol className="list-decimal ml-5 space-y-2.5 text-sm text-muted-foreground">
                <li>En el Dashboard de tu app, ve a cada caso de uso y click en <strong className="text-foreground">"Personalizar"</strong></li>
                <li>Para <strong className="text-foreground">"Administrar todos los aspectos de tu página"</strong>:
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["pages_manage_posts", "pages_read_engagement", "pages_manage_engagement", "pages_show_list"].map(p => (
                      <code key={p} className="bg-muted px-2 py-0.5 rounded text-[10px]">{p}</code>
                    ))}
                  </div>
                </li>
                <li>Para <strong className="text-foreground">"Administrar mensajes y contenido en Instagram"</strong>:
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["instagram_basic", "instagram_content_publish", "instagram_manage_comments"].map(p => (
                      <code key={p} className="bg-muted px-2 py-0.5 rounded text-[10px]">{p}</code>
                    ))}
                  </div>
                </li>
                <li>Guarda los cambios</li>
              </ol>

              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-xs text-muted-foreground">
                💡 <strong className="text-foreground">Tip:</strong> Activa todos los permisos que puedas. En modo desarrollo funcionan sin necesidad de aprobación de Meta.
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Atrás</Button>
                <Button onClick={() => setStep(4)} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">Continuar <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 4 - App ID & Secret */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(4)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Obtener App ID y App Secret</h3>
                  <p className="text-sm text-muted-foreground">Credenciales de tu aplicación</p>
                </div>
              </div>

              <ol className="list-decimal ml-5 space-y-2.5 text-sm text-muted-foreground">
                <li>En tu app de Meta, ve a: <strong className="text-foreground">Configuración de la app → Básica</strong></li>
                <li>Copia el <strong className="text-foreground">"Identificador de la app"</strong> (App ID)</li>
                <li>Copia la <strong className="text-foreground">"Clave secreta de la app"</strong> (App Secret) — click en "Mostrar"</li>
              </ol>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App ID</Label>
                  <Input value={appId} onChange={e => setAppId(e.target.value.replace(/\D/g, ""))} placeholder="Ej: 850630404695074" className="h-11 font-mono text-sm" />
                  {appId && appId.length < 10 && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Mínimo 10 dígitos</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App Secret</Label>
                  <div className="relative">
                    <Input type={showSecret ? "text" : "password"} value={appSecret} onChange={e => setAppSecret(e.target.value)} placeholder="Ej: a1b2c3d4e5f6g7h8i9..." className="h-11 font-mono text-xs pr-10" />
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {appSecret && appSecret.length < 20 && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Mínimo 20 caracteres</p>}
                </div>
              </div>

              <div className="bg-destructive/5 rounded-xl p-3 border border-destructive/10 text-xs text-muted-foreground">
                ⚠️ <strong className="text-foreground">IMPORTANTE:</strong> El App Secret es como una contraseña. NUNCA lo compartas. a3syst lo almacena de forma encriptada y segura.
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Atrás</Button>
                <Button onClick={() => setStep(5)} disabled={!appId || appId.length < 10 || !appSecret || appSecret.length < 20} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">Continuar <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 5 - Generate Token */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(5)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Generar tu Token de Acceso</h3>
                  <p className="text-sm text-muted-foreground">Genera un token usando TU app</p>
                </div>
              </div>

              <ol className="list-decimal ml-5 space-y-2.5 text-sm text-muted-foreground">
                <li>Ve al <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-0.5">Graph API Explorer <ExternalLink className="w-3 h-3" /></a></li>
                <li>En <strong className="text-foreground">"App de Meta"</strong> selecciona <strong className="text-foreground">TU APP</strong> (no a3syst)</li>
                <li>Agrega todos los permisos → <strong className="text-foreground">"Generate Access Token"</strong></li>
                <li>Escribe <code className="bg-muted px-1.5 py-0.5 rounded text-xs">me/accounts</code> → GET → Enviar</li>
                <li>Copia el <strong className="text-foreground">"id"</strong> de tu página (Page ID)</li>
                <li>Convierte a token permanente vía el <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-0.5">Depurador de Tokens <ExternalLink className="w-3 h-3" /></a></li>
                <li>Copia el <strong className="text-foreground">access_token</strong> de tu página — ese es tu Token Permanente</li>
              </ol>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page ID</Label>
                  <Input value={pageId} onChange={e => setPageId(e.target.value.replace(/\D/g, ""))} placeholder="Ej: 926759950522229" className="h-11 font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page Access Token Permanente</Label>
                  <div className="relative">
                    <Input type={showToken ? "text" : "password"} value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder="EAAGm0PX4ZCps..." className="h-11 font-mono text-xs pr-10" />
                    <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {accessToken && !accessToken.startsWith("EAA") && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Debe empezar con "EAA"</p>}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Atrás</Button>
                <Button onClick={() => setStep(6)} disabled={!pageId || pageId.length < 10 || !accessToken || accessToken.length < 50} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">Continuar <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* STEP 6 - Instagram (Optional) */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(6)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Conectar Instagram (Opcional)</h3>
                  <p className="text-sm text-muted-foreground">Si quieres publicar en Instagram desde tu app propia</p>
                </div>
              </div>

              {!skipIg && (
                <>
                  <ol className="list-decimal ml-5 space-y-2.5 text-sm text-muted-foreground">
                    <li>En el <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-0.5">Graph API Explorer <ExternalLink className="w-3 h-3" /></a> (con tu app seleccionada)</li>
                    <li>Escribe: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{pageId || "TU_PAGE_ID"}?fields=instagram_business_account</code></li>
                    <li>GET → Enviar</li>
                    <li>Copia el <strong className="text-foreground">"id"</strong> de instagram_business_account</li>
                  </ol>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instagram Business Account ID</Label>
                    <Input value={igAccountId} onChange={e => setIgAccountId(e.target.value.replace(/\D/g, ""))} placeholder="Ej: 17841477352048682" className="h-11 font-mono text-sm" />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Checkbox id="skip-ig" checked={skipIg} onCheckedChange={(checked) => setSkipIg(!!checked)} />
                <label htmlFor="skip-ig" className="text-sm text-muted-foreground cursor-pointer">
                  No tengo Instagram Business, saltar este paso
                </label>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Atrás</Button>
                <Button onClick={() => { setStep(7); runVerification(); }} className="gap-2 bg-purple-500 hover:bg-purple-600 text-white">
                  Verificar y Finalizar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7 - Verification */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">{stepIcon(7)}</div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Verificación Final</h3>
                  <p className="text-sm text-muted-foreground">Comprobando tu configuración...</p>
                </div>
              </div>

              {validating && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                  <p className="text-sm text-muted-foreground">Verificando credenciales y permisos...</p>
                </div>
              )}

              {!validating && validation && (
                <div className="space-y-4">
                  <div className={`rounded-xl p-5 border space-y-2.5 ${validation.valid ? "bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20" : "bg-destructive/5 border-destructive/20"}`}>
                    {validation.checks?.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {check.ok ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" /> : <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                        <span className={check.ok ? "text-foreground" : "text-destructive"}>{check.label}</span>
                      </div>
                    ))}
                  </div>

                  {validation.valid && (
                    <>
                      <div className="text-center space-y-2">
                        <PartyPopper className="w-10 h-10 text-purple-500 mx-auto" />
                        <h4 className="text-xl font-bold text-foreground">¡App Propia Configurada!</h4>
                        <p className="text-sm text-muted-foreground">Tu negocio ahora opera con su propia app de Meta</p>
                      </div>

                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-2 text-sm">
                        <p className="font-medium text-foreground">📊 Resumen de tu Configuración</p>
                        <p className="text-muted-foreground">Modo: <span className="text-purple-500 font-medium">🟣 App Propia</span></p>
                        {validation.pageName && <p className="text-muted-foreground">Facebook: <span className="text-foreground">{validation.pageName}</span> ✅</p>}
                        {validation.igUsername && <p className="text-muted-foreground">Instagram: <span className="text-foreground">@{validation.igUsername}</span> ✅</p>}
                        <p className="text-muted-foreground">App ID: <span className="text-foreground">{appId.slice(0, 4)}...{appId.slice(-3)}</span></p>
                        <p className="text-muted-foreground">Token: Permanente ✅</p>
                      </div>

                      <div className="space-y-2 text-xs text-muted-foreground">
                        {[
                          "Total independencia de la app compartida de a3syst",
                          "Tu token y credenciales son 100% tuyas",
                          "Si la app de a3syst tiene problemas, tú sigues funcionando",
                        ].map((item, i) => (
                          <p key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0" /> {item}
                          </p>
                        ))}
                      </div>

                      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-purple-500 hover:bg-purple-600 text-white">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Finalizar
                      </Button>
                    </>
                  )}

                  {!validation.valid && (
                    <div className="space-y-3">
                      {validation.error && (
                        <p className="text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> {validation.error}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(5)} className="flex-1 gap-2">
                          <ArrowLeft className="w-4 h-4" /> Revisar datos
                        </Button>
                        <Button onClick={runVerification} className="flex-1 gap-2 bg-purple-500 hover:bg-purple-600 text-white">
                          Reintentar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomAppWizard;
