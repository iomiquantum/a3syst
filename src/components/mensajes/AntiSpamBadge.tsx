import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  consecutiveReadNoReply: number;
  spamProtectionTriggered: boolean;
  spamJumpedFromS: number | null;
  variant?: "badge" | "banner";
}

const AntiSpamBadge = ({ consecutiveReadNoReply, spamProtectionTriggered, spamJumpedFromS, variant = "badge" }: Props) => {
  // Full banner for chat header when protection was triggered
  if (variant === "banner" && spamProtectionTriggered && spamJumpedFromS) {
    const fromStart = Math.max(spamJumpedFromS - 3, 1);
    return (
      <div className="mx-4 my-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Protección anti-spam activada
          </p>
        </div>
        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
          Este cliente leyó 4 mensajes de seguimiento consecutivos (S{fromStart} a S{spamJumpedFromS}) sin responder.
          El seguimiento automático se pausó para proteger la calificación del número de WhatsApp.
        </p>
        <p className="text-[10px] text-amber-500 dark:text-amber-500 italic">
          Recomendación: envía un mensaje personalizado o espera unos días antes de contactar.
        </p>
      </div>
    );
  }

  // Badge for S9 protection triggered
  if (spamProtectionTriggered && spamJumpedFromS) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded leading-none">
        <ShieldAlert className="w-2.5 h-2.5" />
        Anti-spam desde S{spamJumpedFromS}
      </span>
    );
  }

  // Progressive warning badges
  if (consecutiveReadNoReply >= 3) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded leading-none">
        <AlertTriangle className="w-2.5 h-2.5" />
        Leyó {consecutiveReadNoReply} sin responder ⚠️
      </span>
    );
  }

  if (consecutiveReadNoReply >= 2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded leading-none">
        <AlertTriangle className="w-2.5 h-2.5" />
        Leyó {consecutiveReadNoReply} sin responder
      </span>
    );
  }

  return null;
};

export default AntiSpamBadge;
