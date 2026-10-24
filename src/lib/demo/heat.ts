// Sample heat log for the demo building, so the feature can be seen outside heat season. Every reading is
// flagged demo and shown with a DEMO label; outdoor temperatures are marked typed, not weather-station data.
import { nyParts, nyWallTimeToIso } from "../countdown";
import type { HeatReading } from "../types";

const SAMPLES: { day: number; hour: number; minute: number; kind: HeatReading["kind"]; indoorF: number; outdoorF: number | null; note: string }[] = [
  { day: 3, hour: 7, minute: 15, kind: "heat", indoorF: 61, outdoorF: 28, note: "Radiator cold to the touch." },
  { day: 3, hour: 23, minute: 30, kind: "heat", indoorF: 58, outdoorF: 24, note: "Sleeping in coats." },
  { day: 4, hour: 14, minute: 0, kind: "heat", indoorF: 70, outdoorF: 35, note: "Heat came on around noon." },
  { day: 5, hour: 6, minute: 45, kind: "hot_water", indoorF: 104, outdoorF: null, note: "Kitchen tap after running 3 minutes." },
  { day: 5, hour: 20, minute: 0, kind: "heat", indoorF: 64, outdoorF: 31, note: "Told the super again." },
];

/** Five readings on January 3-5 of the latest January that has passed, New York time. */
export function sampleHeatReadings(now: Date = new Date()): HeatReading[] {
  const p = nyParts(now.getTime());
  const year = p.month === 1 && p.day < 6 ? p.year - 1 : p.year;
  const createdAt = now.toISOString();
  return SAMPLES.map((s, i) => ({
    id: `demo-heat-${i + 1}`,
    at: nyWallTimeToIso(year, 1, s.day, s.hour, s.minute, 0),
    kind: s.kind,
    indoorF: s.indoorF,
    outdoorF: s.outdoorF,
    outdoorSource: s.outdoorF === null ? null : "typed",
    note: s.note,
    demo: true,
    createdAt,
  }));
}
