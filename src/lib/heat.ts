// Heat and hot water minimums: "code disposes". Pure, cited and unit-tested; all clock logic is New York wall time.
// Source: NYC Admin. Code §27-2029(a) as amended by Local Law 86 of 2017 (heat) and §27-2031 (hot water),
// as published by HPD. Safe on server and client.
import { nyParts, nyWallTimeToIso } from "./countdown";
import { isHeatSeason } from "./rules";
import type { HeatKind, HeatReading } from "./types";

export const HEAT_SOURCE_URL = "https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water-information.page";
export const HEAT_LAW_URL = "https://www.nyc.gov/assets/buildings/local_laws/ll86of2017.pdf";
/** The Mayor's Public Engagement Unit's printable heat log; our log keeps the same columns. */
export const CITY_HEAT_LOG_URL = "https://www.nyc.gov/assets/mayorspeu/downloads/pdf/heat-and-hot-water-log.pdf";

export const HEAT_CITATION = "NYC Admin. Code §27-2029(a) (as amended by Local Law 86 of 2017)";
export const HOT_WATER_CITATION = "NYC Admin. Code §27-2031";

export const DAY_MIN_F = 68;
export const NIGHT_MIN_F = 62;
/** The daytime minimum applies only "whenever the outside temperature falls below fifty-five degrees". */
export const OUTDOOR_BELOW_F = 55;
export const HOT_WATER_MIN_F = 120;
// "between the hours of six a.m. and ten p.m." / "between ten p.m. and six a.m.": read as [6:00, 22:00) and
// [22:00, 6:00), so each minute belongs to exactly one period.
const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 22;

export type HeatStatus = "below_minimum" | "ok" | "not_required" | "needs_outdoor";
export type HeatRule = "heat_day" | "heat_night" | "heat_off_season" | "hot_water";

export interface HeatCheck {
  status: HeatStatus;
  /** The minimum that applies (or would apply, for needs_outdoor); null when none does. */
  requiredF: number | null;
  rule: HeatRule;
  citation: string;
  sourceUrl: string;
  explanation: string;
}

/** "61°F", "61.5°F". */
export function formatF(f: number): string {
  return `${Number(f.toFixed(1))}°F`;
}

export function checkReading({
  at,
  kind,
  indoorF,
  outdoorF,
}: {
  at: string | Date;
  kind: HeatKind;
  indoorF: number;
  outdoorF?: number | null;
}): HeatCheck {
  const when = new Date(at);
  if (kind === "hot_water") {
    const below = indoorF < HOT_WATER_MIN_F;
    return {
      status: below ? "below_minimum" : "ok",
      requiredF: HOT_WATER_MIN_F,
      rule: "hot_water",
      citation: HOT_WATER_CITATION,
      sourceUrl: HEAT_SOURCE_URL,
      explanation: `Hot water is required year-round, at least ${HOT_WATER_MIN_F}°F at the tap. This reading ${below ? `was ${formatF(indoorF)}` : "meets it"}.`,
    };
  }
  const heat = { citation: HEAT_CITATION, sourceUrl: HEAT_SOURCE_URL };
  if (!isHeatSeason(when)) {
    return {
      ...heat,
      status: "not_required",
      requiredF: null,
      rule: "heat_off_season",
      explanation: "Heat is required from October 1 to May 31. Outside heat season there is no minimum.",
    };
  }
  const { hour } = nyParts(when.getTime());
  if (hour >= NIGHT_START_HOUR || hour < DAY_START_HOUR) {
    const below = indoorF < NIGHT_MIN_F;
    return {
      ...heat,
      status: below ? "below_minimum" : "ok",
      requiredF: NIGHT_MIN_F,
      rule: "heat_night",
      explanation: `From 10 PM to 6 AM it must be at least ${NIGHT_MIN_F}°F inside, whatever the weather outside.`,
    };
  }
  const day = { ...heat, rule: "heat_day" as const };
  if (outdoorF === undefined || outdoorF === null || !Number.isFinite(outdoorF)) {
    return {
      ...day,
      status: "needs_outdoor",
      requiredF: DAY_MIN_F,
      explanation: `From 6 AM to 10 PM it must be at least ${DAY_MIN_F}°F inside when it is below ${OUTDOOR_BELOW_F}°F outside. Add the outdoor temperature to check this reading.`,
    };
  }
  if (outdoorF >= OUTDOOR_BELOW_F) {
    return {
      ...day,
      status: "not_required",
      requiredF: null,
      explanation: `From 6 AM to 10 PM the ${DAY_MIN_F}°F minimum applies only when it is below ${OUTDOOR_BELOW_F}°F outside. It was ${formatF(outdoorF)} outside.`,
    };
  }
  const below = indoorF < DAY_MIN_F;
  return {
    ...day,
    status: below ? "below_minimum" : "ok",
    requiredF: DAY_MIN_F,
    explanation: `From 6 AM to 10 PM, when it is below ${OUTDOOR_BELOW_F}°F outside, it must be at least ${DAY_MIN_F}°F inside.`,
  };
}

export const checkHeatReading = (r: HeatReading): HeatCheck =>
  checkReading({ at: r.at, kind: r.kind, indoorF: r.indoorF, outdoorF: r.outdoorF });

/** Readings below the minimum, out of all readings, since the first one. */
export function heatSummary(readings: HeatReading[]): { total: number; below: number; since: string | null } {
  const since = readings.reduce<string | null>((min, r) => (min === null || r.at < min ? r.at : min), null);
  const below = readings.filter((r) => checkHeatReading(r).status === "below_minimum").length;
  return { total: readings.length, below, since };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-01-03T07:15": New York wall time for an <input type="datetime-local">, whatever the device's time zone. */
export function toNyInputValue(iso: string): string {
  const p = nyParts(new Date(iso).getTime());
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** The ISO instant for a datetime-local value read as New York wall time; null when it isn't one. */
export function fromNyInputValue(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  return nyWallTimeToIso(y, mo, d, h, mi, 0);
}
