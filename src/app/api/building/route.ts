import { cacheLife } from "next/cache";
import { parseYearBuilt, summarize, type SocrataViolation } from "@/lib/building";
import { demoBuilding } from "@/lib/demo/summaries";
import type { BuildingRecord, HazardClass } from "@/lib/types";

// GET /api/building?bbl=<10 digits> -> BuildingRecord (open HPD violations + PLUTO year built).
// Route handlers can't export caching config under Cache Components; the live lookup is cached with
// `"use cache"` below and CDNs get the same hour via Cache-Control. Errors and fallbacks are never cached.
const SOCRATA = "https://data.cityofnewyork.us/resource";
const TIMEOUT_MS = 8000;
const CACHEABLE = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };
const NO_STORE = { "Cache-Control": "no-store" };

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

/** Live lookup, cached an hour per BBL. Throws when Open Data is unreachable (a thrown error is not cached). */
async function loadLive(bbl: string): Promise<BuildingRecord> {
  "use cache";
  cacheLife("hours");
  const open = `bbl='${bbl}' AND violationstatus='Open'`; // violations.bbl is TEXT -> quoted
  const [rows, counts, pluto] = await Promise.all([
    socrata<SocrataViolation>("wvxf-dwi5", {
      $select: "violationid,class,inspectiondate,novissueddate,novdescription",
      $where: open,
      $order: "inspectiondate DESC",
      $limit: "1000",
    }),
    socrata<{ class?: string; n: string }>("wvxf-dwi5", { $select: "class,count(*) as n", $where: open, $group: "class" }),
    socrata<{ yearbuilt?: string }>("64uk-42ks", { $select: "yearbuilt", $where: `bbl=${bbl}` }), // PLUTO bbl is a NUMBER
  ]);
  const byClass: Record<HazardClass, number> = { A: 0, B: 0, C: 0 };
  let openTotal = 0;
  for (const c of counts) {
    openTotal += Number(c.n); // includes class I (orders), which byClass leaves out
    if (c.class === "A" || c.class === "B" || c.class === "C") byClass[c.class] = Number(c.n);
  }
  return summarize(rows, { bbl, yearBuilt: parseYearBuilt(pluto[0]?.yearbuilt), source: "live", totals: { openTotal, byClass } });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const bbl = params.get("bbl") ?? "";
  if (!/^\d{10}$/.test(bbl)) {
    return Response.json({ error: "bbl must be 10 digits." }, { status: 400, headers: NO_STORE });
  }
  const fixture = demoBuilding(bbl);
  if (fixture && params.get("demo") === "1") return Response.json(fixture, { headers: CACHEABLE });
  try {
    return Response.json(await loadLive(bbl), { headers: CACHEABLE });
  } catch {
    if (fixture) return Response.json(fixture, { headers: NO_STORE }); // demo buildings only; others have no saved summary
    return Response.json({ error: "Building records are unavailable right now." }, { status: 502, headers: NO_STORE });
  }
}
