import { useState, useEffect, memo } from "react";
import { Timer, User, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatElapsedTimeoutCountdown, formatTargetCountdown } from "./seguimientoTime";

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
  const isAutomatic = currentS >= 1 && currentS <= 6;

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
  if (isInResueltosIA && inactivityTimerStart) {
    const state = formatElapsedTimeoutCountdown(inactivityTimerStart, inactivityTimeoutMinutes);
    badges.push(
      <span
        key="timer"
        className={cn(
          "inline-flex items-center gap-0.5 text-[8px] font-medium px-1.5 py-0.5 rounded leading-none",
          state.expired
            ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
            : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
        )}
      >
        <Timer className="w-2.5 h-2.5" />
        {state.expired ? state.label : `${state.label} → S${effectiveNextS}`}
      </span>
    );
    return <div className="flex gap-1 flex-wrap items-center">{badges}</div>;
  }

  // Case 3: In seguimiento S1-S8 (automatic) → show countdown with pause awareness
  if (isInSeguimiento && isAutomatic) {
    if (seguimientoNextContactAt) {
      const state = formatTargetCountdown(seguimientoNextContactAt);

      if (state.mode === "paused" || state.mode === "sends_on_resume") {
        // Paused state — amber/gray badge
        badges.push(
          <span
            key="timer"
            className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded leading-none"
          >
            <Pause className="w-2.5 h-2.5" />
            {state.label}
          </span>
        );
        if (state.subLabel) {
          badges.push(
            <span
              key="sub"
              className="text-[7px] text-muted-foreground leading-none"
            >
              ({state.subLabel})
            </span>
          );
        }
      } else if (state.mode === "active_will_pause") {
        // Active but will cross pause boundary
        badges.push(
          <span
            key="timer"
            className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded leading-none"
          >
            <Timer className="w-2.5 h-2.5" />
            ⏱ {state.label}
          </span>
        );
        if (state.subLabel) {
          badges.push(
            <span
              key="sub"
              className="text-[7px] text-muted-foreground leading-none"
            >
              ({state.subLabel})
            </span>
          );
        }
      } else {
        // Active or expired
        badges.push(
          <span
            key="timer"
            className={cn(
              "inline-flex items-center gap-0.5 text-[8px] font-medium px-1.5 py-0.5 rounded leading-none",
              state.expired
                ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
                : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
            )}
          >
            <Timer className="w-2.5 h-2.5" />
            {state.expired ? state.label : `⏱ ${state.label}`}
          </span>
        );
      }
    }
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
