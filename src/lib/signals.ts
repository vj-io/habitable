// Building risk signals from three HPD datasets on NYC Open Data: complaints and problems (ygpa-z7cr), litigations
// (59kj-x8nc) and the Alternative Enforcement Program list (hcir-3275). Pure (no I/O): the route, the demo fixtures
// and the tests share it. Only aggregates are kept; the complaints dataset also carries apartment numbers, which
// are other tenants' and never leave the query (the select is a group-by on category).
import type { BuildingSignals } from "./types";

export const COMPLAINTS_DATASET = "ygpa-z7cr";
export const LITIGATIONS_DATASET = "59kj-x8nc";
export const AEP_DATASET = "hcir-3275";
export const COMPLAINTS_URL = "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Complaints-and-Problems/ygpa-z7cr";
export const LITIGATIONS_URL = "https://data.cityofnewyork.us/Housing-Development/Housing-Litigations/59kj-x8nc";
export const AEP_URL = "https://data.cityofnewyork.us/Housing-Development/Buildings-Selected-for-the-Alternative-Enforcement/hcir-3275";

export interface SignalRows {
  /** `$select=major_category,count(*) as n … $group=major_category`: counts arrive as text. */
  complaints: { major_category?: string; n?: string }[];
  /** `$select=count(*) as n`: one row. */
  litigation: { n?: string }[];
  /** Every AEP row for the lot: one per round, e.g. an old "AEP Discharged" next to a current "AEP Active". */
  aep: { current_status?: string }[];
}

/** The window's first day: 12 months before `now`, as an ISO date. */
export const complaintsSince = (now: Date): string => new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);

const count = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : 0);

export function buildSignals(since: string, rows: SignalRows): BuildingSignals {
  return {
    since,
    complaints: rows.complaints
      .map((r) => ({ category: (r.major_category ?? "").trim(), n: count(r.n) }))
      .filter((c) => c.category && c.n > 0)
      .sort((a, b) => b.n - a.n || a.category.localeCompare(b.category)),
    litigations: count(rows.litigation[0]?.n),
    // A building can have several rounds; one active round is enough.
    aep: rows.aep.some((r) => r.current_status === "AEP Active"),
  };
}

/** "UNSANITARY CONDITION" -> "Unsanitary condition", "HEAT/HOT WATER" -> "Heat/hot water". */
export const categoryLabel = (c: string): string => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
