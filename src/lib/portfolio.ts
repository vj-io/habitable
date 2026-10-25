// Landlord track record: the other buildings that share this building's head officer, managing agent or corporate
// owner on HPD registrations, scored with live aggregate counts. Parsing, grouping and scoring are pure (the route,
// the demo fixtures and the tests share them); the fetch functions at the bottom take the Socrata caller as an argument.
// Data: NYC Open Data — HPD registrations (tesw-yqqr) and contacts (feu5-w2e2), HPD violations (wvxf-dwi5),
// PLUTO (64uk-42ks), 311 service requests (erm2-nwe9), HPD litigations (59kj-x8nc), AEP buildings (hcir-3275).
import { nyDay } from "./countdown";
import {
  CONTACT_TYPES,
  CONTACTS_DATASET,
  REGISTRATIONS_DATASET,
  buildRegistration,
  parseBbl,
  pickRegistrationRow,
  type ContactRow,
  type RegistrationRow,
} from "./registration";
import { AEP_DATASET, LITIGATIONS_DATASET } from "./signals";
import type { HazardClass } from "./types";

export const VIOLATIONS_DATASET = "wvxf-dwi5";
export const PLUTO_DATASET = "64uk-42ks";
export const SR311_DATASET = "erm2-nwe9";
export const VIOLATIONS_URL = "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5";
export const PLUTO_URL = "https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks";
export const SR311_URL = "https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9";
export const CONTACTS_URL = "https://data.cityofnewyork.us/Housing-Development/Registration-Contacts/feu5-w2e2";

/** At most this many buildings are scored; the page says so when a portfolio is bigger. */
export const PORTFOLIO_CAP = 250;
/** Registrations examined per portfolio. A name on more than this is a very large portfolio: capped too. */
export const MAX_REGISTRATIONS = 1000;
/** Contact rows read per name. */
export const MAX_CONTACT_ROWS = 5000;
/** Values per `in (...)` list, so every query URL stays short. */
export const CHUNK = 100;

export type LinkKind = "headOfficer" | "owner" | "agent";
export const LINK_ORDER: LinkKind[] = ["headOfficer", "owner", "agent"];
export const LINK_LABEL: Record<LinkKind, string> = {
  headOfficer: "Same head officer",
  owner: "Same corporate owner",
  agent: "Same managing agent",
};
const LINK_TYPE: Record<LinkKind, string> = { headOfficer: "HeadOfficer", owner: "CorporateOwner", agent: "Agent" };

/** One name on this building's registration that other registrations are matched on. */
export interface PortfolioKey {
  kind: LinkKind;
  /** As shown: "EDWIN SHIRAZ", "DAVID FRIEDMAN, NEW PARK MANAGEMENT, LLC". */
  name: string;
  /** The person's first and last name, upper-cased and trimmed; null when the contact names no person. */
  person: { first: string; last: string } | null;
  /** Company name, upper-cased and trimmed; "" when none. */
  company: string;
  /** Normalized business addresses this registration lists for the same name; null = the name alone matches (corporate owner). */
  addresses: string[] | null;
}

export interface PortfolioBuilding {
  bbl: string;
  /** Registered street address, e.g. "618-620 WEST 136 STREET". */
  address: string;
  links: LinkKind[];
}

export interface Portfolio {
  /** HPD registration snapshot date (newest registration date in the file), ISO. */
  asOf: string | null;
  /** False when the building has no HPD registration: there is no name to follow. */
  registered: boolean;
  keys: { kind: LinkKind; name: string }[];
  /** This building first, then by BBL; at most PORTFOLIO_CAP. */
  buildings: PortfolioBuilding[];
  /** Buildings found before the cap (a lower bound when `capped`). */
  found: number;
  capped: boolean;
}

// -- names and addresses -------------------------------------------------------------------------------------------

export const normName = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim().toUpperCase();
/** First and last name (the middle initial varies between filings); null unless both are filed. */
function personOf(c: ContactRow): { first: string; last: string } | null {
  const first = normName(c.firstname);
  const last = normName(c.lastname);
  return first && last ? { first, last } : null;
}
const samePerson = (c: ContactRow, p: PortfolioKey["person"]) => !!p && personOf(c)?.first === p.first && personOf(c)?.last === p.last;

// Spellings seen in the contacts file for one office: "110 EAST 55TH ST", "110 E. 55TH STREET", "110 EAST 55 STREET".
// Both sides go through the same map, so a word with two meanings ("ST" for Saint) still compares equal to itself.
const WORDS: Record<string, string> = {
  E: "EAST", W: "WEST", N: "NORTH", S: "SOUTH",
  ST: "STREET", STR: "STREET", AVE: "AVENUE", AV: "AVENUE", RD: "ROAD", BLVD: "BOULEVARD", PL: "PLACE", PKWY: "PARKWAY",
  DR: "DRIVE", LN: "LANE", CT: "COURT", TER: "TERRACE", HWY: "HIGHWAY", TPKE: "TURNPIKE", SQ: "SQUARE",
};

/** "110|EAST 55 STREET" for "110" + "E. 55th St."; null without a street. City and ZIP are left out (both are often mistyped). */
export function addressKey(c: Pick<ContactRow, "businesshousenumber" | "businessstreetname">): string | null {
  const words = normName((c.businessstreetname ?? "").replace(/[.,#]/g, " "))
    .split(" ")
    .filter(Boolean)
    .map((w) => w.replace(/^(\d+)(?:ST|ND|RD|TH)$/, "$1"))
    .map((w) => WORDS[w] ?? w);
  if (!words.length) return null;
  return `${normName(c.businesshousenumber).replace(/\s/g, "")}|${words.join(" ")}`;
}

/**
 * The names to follow from this building's registration contacts: each head officer and managing agent (a name plus
 * the business addresses this registration lists for that name) and each corporate owner (the name alone: an LLC
 * name is one legal entity). People are matched on name AND address, so two unrelated owners who share a common
 * name are never merged.
 */
export function portfolioKeys(contacts: ContactRow[]): PortfolioKey[] {
  const own = [...new Map(contacts.map((c) => [c.registrationcontactid, c])).values()];
  // Every address this registration lists for the same person or company (one head officer can be filed at a PO box
  // and, as the agent, at an office): a namesake elsewhere has to be at one of them.
  const addressesFor = (person: PortfolioKey["person"], company: string) => [
    ...new Set(
      own
        .filter((c) => samePerson(c, person) || (company && normName(c.corporationname) === company))
        .map(addressKey)
        .filter((a): a is string => !!a),
    ),
  ];
  const keys: PortfolioKey[] = [];
  for (const kind of LINK_ORDER) {
    for (const c of own.filter((x) => x.type === LINK_TYPE[kind])) {
      const person = kind === "owner" ? null : personOf(c);
      const company = normName(c.corporationname);
      if (!person && !company) continue;
      const addresses = kind === "owner" ? null : addressesFor(person, company);
      if (addresses && !addresses.length) continue; // without an address a person can't be told apart from a namesake
      const name = [person && `${person.first} ${person.last}`, company].filter(Boolean).join(", ");
      if (!keys.some((k) => k.kind === kind && k.name === name)) keys.push({ kind, name, person, company, addresses });
    }
  }
  return keys;
}

const soqlText = (v: string) => `'${v.replace(/'/g, "''")}'`;

/** The contacts query for one key (names are compared upper-cased and trimmed; the address is checked in code). */
export function keyWhere(key: PortfolioKey): string {
  const person = key.person && `(upper(trim(firstname))=${soqlText(key.person.first)} AND upper(trim(lastname))=${soqlText(key.person.last)})`;
  const company = key.company && `upper(trim(corporationname))=${soqlText(key.company)}`;
  return `type='${LINK_TYPE[key.kind]}' AND (${[person, company].filter(Boolean).join(" OR ")})`;
}

/** Registration id -> which links tie it to this building. Contact rows can repeat; each key is checked on type, name and address. */
export function matchContacts(keys: PortfolioKey[], rows: ContactRow[]): Map<string, Set<LinkKind>> {
  const out = new Map<string, Set<LinkKind>>();
  for (const r of rows) {
    if (!r.registrationid) continue;
    const address = addressKey(r);
    for (const k of keys) {
      if (r.type !== LINK_TYPE[k.kind]) continue;
      const named = samePerson(r, k.person) || (k.company && normName(r.corporationname) === k.company);
      if (!named || (k.addresses && !(address && k.addresses.includes(address)))) continue;
      (out.get(r.registrationid) ?? out.set(r.registrationid, new Set()).get(r.registrationid)!).add(k.kind);
    }
  }
  return out;
}

// -- registrations -> buildings --------------------------------------------------------------------------------------

/** A `tesw-yqqr` row with its tax lot (the file has no BBL column). */
export interface LotRegistrationRow extends RegistrationRow {
  boroid?: string;
  block?: string;
  lot?: string;
}

/** "1020020091" from boroid 1, block 2002, lot 91; null when a part is missing. */
export function bblOf(r: Pick<LotRegistrationRow, "boroid" | "block" | "lot">): string | null {
  if (!/^[1-5]$/.test(r.boroid ?? "") || !/^\d{1,5}$/.test(r.block ?? "") || !/^\d{1,4}$/.test(r.lot ?? "")) return null;
  return `${r.boroid}${r.block!.padStart(5, "0")}${r.lot!.padStart(4, "0")}`;
}

/**
 * Buildings whose CURRENT registration is one of the matched ones. `rows` are every registration of the candidate
 * buildings: a building that was sold and re-registered by someone else keeps its old registration in the file, and
 * is left out. Buildings are counted by tax lot (BBL), which is what the violation, PLUTO and 311 files are keyed on.
 */
export function currentBuildings(
  matched: Map<string, Set<LinkKind>>,
  rows: LotRegistrationRow[],
  subjectBbl: string,
  cap = PORTFOLIO_CAP,
): { buildings: PortfolioBuilding[]; found: number } {
  const byBuilding = new Map<string, LotRegistrationRow[]>();
  for (const r of rows) {
    const id = r.buildingid ?? `r${r.registrationid}`;
    byBuilding.set(id, [...(byBuilding.get(id) ?? []), r]);
  }
  const byBbl = new Map<string, { address: string; links: Set<LinkKind> }>();
  for (const group of byBuilding.values()) {
    const newest = pickRegistrationRow(group) as LotRegistrationRow | null;
    const links = newest && matched.get(newest.registrationid);
    const bbl = newest && bblOf(newest);
    if (!links || !bbl) continue;
    const have = byBbl.get(bbl);
    if (have) links.forEach((l) => have.links.add(l));
    else byBbl.set(bbl, { address: buildRegistration(newest, []).buildingAddress, links: new Set(links) });
  }
  // This building first, then the ones tied through the owner side (a big managing agent can bring in hundreds of
  // other owners' buildings, so those go last when the cap cuts), then by BBL.
  const rank = (b: PortfolioBuilding) => (b.bbl === subjectBbl ? 0 : b.links.some((l) => l !== "agent") ? 1 : 2);
  const all = [...byBbl.entries()]
    .map(([bbl, b]) => ({ bbl, address: b.address, links: LINK_ORDER.filter((l) => b.links.has(l)) }))
    .sort((a, b) => rank(a) - rank(b) || a.bbl.localeCompare(b.bbl));
  return { buildings: all.slice(0, cap), found: all.length };
}

/** How many of the buildings each link ties in, in LINK_ORDER, links with none left out. */
export function linkCounts(buildings: PortfolioBuilding[]): { kind: LinkKind; buildings: number }[] {
  return LINK_ORDER.map((kind) => ({ kind, buildings: buildings.filter((b) => b.links.includes(kind)).length })).filter((l) => l.buildings > 0);
}

/** Split a list for `in (...)` queries. */
export function chunk<T>(xs: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

// -- scoring ---------------------------------------------------------------------------------------------------------

/** The aggregate answers, as Socrata sends them (counts are text). null = that query failed. */
export interface MetricRows {
  violations: { bbl?: string; class?: string; n?: string }[] | null;
  pluto: { bbl?: string; unitsres?: string }[] | null;
  heat: { bbl?: string; n?: string }[] | null;
  litigation: { bbl?: string; n?: string }[] | null;
  aep: { bbl?: string; current_status?: string }[] | null;
  /** Citywide open Class B and C violations (by class) and PLUTO residential units, and the day they were read. */
  baseline: Baseline | null;
}

export interface Baseline {
  violations: { class?: string; n?: string }[];
  units: { units?: string }[];
  /** ISO day the two counts were read. */
  asOf: string;
}

/**
 * The citywide counts as read live on 2026-10-25 (wvxf-dwi5: open B 1,386,990, open C 587,952; 64uk-42ks:
 * sum(unitsres) 3,736,645). The citywide violations count took from 2 s to over a minute in testing, so when the
 * live query times out the page uses these, with their date.
 */
export const SAVED_BASELINE: Baseline = {
  violations: [{ class: "B", n: "1386990" }, { class: "C", n: "587952" }],
  units: [{ units: "3736645" }],
  asOf: "2026-10-25",
};

/** The heat season before the current one, Oct 1 – May 31, as ISO days (New York calendar). */
export interface Season {
  start: string;
  end: string;
}

/** The last complete heat season: on Oct 25, 2026 that is Oct 1, 2025 – May 31, 2026; on Mar 1, 2027 still the same one. */
export function lastHeatSeason(now: Date): Season {
  const [y, m] = nyDay(now).split("-").map(Number);
  const endYear = m >= 6 ? y : y - 1;
  return { start: `${endYear - 1}-10-01`, end: `${endYear}-05-31` };
}

/** Socrata counts and sums arrive as text; anything unreadable counts as 0. */
const count = (v?: string) => (Number(v) > 0 ? Math.trunc(Number(v)) : 0);
const round1 = (x: number) => Math.round(x * 10) / 10;
/** PLUTO's bbl is a number ("1020020091.00000000"); the HPD files use the 10-digit text. */
const plutoBbl = (v?: string) => (v && Number.isFinite(Number(v)) ? String(Math.trunc(Number(v))) : "");

export interface WorstBuilding {
  bbl: string;
  address: string;
  c: number;
  /** PLUTO residential units; null when PLUTO has no count for the lot or the lookup failed. */
  units: number | null;
  links: LinkKind[];
}

/** GET /api/landlord?bbl=… Each metric is null when its lookup failed; the rest still stands. */
export interface LandlordRecord {
  bbl: string;
  source: "live" | "demo-fixture";
  fetchedAt: string;
  portfolio: Portfolio;
  season: Season;
  /** Open HPD violations across the buildings: by class, and all classes (incl. I, orders). */
  open: { byClass: Record<HazardClass, number>; total: number } | null;
  /** PLUTO residential units across the buildings PLUTO has a count for, and how many buildings that is. */
  units: { total: number; buildings: number } | null;
  /** Open Class B+C violations per 100 apartments, at buildings with a unit count. 1 decimal. */
  bcPer100: number | null;
  /** The same measure citywide: all open B+C violations / all PLUTO residential units. */
  baseline: { bc: number; units: number; per100: number; asOf: string } | null;
  /** bcPer100 / baseline.per100, 1 decimal ("3.2×"). */
  ratio: number | null;
  /** 311 heat/hot water service requests (agency HPD) during `season`. */
  heat311: number | null;
  /** HPD litigation cases, all years. */
  litigations: number | null;
  /** Buildings in HPD's Alternative Enforcement Program right now. */
  aep: number | null;
  /** The 5 buildings with the most open Class C violations (only buildings with at least one). */
  worst: WorstBuilding[] | null;
}

/** The track record from the portfolio and the aggregate answers. Only rows for the portfolio's own lots are counted. */
export function scorePortfolio(
  portfolio: Portfolio,
  rows: MetricRows,
  meta: { bbl: string; season: Season; source: LandlordRecord["source"]; fetchedAt: string },
): LandlordRecord {
  const lots = new Set(portfolio.buildings.map((b) => b.bbl));
  const sumBy = (rs: { bbl?: string; n?: string }[]) => rs.reduce((t, r) => t + (lots.has(r.bbl ?? "") ? count(r.n) : 0), 0);

  const perLot = new Map<string, Record<HazardClass, number>>();
  let total = 0;
  for (const r of rows.violations ?? []) {
    if (!lots.has(r.bbl ?? "")) continue;
    const n = count(r.n);
    total += n; // every class, including I (orders)
    const lot = perLot.get(r.bbl!) ?? perLot.set(r.bbl!, { A: 0, B: 0, C: 0 }).get(r.bbl!)!;
    if (r.class === "A" || r.class === "B" || r.class === "C") lot[r.class] += n;
  }
  const byClass: Record<HazardClass, number> = { A: 0, B: 0, C: 0 };
  for (const lot of perLot.values()) for (const c of ["A", "B", "C"] as const) byClass[c] += lot[c];

  const unitsOf = new Map<string, number>();
  for (const r of rows.pluto ?? []) {
    const bbl = plutoBbl(r.bbl);
    if (lots.has(bbl) && count(r.unitsres) > 0) unitsOf.set(bbl, count(r.unitsres));
  }
  const units = rows.pluto ? { total: [...unitsOf.values()].reduce((t, n) => t + n, 0), buildings: unitsOf.size } : null;

  let bcPer100: number | null = null;
  let exact: number | null = null;
  if (rows.violations && units && units.total > 0) {
    let bc = 0;
    for (const bbl of unitsOf.keys()) bc += (perLot.get(bbl)?.B ?? 0) + (perLot.get(bbl)?.C ?? 0);
    exact = (100 * bc) / units.total;
    bcPer100 = round1(exact);
  }

  let baseline: LandlordRecord["baseline"] = null;
  if (rows.baseline) {
    const bc = rows.baseline.violations.filter((r) => r.class === "B" || r.class === "C").reduce((t, r) => t + count(r.n), 0);
    const cityUnits = count(rows.baseline.units[0]?.units);
    if (bc > 0 && cityUnits > 0) baseline = { bc, units: cityUnits, per100: round1((100 * bc) / cityUnits), asOf: rows.baseline.asOf };
  }
  const ratio = exact !== null && baseline ? round1(exact / ((100 * baseline.bc) / baseline.units)) : null;

  const worst = rows.violations
    ? portfolio.buildings
        .map((b) => ({ bbl: b.bbl, address: b.address, c: perLot.get(b.bbl)?.C ?? 0, units: rows.pluto ? (unitsOf.get(b.bbl) ?? null) : null, links: b.links }))
        .filter((b) => b.c > 0)
        .sort((a, b) => b.c - a.c || a.bbl.localeCompare(b.bbl))
        .slice(0, 5)
    : null;

  return {
    bbl: meta.bbl,
    source: meta.source,
    fetchedAt: meta.fetchedAt,
    portfolio,
    season: meta.season,
    open: rows.violations ? { byClass, total } : null,
    units,
    bcPer100,
    baseline,
    ratio,
    heat311: rows.heat ? sumBy(rows.heat) : null,
    litigations: rows.litigation ? sumBy(rows.litigation) : null,
    aep: rows.aep ? new Set(rows.aep.filter((r) => lots.has(r.bbl ?? "") && r.current_status === "AEP Active").map((r) => r.bbl)).size : null,
    worst,
  };
}

const BOROUGHS = ["", "Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];
/** "Manhattan" for a BBL starting with 1. */
export const boroughOf = (bbl: string) => BOROUGHS[Number(bbl[0])] ?? "";

// -- fetch layer -----------------------------------------------------------------------------------------------------

/** Runs one SoQL query and returns its rows; throws on any failure. The route supplies it (timeout, app token). */
export type Socrata = <T>(dataset: string, params: Record<string, string>) => Promise<T[]>;

const REG_COLUMNS = "registrationid,buildingid,boroid,block,lot,housenumber,lowhousenumber,highhousenumber,streetname,bin,lastregistrationdate,registrationenddate";
const CONTACT_COLUMNS =
  "registrationcontactid,registrationid,type,corporationname,firstname,middleinitial,lastname,businesshousenumber,businessstreetname,businessapartment,businesscity,businessstate,businesszip";

/** One query per chunk, in parallel; any failed chunk fails the whole list (never a silent undercount). */
async function inChunks<T>(socrata: Socrata, dataset: string, values: string[], params: (list: string[]) => Record<string, string>): Promise<T[]> {
  const parts = await Promise.all(chunk(values).map((c) => socrata<T>(dataset, params(c))));
  return parts.flat();
}

/**
 * This building's current registration, the names on it, every registration filed under those names, and which of
 * those buildings are still registered under them today. Throws when Open Data is unreachable.
 */
export async function findPortfolio(socrata: Socrata, bbl: string): Promise<Portfolio> {
  const lot = parseBbl(bbl);
  if (!lot) throw new Error("bad bbl");
  const [rows, newest] = await Promise.all([
    socrata<LotRegistrationRow>(REGISTRATIONS_DATASET, {
      $select: REG_COLUMNS,
      $where: `boroid=${lot.boroid} AND block=${lot.block} AND lot=${lot.lot}`,
      $limit: "500",
    }),
    socrata<{ max_lastregistrationdate?: string }>(REGISTRATIONS_DATASET, { $select: "max(lastregistrationdate)" }),
  ]);
  const asOf = newest[0]?.max_lastregistrationdate?.slice(0, 10) ?? null;
  const row = pickRegistrationRow(rows);
  if (!row || !/^\d+$/.test(row.registrationid)) return { asOf, registered: false, keys: [], buildings: [], found: 0, capped: false };

  const contacts = await socrata<ContactRow>(CONTACTS_DATASET, {
    $select: CONTACT_COLUMNS,
    $where: `registrationid=${row.registrationid} AND type in (${CONTACT_TYPES.map((t) => `'${t}'`).join(",")})`,
    $limit: "100",
  });
  const keys = portfolioKeys(contacts);
  const named = await Promise.all(keys.map((k) => socrata<ContactRow>(CONTACTS_DATASET, { $select: CONTACT_COLUMNS, $where: keyWhere(k), $limit: String(MAX_CONTACT_ROWS) })));
  const matched = matchContacts(keys, named.flat());
  if (!matched.has(row.registrationid)) matched.set(row.registrationid, new Set()); // this building, even with no names to follow
  let capped = named.some((r) => r.length >= MAX_CONTACT_ROWS) || matched.size > MAX_REGISTRATIONS;
  const ids = [...matched.keys()].filter((id) => /^\d+$/.test(id)).slice(0, MAX_REGISTRATIONS);

  // registration ids -> building ids -> every registration of those buildings (to keep only current ones)
  const regRows = await inChunks<LotRegistrationRow>(socrata, REGISTRATIONS_DATASET, ids, (list) => ({
    $select: "registrationid,buildingid",
    $where: `registrationid in (${list.join(",")})`,
    $limit: "5000",
  }));
  const buildingIds = [...new Set(regRows.map((r) => r.buildingid).filter((b): b is string => !!b && /^\d+$/.test(b)))];
  const history = await inChunks<LotRegistrationRow>(socrata, REGISTRATIONS_DATASET, buildingIds, (list) => ({
    $select: REG_COLUMNS,
    $where: `buildingid in (${list.join(",")})`,
    $limit: "5000",
  }));
  const { buildings, found } = currentBuildings(matched, history, bbl);
  capped ||= found > PORTFOLIO_CAP;
  return { asOf, registered: true, keys: keys.map(({ kind, name }) => ({ kind, name })), buildings, found, capped };
}

export type MetricName = Exclude<keyof MetricRows, "baseline">;

/** One aggregate per building for the portfolio's lots (chunked, in parallel). */
export function fetchMetric(socrata: Socrata, name: MetricName, bbls: string[], season: Season): Promise<MetricRows[MetricName]> {
  const text = (list: string[]) => list.map((b) => `'${b}'`).join(","); // these files keep bbl as TEXT
  switch (name) {
    case "violations":
      return inChunks(socrata, VIOLATIONS_DATASET, bbls, (list) => ({
        $select: "bbl,class,count(*) as n",
        $where: `violationstatus='Open' AND bbl in (${text(list)})`,
        $group: "bbl,class",
        $limit: "5000",
      }));
    case "pluto":
      return inChunks(socrata, PLUTO_DATASET, bbls, (list) => ({ $select: "bbl,unitsres", $where: `bbl in (${list.join(",")})`, $limit: "5000" })); // NUMBER bbl
    case "heat":
      return inChunks(socrata, SR311_DATASET, bbls, (list) => ({
        $select: "bbl,count(*) as n",
        // floating timestamps, New York time; the season's dates are ours, not user input
        $where: `complaint_type='HEAT/HOT WATER' AND agency='HPD' AND created_date>='${season.start}T00:00:00' AND created_date<='${season.end}T23:59:59.999' AND bbl in (${text(list)})`,
        $group: "bbl",
        $limit: "5000",
      }));
    case "litigation":
      return inChunks(socrata, LITIGATIONS_DATASET, bbls, (list) => ({ $select: "bbl,count(*) as n", $where: `bbl in (${text(list)})`, $group: "bbl", $limit: "5000" }));
    case "aep":
      return inChunks(socrata, AEP_DATASET, bbls, (list) => ({ $select: "bbl,current_status", $where: `bbl in (${text(list)})`, $limit: "5000" }));
  }
}

/** Citywide open Class B and C violations and PLUTO residential units: two aggregate queries. */
export async function fetchBaseline(socrata: Socrata): Promise<Baseline> {
  const [violations, units] = await Promise.all([
    socrata<{ class?: string; n?: string }>(VIOLATIONS_DATASET, {
      $select: "class,count(*) as n",
      $where: "violationstatus='Open' AND class in ('B','C')",
      $group: "class",
    }),
    socrata<{ units?: string }>(PLUTO_DATASET, { $select: "sum(unitsres) as units" }),
  ]);
  return { violations, units, asOf: nyDay(new Date()) };
}
