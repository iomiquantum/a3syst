import { useState, useEffect, memo } from "react";
import { Clock, Timer, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  pipelineTab: string | null;
  seguimientoNextContactAt: string | null;
  seguimientoNextS: number | null;
  seguimientoRespondedAtS: number | null;
  seguimientoIsRecurrente: boolean | null;
  seguimientoRecurrenteCount: number | null;
  inactivityTimerStart: string | null;
  inactivityTimeoutMinutes?: number;
}

/** Shared 1-second tick for all countdowns to avoid N intervals */
let globalTick = 0;
let listeners: Set<() => void> = new Set();
let tickInterval: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!tickInterval) {
    tickInterval = setInterval(() => {
      globalTick++;
      listeners.forEach((fn) => fn());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };
}

function formatCountdown(targetIso: string): { label: string; expired: boolean; totalSeconds: number } {
  const remaining = (new Date(targetIso).getTime() - Date.now()) / 1000;
  if (remaining <= 0) {
    return remaining < -60
      ? { label: "Pendiente", expired: true, totalSeconds: remaining }
      : { label: "Procesando...", expired: true, totalSeconds: remaining };
  }
  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = Math.floor(remaining % 60);
  const label = hh > 0
    ? `${hh}h ${String(mm).padStart(2, "0")}m`
    : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return { label, expired: false, totalSeconds: remaining };
}

function formatInactivityCountdown(startIso: string, timeoutMin: number): { label: string; expired: boolean; totalSeconds: number } {
  const elapsed = (Date.now() - new Date(startIso).getTime()) / 1000;
  const remaining = timeoutMin * 60 - elapsed;
  if (remaining <= 0) {
    return remaining < -60
      ? { label: "Pendiente", expired: true, totalSeconds: remaining }
      : { label: "Procesando...", expired: true, totalSeconds: remaining };
  }
  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = Math.floor(remaining % 60);
  const label = hh > 0
    ? `${hh}h ${String(mm).padStart(2, "0")}m`
    : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return { label, expired: false, totalSeconds: remaining };
}

const SeguimientoCountdown = memo(({
  pipelineTab,
  seguimientoNextContactAt,
  seguimientoNextS,
  seguimientoRespondedAtS,
  seguimientoIsRecurrente,
  seguimientoRecurrenteCount,
  inactivityTimerStart,
  inactivityTimeoutMinutes = 15,
}: Props) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const nextS = seguimientoNextS || 0;
  const respondedS = seguimientoRespondedAtS || 0;
  const isRecurrente = seguimientoIsRecurrente || false;
  const recurrenteCount = seguimientoRecurrenteCount || 0;
  const tab = pipelineTab || "";

  const isInSeguimiento = tab.startsWith("seguimiento_s");
  const isInResueltosIA = tab === "resueltos_ia";
  const currentS = isInSeguimiento ? parseInt(tab.replace("seguimiento_s", ""), 10) : 0;
  const isAutomatic = currentS >= 1 && currentS <= 8;
  const isManual = currentS >= 9 && currentS <= 10;

  // Case 1: In resueltos_ia with no S history AND no inactivity timer → truly new, no countdown
  if (isInResueltosIA && nextS <= 0 && !inactivityTimerStart) return null;

  // Effective next S: if nextS is 0 but timer is running, they'll go to S1
  const effectiveNextS = nextS > 0 ? nextS : 1;

  const badges: JSX.Element[] = [];

  // "Vino de S{x} → Próximo S{y}" badge
  if (respondedS > 0 && nextS > 0) {
    badges.push(
      <span
        key="flow"
        className="inline-flex items-center text-[8px] font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded leading-none"
      >
        S{respondedS} → S{nextS}
      </span>
    );
  }

  // Recurrente badge
  if (isRecurrente && recurrenteCount > 0) {
    badges.push(
      <span
        key="rec"
        className="inline-flex items-center text-[8px] font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded leading-none"
      >
        Recurrente #{recurrenteCount}
      </span>
    );
  }

  // Case 2: In resueltos_ia waiting for inactivity timer → show countdown to next S
  if (isInResueltosIA && nextS > 0 && inactivityTimerStart) {
    const { label, expired } = formatInactivityCountdown(inactivityTimerStart, inactivityTimeoutMinutes);
    badges.push(
      <span
        key="timer"
        className={cn(
          "inline-flex items-center gap-0.5 text-[8px] font-medium px-1.5 py-0.5 rounded leading-none",
          expired
            ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
            : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
        )}
      >
        <Timer className="w-2.5 h-2.5" />
        {expired ? label : `${label} → S${nextS}`}
      </span>
    );
    return <div className="flex gap-1 flex-wrap items-center">{badges}</div>;
  }

  // Case 3: In seguimiento S1-S8 (automatic) → show countdown
  if (isInSeguimiento && isAutomatic) {
    if (seguimientoNextContactAt) {
      const { label, expired } = formatCountdown(seguimientoNextContactAt);
      badges.push(
        <span
          key="timer"
          className={cn(
            "inline-flex items-center gap-0.5 text-[8px] font-medium px-1.5 py-0.5 rounded leading-none",
            expired
              ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
              : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
          )}
        >
          <Timer className="w-2.5 h-2.5" />
          {expired ? label : `⏱ ${label}`}
        </span>
      );
    }
    return <div className="flex gap-1 flex-wrap items-center">{badges}</div>;
  }

  // Case 4: In S9-S10 (manual) → no countdown, show "Esperando agente"
  if (isInSeguimiento && isManual) {
    badges.push(
      <span
        key="manual"
        className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded leading-none"
      >
        <User className="w-2.5 h-2.5" />
        Esperando agente
      </span>
    );
    return <div className="flex gap-1 flex-wrap items-center">{badges}</div>;
  }

  // If we have badges but no timer (e.g. resueltos_ia with nextS but no inactivity timer yet)
  if (badges.length > 0) {
    return <div className="flex gap-1 flex-wrap items-center">{badges}</div>;
  }

  return null;
});

SeguimientoCountdown.displayName = "SeguimientoCountdown";

export default SeguimientoCountdown;

/** Helper to get remaining seconds for sorting kanban cards */
export function getSeguimientoRemainingSeconds(
  seguimientoNextContactAt: string | null,
  inactivityTimerStart: string | null,
  pipelineTab: string | null,
  inactivityTimeoutMinutes = 15
): number {
  const tab = pipelineTab || "";
  if (tab === "resueltos_ia" && inactivityTimerStart) {
    const remaining = inactivityTimeoutMinutes * 60 - (Date.now() - new Date(inactivityTimerStart).getTime()) / 1000;
    return remaining;
  }
  if (tab.startsWith("seguimiento_s") && seguimientoNextContactAt) {
    return (new Date(seguimientoNextContactAt).getTime() - Date.now()) / 1000;
  }
  return Infinity;
}
