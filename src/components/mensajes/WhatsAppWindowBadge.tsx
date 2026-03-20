import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  lastClientMessageAt: string | null | undefined;
  channel: string;
  isBlocked?: boolean;
  blockedReason?: string | null;
}

const WhatsAppWindowBadge = ({ lastClientMessageAt, channel, isBlocked, blockedReason }: Props) => {
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (channel !== "whatsapp" || !lastClientMessageAt) {
      setHoursRemaining(null);
      return;
    }

    const calc = () => {
      const elapsed = (Date.now() - new Date(lastClientMessageAt).getTime()) / (1000 * 60 * 60);
      return Math.max(0, 24 - elapsed);
    };

    setHoursRemaining(calc());
    const interval = setInterval(() => setHoursRemaining(calc()), 60000);
    return () => clearInterval(interval);
  }, [lastClientMessageAt, channel]);

  if (channel !== "whatsapp") return null;

  if (isBlocked) {
    const label = blockedReason?.includes("template_")
      ? "WA: template no aprobado"
      : "WA: envío bloqueado";

    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
        <AlertTriangle className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  }

  if (hoursRemaining === null || !lastClientMessageAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
        <Clock className="w-2.5 h-2.5" />
        WA: sin datos
      </span>
    );
  }

  if (hoursRemaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
        <AlertTriangle className="w-2.5 h-2.5" />
        WA: ventana cerrada
      </span>
    );
  }

  const hrs = Math.floor(hoursRemaining);
  const mins = Math.floor((hoursRemaining - hrs) * 60);
  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
      <CheckCircle2 className="w-2.5 h-2.5" />
      WA: ventana abierta ({label})
    </span>
  );
};

export default WhatsAppWindowBadge;
