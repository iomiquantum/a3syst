import { useState } from "react";
import {
  Check, ChevronDown, ExternalLink, HelpCircle, MessageCircleQuestion,
  Smartphone, Phone, DollarSign, Shield, Zap, Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/* ─── Support WhatsApp number ─── */
const SUPPORT_WHATSAPP = "https://wa.me/5215512345678?text=Hola%2C%20quiero%20configurar%20mi%20WhatsApp%20Business%20con%20a3syst";

/* ─── Prerequisites checklist ─── */
const CHECKLIST_ITEMS = [
  {
    title: "WhatsApp Business App instalada",
    description:
      "Necesitas la app de WhatsApp Business (no WhatsApp normal) instalada en tu celular con tu número de negocio activo.",
    example: "📱 Descárgala gratis en App Store o Google Play buscando 'WhatsApp Business'",
  },
  {
    title: "Cuenta de Facebook Business",
    description:
      "Necesitas una cuenta de Facebook personal Y un Portfolio Comercial (antes llamado Facebook Business Manager) asociado a tu negocio.",
    example:
      "💡 Si tienes una página de Facebook para tu negocio, probablemente ya tienes esto. Ve a business.facebook.com para verificarlo.",
    link: { label: "¿Cómo crear un Portfolio Comercial? →", href: "https://business.facebook.com" },
  },
  {
    title: "Número de WhatsApp activo hace más de 7 días",
    description:
      "Tu número debe haber estado activo en WhatsApp Business por al menos 7 días antes de poder conectarlo a la API.",
    example: "✅ Si ya usas WhatsApp Business normalmente, esto ya está listo.",
  },
  {
    title: "Número no conectado a otra plataforma",
    description:
      "Si tu número ya está conectado a ManyChat, Respond.io u otra plataforma similar, primero debes desconectarlo de ahí.",
    example: "🔄 Si solo usas WhatsApp Business normal en tu celular, esto no aplica para ti.",
  },
];

/* ─── Messaging pricing (with markup) ─── */
const PRICING_TABLE = [
  { region: "México", marketing: "$0.065 USD", utility: "$0.030 USD", service: "$0.020 USD", auth: "$0.025 USD" },
  { region: "Colombia", marketing: "$0.020 USD", utility: "$0.012 USD", service: "$0.008 USD", auth: "$0.015 USD" },
  { region: "Argentina", marketing: "$0.055 USD", utility: "$0.028 USD", service: "$0.018 USD", auth: "$0.020 USD" },
  { region: "España", marketing: "$0.075 USD", utility: "$0.040 USD", service: "$0.025 USD", auth: "$0.035 USD" },
  { region: "EE.UU. / Canadá", marketing: "$0.035 USD", utility: "$0.020 USD", service: "$0.015 USD", auth: "$0.020 USD" },
  { region: "Resto LATAM", marketing: "$0.050 USD", utility: "$0.025 USD", service: "$0.015 USD", auth: "$0.020 USD" },
];

/* ─── Expandable checklist card ─── */
const ChecklistCard = ({
  item,
  checked,
  onToggle,
}: {
  item: (typeof CHECKLIST_ITEMS)[number];
  checked: boolean;
  onToggle: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-xl border transition-all overflow-hidden",
          checked ? "border-primary/50 bg-primary/5" : "border-border bg-card"
        )}
      >
        <div className="flex items-center gap-3 p-3.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
              checked ? "bg-primary" : "border border-border hover:border-primary/50"
            )}
          >
            {checked && <Check className="w-3 h-3 text-primary-foreground" />}
          </button>

          <span className={cn("text-sm flex-1 font-medium", checked ? "text-foreground" : "text-foreground/80")}>
            {item.title}
          </span>

          <CollapsibleTrigger asChild>
            <button className="p-1 rounded-md hover:bg-accent transition-colors">
              <ChevronDown
                className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
              />
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-3.5 pb-4 pt-0 space-y-2.5 ml-8">
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            <p className="text-xs text-muted-foreground/80 bg-muted/50 rounded-lg p-2.5 leading-relaxed">
              {item.example}
            </p>
            {item.link && (
              <a
                href={item.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {item.link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

/* ─── Floating help ─── */
const FloatingHelp = () => (
  <button
    onClick={() => window.open(SUPPORT_WHATSAPP, "_blank")}
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
  >
    <MessageCircleQuestion className="w-4 h-4" />
    ¿Tienes dudas?
  </button>
);

/* ═══════════════════════════════════════ */
/*              MAIN WIZARD               */
/* ═══════════════════════════════════════ */
const WhatsAppWizard = () => {
  const [checks, setChecks] = useState([false, false, false, false]);
  const [selectedOption, setSelectedOption] = useState<"app" | "messaging" | null>(null);

  const toggleCheck = (i: number) => setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const allChecked = checks.every(Boolean);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* ─── Header ─── */}
      <div className="text-center space-y-3">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-[#25d366]/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-[#25d366]/25 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute inset-3 rounded-full bg-[#25d366] flex items-center justify-center shadow-lg shadow-[#25d366]/30">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Conecta tu WhatsApp Business</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Elige cómo quieres conectar tu número de WhatsApp Business a a3syst
          </p>
        </div>
      </div>

      {/* ─── Prerequisites ─── */}
      <Card>
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Requisitos previos</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sin importar la opción que elijas, primero verifica que cumples con estos requisitos:
          </p>

          <div className="space-y-2.5">
            {CHECKLIST_ITEMS.map((item, i) => (
              <ChecklistCard key={i} item={item} checked={checks[i]} onToggle={() => toggleCheck(i)} />
            ))}
          </div>

          {!allChecked && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Marca todos los requisitos para ver las opciones de conexión
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Options (only show when all checked) ─── */}
      {allChecked && !selectedOption && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground text-center">Elige tu método de conexión</h3>

          {/* Option 1: Own Meta App */}
          <Card
            className="cursor-pointer border-2 border-border hover:border-primary/50 transition-all"
            onClick={() => setSelectedOption("app")}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-foreground">Opción 1: Conexión con tu propia App de Meta</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Nuestro equipo te ayuda a configurar tu propia aplicación de Meta para conectar WhatsApp Business API.
                    Tú eres dueño de la app y tienes control total.
                  </p>
                </div>
              </div>

              <div className="ml-16 space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Sin costo por mensaje — pagas directamente a Meta</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Control total de tu app y datos</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Implementación asistida por nuestro equipo</span>
                </div>
              </div>

              <div className="ml-16 p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
                <p className="text-sm font-semibold text-foreground">💰 Costo de implementación:</p>
                <p className="text-sm text-muted-foreground">
                  • <strong className="text-foreground">Gratis</strong> si tienes contratado el plan de 6 meses
                </p>
                <p className="text-sm text-muted-foreground">
                  • <strong className="text-foreground">$97 USD</strong> pago único si no tienes plan semestral
                </p>
              </div>

              <div className="ml-16">
                <Button className="bg-[#25d366] hover:bg-[#25d366]/90 text-white">
                  Elegir esta opción →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Managed Messaging */}
          <Card
            className="cursor-pointer border-2 border-border hover:border-primary/50 transition-all"
            onClick={() => setSelectedOption("messaging")}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#25d366]/10 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-[#25d366]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-foreground">Opción 2: Servicio de Mensajería Administrado</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Nosotros nos encargamos de toda la infraestructura técnica. Solo conectas tu número y empiezas a enviar
                    mensajes. Costo por mensaje enviado/recibido.
                  </p>
                </div>
              </div>

              <div className="ml-16 space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Configuración inmediata — sin esperas</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">No necesitas crear ninguna app en Meta</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#25d366] shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Soporte técnico incluido</span>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Costo por mensaje (ver tarifas abajo)</span>
                </div>
              </div>

              <div className="ml-16">
                <Button variant="outline" className="border-[#25d366]/30 text-foreground hover:bg-[#25d366]/5">
                  Ver tarifas y elegir →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Option 1 Detail: Meta App ─── */}
      {selectedOption === "app" && (
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <Smartphone className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-xl font-bold text-foreground">Conexión con tu propia App de Meta</h3>
              <p className="text-sm text-muted-foreground">
                Nuestro equipo de soporte te guiará paso a paso en la configuración
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <h4 className="font-semibold text-foreground text-sm">📋 Lo que haremos juntos:</h4>
                <ol className="space-y-2">
                  {[
                    "Crear tu Meta App en el Portal de Desarrolladores",
                    "Configurar los permisos de WhatsApp Business API",
                    "Vincular tu número de WhatsApp Business",
                    "Verificar tu negocio en Meta Business Suite",
                    "Conectar tu app con a3syst",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {text}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <p className="text-sm font-semibold text-foreground">💰 Inversión:</p>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    ✅ <strong className="text-foreground">Incluido sin costo</strong> con el plan semestral (6 meses)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    💳 <strong className="text-foreground">$97 USD</strong> pago único si no tienes plan semestral
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ⏱️ El proceso de configuración toma aproximadamente 24-48 horas hábiles después de contactar a soporte.
                  Los costos de mensajería los pagas directamente a Meta según sus tarifas oficiales.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <Button
                onClick={() => window.open(SUPPORT_WHATSAPP, "_blank")}
                className="w-full bg-[#25d366] hover:bg-[#25d366]/90 text-white"
                size="lg"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contactar soporte por WhatsApp
              </Button>
              <Button variant="ghost" onClick={() => setSelectedOption(null)} className="text-muted-foreground">
                ← Volver a las opciones
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Option 2 Detail: Managed Messaging with pricing ─── */}
      {selectedOption === "messaging" && (
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <Zap className="w-12 h-12 text-[#25d366] mx-auto" />
              <h3 className="text-xl font-bold text-foreground">Servicio de Mensajería Administrado</h3>
              <p className="text-sm text-muted-foreground">
                Configuración rápida con costo por mensaje
              </p>
            </div>

            {/* Pricing table */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Tarifas por mensaje (por conversación de 24 hrs)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-semibold text-foreground">Región</th>
                      <th className="text-center p-3 font-semibold text-foreground">Marketing</th>
                      <th className="text-center p-3 font-semibold text-foreground">Utilidad</th>
                      <th className="text-center p-3 font-semibold text-foreground">Servicio</th>
                      <th className="text-center p-3 font-semibold text-foreground">Auth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_TABLE.map((row, i) => (
                      <tr key={i} className={cn("border-t border-border", i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                        <td className="p-3 font-medium text-foreground">{row.region}</td>
                        <td className="p-3 text-center text-muted-foreground">{row.marketing}</td>
                        <td className="p-3 text-center text-muted-foreground">{row.utility}</td>
                        <td className="p-3 text-center text-muted-foreground">{row.service}</td>
                        <td className="p-3 text-center text-muted-foreground">{row.auth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  💡 <strong className="text-foreground">Marketing:</strong> Mensajes promocionales, ofertas, recordatorios de cita.
                </p>
                <p>
                  🔧 <strong className="text-foreground">Utilidad:</strong> Confirmaciones de cita, actualizaciones de pedido.
                </p>
                <p>
                  💬 <strong className="text-foreground">Servicio:</strong> Respuestas al cliente dentro de ventana de 24 hrs.
                </p>
                <p>
                  🔐 <strong className="text-foreground">Auth:</strong> Códigos de verificación, OTP.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                Información importante
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Los costos se facturan mensualmente según uso</li>
                <li>• No hay mínimo de mensajes mensual</li>
                <li>• Incluye configuración y soporte técnico</li>
                <li>• Se requiere saldo mínimo de $10 USD para activar</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <Button
                onClick={() => window.open(SUPPORT_WHATSAPP, "_blank")}
                className="w-full bg-[#25d366] hover:bg-[#25d366]/90 text-white"
                size="lg"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contactar soporte para activar
              </Button>
              <Button variant="ghost" onClick={() => setSelectedOption(null)} className="text-muted-foreground">
                ← Volver a las opciones
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Help link ─── */}
      <div className="text-center">
        <button
          onClick={() => window.open(SUPPORT_WHATSAPP, "_blank")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          ¿Necesitas ayuda para decidir? Contáctanos
        </button>
      </div>

      <FloatingHelp />
    </div>
  );
};

export default WhatsAppWizard;
