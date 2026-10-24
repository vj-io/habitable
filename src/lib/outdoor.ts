// Latest outdoor temperature from the National Weather Service (api.weather.gov, no key).
// Central Park (KNYC) first; its observations are irregular, so a stale one falls back to LaGuardia, then JFK.
// Pure apart from the injected fetch, so the route and the tests share it.
import type { OutdoorReading } from "./types";

export const STATIONS = [
  { id: "KNYC", name: "Central Park" },
  { id: "KLGA", name: "LaGuardia Airport" },
  { id: "KJFK", name: "JFK Airport" },
] as const satisfies readonly { id: OutdoorReading["station"]; name: string }[];

export const stationName = (id: string): string => STATIONS.find((s) => s.id === id)?.name ?? id;

/** An observation older than this is treated as unavailable. */
export const MAX_AGE_MS = 90 * 60_000;
const TIMEOUT_MS = 5000;
const USER_AGENT = "habitable (https://habitable-blush.vercel.app)";

export const observationUrl = (station: string) => `https://api.weather.gov/stations/${station}/observations/latest`;

const cToF = (c: number) => Math.round((c * 1.8 + 32) * 10) / 10;

/** °F and observation time from an NWS latest-observation body; null when the temperature is missing or stale. */
export function parseObservation(body: unknown, now: Date): { tempF: number; observedAt: string } | null {
  const p = (body as { properties?: { timestamp?: unknown; temperature?: { value?: unknown; unitCode?: unknown } } })?.properties;
  const c = p?.temperature?.value;
  const ts = typeof p?.timestamp === "string" ? Date.parse(p.timestamp) : NaN;
  if (typeof c !== "number" || !Number.isFinite(c) || Number.isNaN(ts)) return null;
  if (p?.temperature?.unitCode !== "wmoUnit:degC") return null;
  if (now.getTime() - ts > MAX_AGE_MS) return null;
  return { tempF: cToF(c), observedAt: new Date(ts).toISOString() };
}

async function fetchStation(station: OutdoorReading["station"], fetchImpl: typeof fetch, now: Date): Promise<OutdoorReading | null> {
  const url = observationUrl(station);
  try {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const obs = parseObservation(await res.json(), now);
    return obs && { ...obs, station, source: url };
  } catch {
    return null;
  }
}

/**
 * The freshest usable reading in station order (KNYC, KLGA, KJFK). The three requests run in parallel so the
 * whole lookup stays within one 5 s timeout. Throws when no station has a usable reading.
 */
export async function latestOutdoor(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<OutdoorReading> {
  const results = await Promise.all(STATIONS.map((s) => fetchStation(s.id, fetchImpl, now)));
  const first = results.find((r) => r !== null);
  if (!first) throw new Error("No NWS station has a recent temperature.");
  return first;
}
