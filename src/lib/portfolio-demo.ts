// Saved landlord track records for the demo buildings: GET /api/landlord answered live for each BBL on 2026-10-25 and
// stored as is in ./demo/fixtures/<bbl>-landlord.json (`fetchedAt` is when; `portfolio.asOf` dates the HPD registration
// snapshot; `baseline.asOf` the citywide counts).
import l1020020091 from "./demo/fixtures/1020020091-landlord.json";
import l2043220010 from "./demo/fixtures/2043220010-landlord.json";
import l3051900075 from "./demo/fixtures/3051900075-landlord.json";
import type { LandlordRecord } from "./portfolio";

const SAVED = { "1020020091": l1020020091, "2043220010": l2043220010, "3051900075": l3051900075 } as Record<string, LandlordRecord>;

/** The saved record for a demo BBL, or null for any other building. */
export function demoLandlord(bbl: string): LandlordRecord | null {
  const saved = SAVED[bbl];
  return saved ? { ...saved, source: "demo-fixture" } : null;
}
