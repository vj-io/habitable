// Pure date math for repair-by deadlines. Safe on server and client; all calendar logic is America/New_York.
import type { CorrectionWindow } from "./types";

export const NY_TZ = "America/New_York";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** New York wall-clock fields of an instant (hour 0-23). */
export function nyParts(ms: number) {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormat.formatToParts(ms)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** NY wall-clock fields read as if they were UTC, in ms. */
function wallAsUtc(ms: number): number {
  const p = nyParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * The instant at which New York's wall clock shows the given UTC-style fields.
 * A non-existent time (spring-forward gap) lands on the first valid instant after it.
 */
function nyWallToInstant(wallUtcMs: number): number {
  const guess = wallUtcMs - (wallAsUtc(wallUtcMs) - wallUtcMs);
  return wallUtcMs - (wallAsUtc(guess) - guess);
}

/** ISO instant for a New York wall-clock time given as fields (used for EXIF dates that carry no offset). */
export function nyWallTimeToIso(y: number, mo: number, d: number, h: number, mi: number, s: number): string {
  return new Date(nyWallToInstant(Date.UTC(y, mo - 1, d, h, mi, s))).toISOString();
}

/** Requested repair-by instant (ISO, UTC): first documented + window, DST-safe for day windows. */
export function repairByDate(firstDocumentedIso: string, window: CorrectionWindow): string {
  const start = new Date(firstDocumentedIso).getTime();
  let ms = start;
  if (window.days) {
    // Add whole days on the NY calendar so the wall-clock time survives a DST change.
    const wall = wallAsUtc(start) + window.days * DAY_MS;
    ms = nyWallToInstant(wall) + (((start % 1000) + 1000) % 1000); // keep original milliseconds
  }
  if (window.hours) ms += window.hours * HOUR_MS;
  return new Date(ms).toISOString();
}

export interface Remaining {
  /** Signed: repairBy - now. Negative once overdue. */
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  overdue: boolean;
}

/** Time left until `repairByIso`; when overdue, the d/h/m/s fields describe the overrun. */
export function remaining(repairByIso: string, now: Date): Remaining {
  const totalMs = new Date(repairByIso).getTime() - now.getTime();
  const abs = Math.abs(totalMs);
  return {
    totalMs,
    days: Math.floor(abs / DAY_MS),
    hours: Math.floor((abs % DAY_MS) / HOUR_MS),
    minutes: Math.floor((abs % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((abs % MINUTE_MS) / 1000),
    overdue: totalMs < 0,
  };
}

/** "Day N" counter on the NY calendar: day 1 is the day documented, day 2 the next NY calendar day, ... (min 1). */
export function daysSince(iso: string, now: Date): number {
  const start = nyParts(new Date(iso).getTime());
  const end = nyParts(now.getTime());
  const diff = Math.round(
    (Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day)) / DAY_MS,
  );
  return Math.max(diff, 0) + 1;
}

const formats = {
  date: new Intl.DateTimeFormat("en-US", { timeZone: NY_TZ, year: "numeric", month: "short", day: "numeric" }),
  datetime: new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }),
  short: new Intl.DateTimeFormat("en-US", { timeZone: NY_TZ, month: "short", day: "numeric" }),
};

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: NY_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-10-15": the New York calendar date of an instant. */
export function nyDay(d: Date): string {
  return dayFormat.format(d);
}

/** "Oct 15, 2026" | "Oct 15, 2026, 7:42 AM" | "Oct 15" — always in America/New_York. */
export function formatNY(iso: string, style: "date" | "datetime" | "short"): string {
  // Newer ICU puts a narrow no-break space before AM/PM; normalise to a plain space.
  // Safari joins date and time with " at " where Chrome and Firefox use ", "; use the comma everywhere
  // so the evidence reads the same on every phone.
  return formats[style].format(new Date(iso)).replace(/ /g, " ").replace(" at ", ", ");
}
