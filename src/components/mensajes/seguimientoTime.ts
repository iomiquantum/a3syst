const DEFAULT_WINDOW_START = 7;
const DEFAULT_WINDOW_END = 23;
const DEFAULT_TZ = "America/Guayaquil";

export interface CountdownState {
  label: string;
  expired: boolean;
  totalSeconds: number;
  mode: "active" | "active_will_pause" | "paused" | "sends_on_resume" | "processing" | "pending";
  subLabel?: string;
}

function getLocalHour(tz: string = DEFAULT_TZ): number {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    return hourPart ? Number(hourPart.value) : new Date().getUTCHours();
  } catch {
    return new Date().getUTCHours();
  }
}

function getNextLocalTime(tz: string, targetHour: number): Date {
  const now = new Date();
  const localParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const lookup: Record<string, string> = {};
  localParts.filter((p) => p.type !== "literal").forEach((p) => (lookup[p.type] = p.value));

  const localHour = Number(lookup.hour);
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);

  let targetDay = day;
  if (localHour >= targetHour) targetDay += 1;

  let utcMs = Date.UTC(year, month - 1, targetDay, targetHour, 0, 0);
  for (let i = 0; i < 4; i++) {
    const checkParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const cl: Record<string, string> = {};
    checkParts.filter((p) => p.type !== "literal").forEach((p) => (cl[p.type] = p.value));
    const currentMs = Date.UTC(Number(cl.year), Number(cl.month) - 1, Number(cl.day), Number(cl.hour), Number(cl.minute), Number(cl.second));
    const desiredMs = Date.UTC(year, month - 1, targetDay, targetHour, 0, 0);
    const diff = desiredMs - currentMs;
    utcMs += diff;
    if (diff === 0) break;
  }
  return new Date(utcMs);
}

function formatTime(totalSeconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(wholeSeconds / 86400);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  if (days > 0) return `${days}d ${String(hours % 24).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTargetCountdown(
  targetIso: string,
  tz: string = DEFAULT_TZ,
  windowStart: number = DEFAULT_WINDOW_START,
  windowEnd: number = DEFAULT_WINDOW_END,
): CountdownState {
  const msRemaining = new Date(targetIso).getTime() - Date.now();
  const remainingSeconds = msRemaining / 1000;

  if (remainingSeconds <= 0) {
    if (remainingSeconds < -60) {
      return { label: "En cola", expired: true, totalSeconds: remainingSeconds, mode: "pending" };
    }
    return { label: "Procesando...", expired: true, totalSeconds: remainingSeconds, mode: "processing" };
  }

  const localHour = getLocalHour(tz);
  const isInPause = localHour >= windowEnd || localHour < windowStart;

  if (isInPause) {
    const resumeTime = getNextLocalTime(tz, windowStart);
    const msAfterResume = new Date(targetIso).getTime() - resumeTime.getTime();
    const resumeLabel = `${windowStart}:00 AM`;

    if (msAfterResume > 0) {
      const afterResumeSeconds = msAfterResume / 1000;
      return {
        label: `⏸ Pausado — reanuda ${resumeLabel}`,
        expired: false,
        totalSeconds: remainingSeconds,
        mode: "paused",
        subLabel: `quedan ${formatTime(afterResumeSeconds)}`,
      };
    }

    return {
      label: `⏸ Se envía a las ${resumeLabel}`,
      expired: false,
      totalSeconds: remainingSeconds,
      mode: "sends_on_resume",
    };
  }

  const pauseTime = getNextLocalTime(tz, windowEnd);
  const msUntilPause = pauseTime.getTime() - Date.now();

  if (msRemaining <= msUntilPause) {
    return {
      label: formatTime(remainingSeconds),
      expired: false,
      totalSeconds: remainingSeconds,
      mode: "active",
    };
  }

  return {
    label: formatTime(remainingSeconds),
    expired: false,
    totalSeconds: remainingSeconds,
    mode: "active_will_pause",
    subLabel: `pausa a las ${windowEnd > 12 ? windowEnd - 12 : windowEnd} ${windowEnd >= 12 ? "PM" : "AM"}`,
  };
}

export function formatElapsedTimeoutCountdown(startIso: string, timeoutMinutes: number): CountdownState {
  const elapsedSeconds = (Date.now() - new Date(startIso).getTime()) / 1000;
  const remainingSeconds = timeoutMinutes * 60 - elapsedSeconds;

  if (remainingSeconds <= 0) {
    if (remainingSeconds < -60) {
      return { label: "En cola", expired: true, totalSeconds: remainingSeconds, mode: "pending" };
    }
    return { label: "Procesando...", expired: true, totalSeconds: remainingSeconds, mode: "processing" };
  }

  return {
    label: formatTime(remainingSeconds),
    expired: false,
    totalSeconds: remainingSeconds,
    mode: "active",
  };
}
