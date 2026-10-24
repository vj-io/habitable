// No network: every test hands in (or stubs) fetch.
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_AGE_MS, latestOutdoor, observationUrl, parseObservation, stationName } from "./outdoor";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));

const NOW = new Date("2026-10-24T17:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

/** The NWS latest-observation shape (research sample: 14.4 °C = 57.9 °F). */
const obs = (c: number | null, timestamp: string) => ({
  properties: { timestamp, textDescription: "Clear", temperature: { unitCode: "wmoUnit:degC", value: c, qualityControl: "V" } },
});

/** fetch stub answering per station id; an Error value makes that request throw (timeout, DNS…). */
function fakeFetch(answers: Partial<Record<"KNYC" | "KLGA" | "KJFK", unknown>>) {
  return vi.fn(async (...[url]: Parameters<typeof fetch>) => {
    const id = String(url).match(/stations\/(\w+)\//)?.[1] as keyof typeof answers;
    const a = answers[id];
    if (a instanceof Error) throw a;
    if (a === undefined) return new Response("oops", { status: 500 });
    return Response.json(a);
  });
}

describe("parseObservation", () => {
  it("converts °C to °F (one decimal) and keeps the observation time", () => {
    expect(parseObservation(obs(14.4, "2026-10-24T16:51:00+00:00"), NOW)).toEqual({ tempF: 57.9, observedAt: "2026-10-24T16:51:00.000Z" });
    expect(parseObservation(obs(-5, minutesAgo(10)), NOW)?.tempF).toBe(23);
    expect(parseObservation(obs(0, minutesAgo(10)), NOW)?.tempF).toBe(32);
  });

  it("is null for a missing temperature, a missing timestamp, another unit or junk", () => {
    expect(parseObservation(obs(null, minutesAgo(10)), NOW)).toBeNull();
    expect(parseObservation({ properties: { temperature: { unitCode: "wmoUnit:degC", value: 10 } } }, NOW)).toBeNull();
    expect(parseObservation({ properties: { timestamp: minutesAgo(1), temperature: { unitCode: "wmoUnit:degF", value: 50 } } }, NOW)).toBeNull();
    expect(parseObservation(null, NOW)).toBeNull();
    expect(parseObservation("<html>", NOW)).toBeNull();
  });

  it("treats an observation older than 90 minutes as unavailable", () => {
    expect(MAX_AGE_MS).toBe(90 * 60_000);
    expect(parseObservation(obs(10, minutesAgo(90)), NOW)).not.toBeNull();
    expect(parseObservation(obs(10, minutesAgo(91)), NOW)).toBeNull();
    expect(parseObservation(obs(10, minutesAgo(201)), NOW)).toBeNull(); // the 3h21m-old KNYC reading seen in testing
  });
});

describe("latestOutdoor: station fallback", () => {
  it("uses Central Park when it is fresh, with the NWS User-Agent and a timeout", async () => {
    const f = fakeFetch({ KNYC: obs(14.4, minutesAgo(9)), KLGA: obs(15, minutesAgo(5)), KJFK: obs(16, minutesAgo(5)) });
    const r = await latestOutdoor(f, NOW);
    expect(r).toEqual({ tempF: 57.9, observedAt: minutesAgo(9), station: "KNYC", source: observationUrl("KNYC") });
    expect(r.source).toBe("https://api.weather.gov/stations/KNYC/observations/latest");
    const init = f.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("habitable (https://habitable-blush.vercel.app)");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("falls back to LaGuardia when Central Park is stale or has no temperature", async () => {
    const stale = await latestOutdoor(fakeFetch({ KNYC: obs(10, minutesAgo(201)), KLGA: obs(15, minutesAgo(20)), KJFK: obs(16, minutesAgo(5)) }), NOW);
    expect(stale.station).toBe("KLGA");
    expect(stale.tempF).toBe(59);
    const empty = await latestOutdoor(fakeFetch({ KNYC: obs(null, minutesAgo(5)), KLGA: obs(15, minutesAgo(20)) }), NOW);
    expect(empty.station).toBe("KLGA");
  });

  it("prefers Central Park only while it is within 20 minutes of the freshest station", async () => {
    const old = await latestOutdoor(fakeFetch({ KNYC: obs(11.7, minutesAgo(85)), KLGA: obs(13, minutesAgo(9)) }), NOW);
    expect(old.station).toBe("KLGA");
    const close = await latestOutdoor(fakeFetch({ KNYC: obs(11.7, minutesAgo(25)), KLGA: obs(13, minutesAgo(9)) }), NOW);
    expect(close.station).toBe("KNYC");
  });

  it("falls back to JFK when the others error out", async () => {
    const r = await latestOutdoor(fakeFetch({ KNYC: new Error("timeout"), KJFK: obs(2, minutesAgo(30)) }), NOW);
    expect(r).toMatchObject({ station: "KJFK", tempF: 35.6 });
  });

  it("throws when no station has a recent temperature", async () => {
    await expect(latestOutdoor(fakeFetch({ KNYC: obs(10, minutesAgo(120)), KLGA: obs(null, minutesAgo(5)), KJFK: new Error("x") }), NOW)).rejects.toThrow();
  });

  it("names the stations for the UI", () => {
    expect(stationName("KNYC")).toBe("Central Park");
    expect(stationName("KLGA")).toBe("LaGuardia Airport");
    expect(stationName("KJFK")).toBe("JFK Airport");
  });
});

describe("GET /api/outdoor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("answers 200 with the reading and a ~5 minute CDN cache", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.stubGlobal("fetch", fakeFetch({ KNYC: obs(14.4, minutesAgo(9)) }));
    const { GET } = await import("@/app/api/outdoor/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=300");
    expect(await res.json()).toEqual({ tempF: 57.9, observedAt: minutesAgo(9), station: "KNYC", source: observationUrl("KNYC") });
  });

  it("answers 503, never cached, when the NWS is unavailable", async () => {
    vi.stubGlobal("fetch", fakeFetch({}));
    const { GET } = await import("@/app/api/outdoor/route");
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "The outdoor temperature is unavailable right now." });
  });
});
