import { cacheLife } from "next/cache";
import { demoLandlord } from "@/lib/portfolio-demo";
import {
  fetchBaseline,
  fetchMetric,
  findPortfolio,
  lastHeatSeason,
  SAVED_BASELINE,
  scorePortfolio,
  type MetricName,
  type MetricRows,
  type Season,
} from "@/lib/portfolio";

// GET /api/landlord?bbl=<10 digits>[&demo=1] -> LandlordRecord: the buildings that share this building's head officer,
// managing agent or corporate owner on HPD registrations, scored with aggregate queries on NYC Open Data.
// Each lookup is cached separately with `"use cache"` (an hour; the citywide baseline a day), so one failed metric is
// left out (null) without costing the rest, and a thrown error is never cached. Demo BBLs with `demo=1` answer from
// the saved snapshot in src/lib/demo/fixtures/, which also stands in when the portfolio lookup itself fails.
const SOCRATA = "https://data.cityofnewyork.us/resource";
const TIMEOUT_MS = 8000;
const CACHEABLE = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };
const NO_STORE = { "Cache-Control": "no-store" };
const METRICS: MetricName[] = ["violations", "pluto", "heat", "litigation", "aep"];

async function socrata<T>(dataset: string, params: Record<string, string>): Promise<T[]> {
  // URLSearchParams writes spaces as "+"; Socrata's documented form is %20.
  const url = `${SOCRATA}/${dataset}.json?${new URLSearchParams(params).toString().replace(/\+/g, "%20")}`;
  const token = process.env.SOCRATA_APP_TOKEN;
  const res = await fetch(url, {
    headers: token ? { "X-App-Token": token } : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body: unknown = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`Socrata ${dataset} answered ${res.status}`);
  return body as T[];
}

/** The portfolio and when it was read, cached an hour per BBL. Throws when Open Data is unreachable. */
async function loadPortfolio(bbl: string) {
  "use cache";
  cacheLife("hours");
  return { portfolio: await findPortfolio(socrata, bbl), fetchedAt: new Date().toISOString() };
}

/** One metric for a list of lots, cached an hour. Throws on failure. */
async function loadMetric(name: MetricName, bbls: string[], season: Season) {
  "use cache";
  cacheLife("hours");
  return fetchMetric(socrata, name, bbls, season);
}

/** Citywide open B+C violations and residential units, revalidated daily. Throws on failure (then the dated saved counts stand in). */
async function loadBaseline() {
  "use cache";
  cacheLife("days");
  return fetchBaseline(socrata);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const bbl = params.get("bbl") ?? "";
  if (!/^\d{10}$/.test(bbl)) {
    return Response.json({ error: "bbl must be 10 digits." }, { status: 400, headers: NO_STORE });
  }
  const fixture = demoLandlord(bbl);
  if (fixture && params.get("demo") === "1") return Response.json(fixture, { headers: CACHEABLE });

  let found: Awaited<ReturnType<typeof loadPortfolio>>;
  try {
    found = await loadPortfolio(bbl);
  } catch {
    if (fixture) return Response.json(fixture, { headers: NO_STORE });
    return Response.json({ error: "Landlord records are unavailable right now." }, { status: 502, headers: NO_STORE });
  }
  const { portfolio, fetchedAt } = found;
  const season = lastHeatSeason(new Date());
  const bbls = portfolio.buildings.map((b) => b.bbl);
  const [violations, pluto, heat, litigation, aep, baseline] = await Promise.all([
    ...METRICS.map((name) => (bbls.length ? loadMetric(name, bbls, season) : Promise.resolve([])).catch(() => null)),
    loadBaseline().catch(() => null),
  ]);
  const rows = { violations, pluto, heat, litigation, aep, baseline } as MetricRows;
  const complete = Object.values(rows).every((v) => v !== null);
  rows.baseline ??= SAVED_BASELINE;
  return Response.json(scorePortfolio(portfolio, rows, { bbl, season, source: "live", fetchedAt }), { headers: complete ? CACHEABLE : NO_STORE });
}
