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

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getDateTimePartsInTz(date: Date, tz: string = DEFAULT_TZ): ZonedDateParts {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const lookup = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );

    return {
      year: Number(lookup.year),
      month: Number(lookup.month),
      day: Number(lookup.day),
      hour: Number(lookup.hour),
      minute: Number(lookup.minute),
      second: Number(lookup.second),
    };
  } catch {
    const fallback = new Date();
    return {
      year: fallback.getUTCFullYear(),
      month: fallback.getUTCMonth() + 1,
      day: fallback.getUTCDate(),
      hour: fallback.getUTCHours(),
      minute: fallback.getUTCMinutes(),
      second: fallback.getUTCSeconds(),
    };
  }
}

function getLocalHour(tz: string = DEFAULT_TZ): number {
  return getDateTimePartsInTz(new Date(), tz).hour;
}

function shiftLocalDate(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function zonedTimeToUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const desiredMs = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let i = 0; i < 4; i++) {
    const current = getDateTimePartsInTz(new Date(utcMs), tz);
    const currentMs = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
      current.second,
    );
    const diff = desiredMs - currentMs;
    utcMs += diff;
    if (diff === 0) break;
  }

  return new Date(utcMs);
}

function getNextLocalTime(tz: string, targetHour: number): Date {
  const now = new Date();
  const localNow = getDateTimePartsInTz(now, tz);
  const targetDate = localNow.hour >= targetHour
    ? shiftLocalDate(localNow.year, localNow.month, localNow.day, 1)
    : { year: localNow.year, month: localNow.month, day: localNow.day };

  return zonedTimeToUtc(tz, targetDate.year, targetDate.month, targetDate.day, targetHour, 0, 0);
}

function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const displayHour = normalized % 12 || 12;
  return `${displayHour}:00 ${suffix}`;
}

function getActiveRemainingSeconds(
  targetIso: string,
  tz: string = DEFAULT_TZ,
  windowStart: number = DEFAULT_WINDOW_START,
  windowEnd: number = DEFAULT_WINDOW_END,
): number {
  const target = new Date(targetIso);
  let cursor = new Date();

  if (target.getTime() <= cursor.getTime()) {
    return (target.getTime() - cursor.getTime()) / 1000;
  }

  let activeMs = 0;
  let guard = 0;

  while (cursor.getTime() < target.getTime() && guard < 10) {
    guard += 1;
    const local = getDateTimePartsInTz(cursor, tz);
    const openStart = zonedTimeToUtc(tz, local.year, local.month, local.day, windowStart, 0, 0);
    const openEnd = zonedTimeToUtc(tz, local.year, local.month, local.day, windowEnd, 0, 0);

    if (cursor.getTime() < openStart.getTime()) {
      cursor = openStart;
      if (cursor.getTime() >= target.getTime()) break;
    }

    if (cursor.getTime() >= openEnd.getTime()) {
      const nextDay = shiftLocalDate(local.year, local.month, local.day, 1);
      cursor = zonedTimeToUtc(tz, nextDay.year, nextDay.month, nextDay.day, windowStart, 0, 0);
      continue;
    }

    const segmentEnd = new Date(Math.min(target.getTime(), openEnd.getTime()));
    activeMs += Math.max(0, segmentEnd.getTime() - cursor.getTime());
    cursor = segmentEnd;

    if (cursor.getTime() >= openEnd.getTime() && cursor.getTime() < target.getTime()) {
      const nextDay = shiftLocalDate(local.year, local.month, local.day, 1);
      cursor = zonedTimeToUtc(tz, nextDay.year, nextDay.month, nextDay.day, windowStart, 0, 0);
    }
  }

  return activeMs / 1000;
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

  const activeRemainingSeconds = getActiveRemainingSeconds(targetIso, tz, windowStart, windowEnd);
  const localHour = getLocalHour(tz);
  const isInPause = localHour >= windowEnd || localHour < windowStart;

  if (isInPause) {
    const resumeLabel = formatHourLabel(windowStart);

    if (activeRemainingSeconds > 0) {
      return {
        label: `⏸ Pausado — reanuda ${resumeLabel}`,
        expired: false,
        totalSeconds: activeRemainingSeconds,
        mode: "paused",
        subLabel: `quedan ${formatTime(activeRemainingSeconds)}`,
      };
    }

    return {
      label: `⏸ Se envía a las ${resumeLabel}`,
      expired: false,
      totalSeconds: 0,
      mode: "sends_on_resume",
    };
  }

  const pauseTime = getNextLocalTime(tz, windowEnd);
  const secondsUntilPause = Math.max(0, (pauseTime.getTime() - Date.now()) / 1000);

  if (activeRemainingSeconds <= secondsUntilPause) {
    return {
      label: formatTime(activeRemainingSeconds),
      expired: false,
      totalSeconds: activeRemainingSeconds,
      mode: "active",
    };
  }

  return {
    label: formatTime(activeRemainingSeconds),
    expired: false,
    totalSeconds: activeRemainingSeconds,
    mode: "active_will_pause",
    subLabel: `pausa a las ${formatHourLabel(windowEnd)}`,
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
