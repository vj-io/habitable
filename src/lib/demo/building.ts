import type { Address } from "../types";

// Demo building: a real NYC building with a public HPD violation record (public building data only).
// Counts verified against NYC Open Data on 2026-10-24; fixtures in ./fixtures/.
export const DEMO_ADDRESS: Address = {
  label: "618 West 136th Street, Manhattan, NY 10031",
  borough: "Manhattan",
  zip: "10031",
  bbl: "1020020091",
  bin: "1059976",
  lat: 40.821049,
  lng: -73.955775,
};
export const DEMO_UNIT = "4B (demo)";
export const DEMO_YEAR_BUILT = 1905;

/** BBLs that have saved fixtures in ./fixtures (used when the live Open Data call fails). */
export const FIXTURE_BBLS = ["1020020091", "3051900075", "2043220010"] as const;
