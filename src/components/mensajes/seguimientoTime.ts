export interface CountdownState {
  label: string;
  expired: boolean;
  totalSeconds: number;
}

function buildCountdownState(remainingSeconds: number): CountdownState {
  if (remainingSeconds <= 0) {
    return remainingSeconds < -60
      ? { label: "Pendiente", expired: true, totalSeconds: remainingSeconds }
      : { label: "Procesando...", expired: true, totalSeconds: remainingSeconds };
  }

  const wholeSeconds = Math.max(0, Math.floor(remainingSeconds));
  const days = Math.floor(wholeSeconds / 86400);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  const label = days > 0
    ? `${days}d ${String(hours % 24).padStart(2, "0")}h`
    : hours > 0
      ? `${hours}h ${String(minutes).padStart(2, "0")}m`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { label, expired: false, totalSeconds: wholeSeconds };
}

export function formatTargetCountdown(targetIso: string): CountdownState {
  const remainingSeconds = (new Date(targetIso).getTime() - Date.now()) / 1000;
  return buildCountdownState(remainingSeconds);
}

export function formatElapsedTimeoutCountdown(startIso: string, timeoutMinutes: number): CountdownState {
  const elapsedSeconds = (Date.now() - new Date(startIso).getTime()) / 1000;
  const remainingSeconds = timeoutMinutes * 60 - elapsedSeconds;
  return buildCountdownState(remainingSeconds);
}
