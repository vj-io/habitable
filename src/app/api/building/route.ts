import { cacheLife } from "next/cache";
import { parseYearBuilt, summarize, type SocrataViolation } from "@/lib/building";
import { demoBuilding } from "@/lib/demo/summaries";
import {
  CONTACT_TYPES,
  CONTACTS_DATASET,
  REGISTRATIONS_DATASET,
  parseBbl,
  pickRegistrationRow,
  registrationInfo,
  type ContactRow,
  type RegistrationRow,
} from "@/lib/registration";
import { AEP_DATASET, COMPLAINTS_DATASET, LITIGATIONS_DATASET, buildSignals, complaintsSince, type SignalRows } from "@/lib/signals";
import type { BuildingRecord, BuildingSignals, HazardClass, RegistrationInfo } from "@/lib/types";

// GET /api/building?bbl=<10 digits>[&bin=<7 digits>&hn=<house number>] -> BuildingRecord (open HPD violations,
// PLUTO year built, and the HPD registration contacts). `bin` and `hn` only choose between several buildings on one lot.
// Route handlers can't export caching config under Cache Components; the live lookups are cached with
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

/**
 * HPD registration for the building at this address, cached an hour. The registration file has no BBL column, so it
 * is queried by borough, block and lot; then the chosen row's contacts are fetched. Throws when Open Data is unreachable.
 */
async function loadRegistration(bbl: string, bin: string, houseNumber: string): Promise<RegistrationInfo> {
  "use cache";
  cacheLife("hours");
  const lot = parseBbl(bbl);
  if (!lot) throw new Error("bad bbl");
  const hint = { bin, houseNumber };
  const [rows, newest] = await Promise.all([
    socrata<RegistrationRow>(REGISTRATIONS_DATASET, {
      $select: "registrationid,buildingid,housenumber,lowhousenumber,highhousenumber,streetname,bin,lastregistrationdate,registrationenddate",
      $where: `boroid=${lot.boroid} AND block=${lot.block} AND lot=${lot.lot}`,
      $order: "registrationenddate DESC,lastregistrationdate DESC",
      $limit: "500",
    }),
    socrata<{ max_lastregistrationdate?: string }>(REGISTRATIONS_DATASET, { $select: "max(lastregistrationdate)" }), // the snapshot's date
  ]);
  const row = pickRegistrationRow(rows, hint);
  const id = row && /^\d+$/.test(row.registrationid) ? row.registrationid : null;
  const contacts = id
    ? await socrata<ContactRow>(CONTACTS_DATASET, {
        $select:
          "registrationcontactid,registrationid,type,corporationname,firstname,middleinitial,lastname,businesshousenumber,businessstreetname,businessapartment,businesscity,businessstate,businesszip",
        $where: `registrationid in (${id}) AND type in (${CONTACT_TYPES.map((t) => `'${t}'`).join(",")})`,
        $limit: "100",
      })
    : [];
  return registrationInfo(rows, contacts, hint, newest[0]?.max_lastregistrationdate ?? null);
}

/**
 * Complaints by category over the last 12 months, litigation count and AEP status, cached an hour per BBL and day.
 * Complaints are aggregated in the query itself, so apartment numbers (public in that dataset, but other tenants')
 * never reach this server. Throws when Open Data is unreachable.
 */
async function loadSignals(bbl: string, since: string): Promise<BuildingSignals> {
  "use cache";
  cacheLife("hours");
  const [complaints, litigation, aep] = await Promise.all([
    socrata<SignalRows["complaints"][number]>(COMPLAINTS_DATASET, {
      $select: "major_category,count(*) as n",
      $where: `bbl=${bbl} AND received_date>'${since}'`, // complaints.bbl is a NUMBER; the date is ours, not user input
      $group: "major_category",
      $order: "n DESC",
    }),
    socrata<SignalRows["litigation"][number]>(LITIGATIONS_DATASET, { $select: "count(*) as n", $where: `bbl='${bbl}'` }), // TEXT bbl
    socrata<SignalRows["aep"][number]>(AEP_DATASET, { $select: "current_status", $where: `bbl='${bbl}'` }), // TEXT bbl
  ]);
  return buildSignals(since, { complaints, litigation, aep });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const bbl = params.get("bbl") ?? "";
  if (!/^\d{10}$/.test(bbl)) {
    return Response.json({ error: "bbl must be 10 digits." }, { status: 400, headers: NO_STORE });
  }
  const hint = (name: string, valid: RegExp) => (valid.test(params.get(name) ?? "") ? (params.get(name) as string) : "");
  const bin = hint("bin", /^\d{1,7}$/);
  const houseNumber = hint("hn", /^[0-9A-Za-z-]{1,12}$/);
  const fixture = demoBuilding(bbl);
  if (fixture && params.get("demo") === "1") return Response.json(fixture, { headers: CACHEABLE });
  try {
    // The registration and signals lookups can fail on their own without costing the renter the violations record.
    const [record, registration, signals] = await Promise.all([
      loadLive(bbl),
      loadRegistration(bbl, bin, houseNumber).catch(() => undefined),
      loadSignals(bbl, complaintsSince(new Date())).catch(() => undefined),
    ]);
    return Response.json({ ...record, registration, signals }, { headers: registration && signals ? CACHEABLE : NO_STORE });
  } catch {
    if (fixture) return Response.json(fixture, { headers: NO_STORE }); // demo buildings only; others have no saved summary
    return Response.json({ error: "Building records are unavailable right now." }, { status: 502, headers: NO_STORE });
  }
}
