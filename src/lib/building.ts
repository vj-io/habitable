// Building history: map HPD violation wording to our six issues and summarize a building's open violations.
// Pure (no I/O) so the route, the fixtures builder and the tests share one implementation.
import type { BuildingRecord, HazardClass, IssueId } from "./types";

/** The columns we select from Socrata `wvxf-dwi5` (all text; Socrata omits null fields). */
export interface SocrataViolation {
  violationid: string;
  class?: string;
  inspectiondate?: string;
  novissueddate?: string;
  novdescription?: string;
}

export const DATASET_URL =
  "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5";

// Boiler-room access, entrance-door signage and window guards are not lock or paint problems.
const NOT_LOCK_OR_PAINT = /BOILER|HEATING SYSTEM|POST AND MAINTAIN A NOTICE|WINDOW GUARD/;

// First match wins, tested against UPPER(novdescription). Ported from the verified reference classifier:
// - `\bMOLD\b` not `MOLD`: avoids "MOLDING". Bare "LEAD" ("LEADING TO") and bare "WATER" are never matched.
// - 27-2033 (boiler-room access) matches no heat pattern; 27-2043.1 (window guards) is excluded from lock.
// - "FILE ANNUAL BEDBUG REPORT" is paperwork, not an infestation.
const RULES: { issue: IssueId | null; rx: RegExp; skipIfBoilerEtc?: true }[] = [
  { issue: "mold", rx: /27-2017\.3|\bMOLD\b/ },
  { issue: null, rx: /ANNUAL BEDBUG REPORT/ },
  {
    issue: "pests",
    rx: /27-2017\.4|27-2018\b|INFESTATION CONSISTING OF|NUISANCE CONSISTING OF (EVIDENCE OF )?(RATS?|MICE|ROACH)|\bROACHES?\b|\bMICE\b|\bRATS?\b|BEDBUGS?|\bVERMIN\b|\bRODENTS?\b/,
  },
  { issue: "heat_hot_water", rx: /27-2029|27-2031|ADEQUATE SUPPLY OF HEAT|HOT ?WATER|\bNO HEAT\b/ },
  { issue: "lock_door", rx: /SELF-CLOSING/ },
  { issue: "lock_door", rx: /\bLOCK|\bLATCH|DEAD ?BOLT|27-2043(?!\.1)/, skipIfBoilerEtc: true },
  {
    issue: "peeling_paint",
    rx: /27-2056|LEAD-BASED PAINT|PEELING PAINT|PLASTERED SURFACES AND PAINT|27-2013|\bPAINT\b/,
    skipIfBoilerEtc: true,
  },
  { issue: "leak", rx: /WATER LEAK|\bLEAK|DAMPNESS|MOISTURE|SEEPAGE|WATER DAMAGE|27-2026, ?2027/ },
];

/** Which of our issues an HPD violation description is about, or null when it is none of the six. */
export function violationIssue(description: string): IssueId | null {
  const d = (description ?? "").toUpperCase();
  const boilerEtc = NOT_LOCK_OR_PAINT.test(d);
  for (const r of RULES) {
    if (r.skipIfBoilerEtc && boilerEtc) continue;
    if (r.rx.test(d)) return r.issue;
  }
  return null;
}

// Leading citation noise: "§ 27-2026, 2027 HMC:", "HMC ADM CODE: § 27-2017.4", "567 (C) § ... HMC:", "(A) § HMC:",
// "§ 27-2045(B)(1)(B) HMC, § 12-06 RCNY ...". Only stripped when the text starts like a citation.
const CITATION_START = /^(?:§|\(|\d+\s*\(|HMC\b|ADM\b)/i;
const CITATION_TOKEN =
  /^(?:§|(?:HMC|ADM|ADMIN|CODE|RCNY|MDL|LAW|AND|M\/D)\b\.?|\d[\d.\-/]*(?:\(\s*[A-Z0-9]+\s*\))*|\(\s*[A-Z0-9]+\s*\)|[,;:.&\-\u2013])\s*/i;
const MAX_DESCRIPTION = 160;

/** Readable one-liner: citation prefix dropped, spaces collapsed, sentence case, capped near 160 characters. */
export function cleanDescription(raw: string): string {
  const flat = (raw ?? "").replace(/[\p{Cc}\s]+/gu, " ").replace(/ ,/g, ",").trim();
  let s = flat;
  if (CITATION_START.test(s)) for (let m = CITATION_TOKEN.exec(s); m; m = CITATION_TOKEN.exec(s)) s = s.slice(m[0].length);
  s = (s || flat)
    .toLowerCase()
    .replace(/\bapt (\w+)/g, (_, unit: string) => `apt ${unit.toUpperCase()}`)
    .replace(/\b(?:hpd|hmc|nyc|rcny)\b/g, (a) => a.toUpperCase());
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s.length <= MAX_DESCRIPTION) return s;
  return `${s.slice(0, MAX_DESCRIPTION - 1).replace(/\s+\S*$/, "")}\u2026`;
}

export const isoDate = (v?: string): string | null => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const hazard = (v?: string): HazardClass | null => (v === "A" || v === "B" || v === "C" ? v : null);

/** PLUTO `yearbuilt` is text; "0" means unknown. */
export function parseYearBuilt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1600 && n <= 2100 ? n : null;
}

export interface SummarizeOptions {
  bbl: string;
  yearBuilt: number | null;
  source: BuildingRecord["source"];
  /** True all-time totals when `rows` is only a capped page (Socrata `$limit`). Counts include class I in openTotal. */
  totals?: { openTotal: number; byClass: Record<HazardClass, number> };
  /** Defaults to now; pass a fixed value for deterministic fixtures. */
  fetchedAt?: string;
}

export const emptyByIssue = (): Record<IssueId, number> => ({
  leak: 0,
  mold: 0,
  heat_hot_water: 0,
  pests: 0,
  lock_door: 0,
  peeling_paint: 0,
});

/** Count open violation rows by class and issue and keep the 25 newest. Class "I" rows count toward openTotal only. */
export function summarize(rows: SocrataViolation[], opts: SummarizeOptions): BuildingRecord {
  const byClass: Record<HazardClass, number> = { A: 0, B: 0, C: 0 };
  const byIssue = emptyByIssue();
  const all = rows.map((r) => {
    const hazardClass = hazard(r.class);
    const issue = violationIssue(r.novdescription ?? "");
    if (hazardClass) byClass[hazardClass] += 1;
    if (issue) byIssue[issue] += 1;
    return { id: r.violationid, date: isoDate(r.inspectiondate) ?? isoDate(r.novissueddate), hazardClass, r, issue };
  });
  // ISO dates sort as strings; undated rows go last. Array.sort is stable, so ties keep Socrata's order.
  const newest = [...all].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 25);
  return {
    bbl: opts.bbl,
    yearBuilt: opts.yearBuilt,
    openTotal: opts.totals?.openTotal ?? rows.length,
    byClass: opts.totals?.byClass ?? byClass,
    byIssue,
    recent: newest.map(({ id, date, hazardClass, r, issue }) => ({
      id,
      date,
      hazardClass,
      description: cleanDescription(r.novdescription ?? ""),
      issue,
    })),
    sourceUrl: DATASET_URL,
    fetchedAt: opts.fetchedAt ?? new Date().toISOString(),
    source: opts.source,
  };
}
