// Default constants for the send window (clinic local time)
const DEFAULT_WINDOW_START = 7;  // 7 AM
const DEFAULT_WINDOW_END = 23;   // 11 PM
const DEFAULT_TZ = "America/Guayaquil";

export interface CountdownState {
  label: string;
  expired: boolean;
  totalSeconds: number;
  /** Visual mode for the badge */
  mode: "active" | "active_will_pause" | "paused" | "sends_on_resume" | "processing" | "pending";
  /** Extra info line (e.g. "pausa a las 11 PM") */
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
  // Build an approximate UTC date for the target hour in the given TZ
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

  // Build target in "local as UTC" then convert via iterative offset
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

export function formatTargetCountdown(targetIso: string, tz: string = DEFAULT_TZ): CountdownState {
  const msRemaining = new Date(targetIso).getTime() - Date.now();
  const remainingSeconds = msRemaining / 1000;

  // Expired states
  if (remainingSeconds <= 0) {
    if (remainingSeconds < -60) {
      return { label: "Pendiente", expired: true, totalSeconds: remainingSeconds, mode: "pending" };
    }
    return { label: "Procesando...", expired: true, totalSeconds: remainingSeconds, mode: "processing" };
  }

  const localHour = getLocalHour(tz);
  const isInPause = localHour >= WINDOW_END || localHour < WINDOW_START;

  if (isInPause) {
    // We're in the pause window (11PM-7AM)
    const resumeTime = getNextLocalTime(tz, WINDOW_START);
    const msAfterResume = new Date(targetIso).getTime() - resumeTime.getTime();

    if (msAfterResume > 0) {
      // Time remaining after resume
      const afterResumeSeconds = msAfterResume / 1000;
      return {
        label: `⏸ Pausado — reanuda 7:00 AM`,
        expired: false,
        totalSeconds: remainingSeconds,
        mode: "paused",
        subLabel: `quedan ${formatTime(afterResumeSeconds)}`,
      };
    } else {
      // Will send right at resume
      return {
        label: `⏸ Se envía a las 7:00 AM`,
        expired: false,
        totalSeconds: remainingSeconds,
        mode: "sends_on_resume",
      };
    }
  }

  // We're in the active window — check if countdown will cross the pause boundary
  const pauseTime = getNextLocalTime(tz, WINDOW_END);
  // But getNextLocalTime adds a day if localHour >= WINDOW_END. Since we're in active window,
  // localHour < WINDOW_END, so it returns today's 11PM.
  // Actually we need "today's 11PM", not "next 11PM". Since localHour < 23, getNextLocalTime(tz, 23) should work.
  const msUntilPause = pauseTime.getTime() - Date.now();

  if (msRemaining <= msUntilPause) {
    // Sends today, before 11PM — normal countdown
    return {
      label: formatTime(remainingSeconds),
      expired: false,
      totalSeconds: remainingSeconds,
      mode: "active",
    };
  }

  // Countdown will cross the pause — show with note
  return {
    label: formatTime(remainingSeconds),
    expired: false,
    totalSeconds: remainingSeconds,
    mode: "active_will_pause",
    subLabel: "pausa a las 11 PM",
  };
}

export function formatElapsedTimeoutCountdown(startIso: string, timeoutMinutes: number): CountdownState {
  const elapsedSeconds = (Date.now() - new Date(startIso).getTime()) / 1000;
  const remainingSeconds = timeoutMinutes * 60 - elapsedSeconds;

  if (remainingSeconds <= 0) {
    if (remainingSeconds < -60) {
      return { label: "Pendiente", expired: true, totalSeconds: remainingSeconds, mode: "pending" };
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
