import { describe, expect, it } from "vitest";
import { classICount } from "@/lib/building";
import {
  PORTFOLIO_CAP,
  SAVED_BASELINE,
  addressKey,
  bblOf,
  chunk,
  currentBuildings,
  keyWhere,
  lastHeatSeason,
  linkCounts,
  matchContacts,
  portfolioKeys,
  scorePortfolio,
  type LinkKind,
  type LotRegistrationRow,
  type MetricRows,
  type Portfolio,
  type PortfolioKey,
} from "@/lib/portfolio";
import type { ContactRow } from "@/lib/registration";

// Real Socrata rows (HPD feu5-w2e2 / tesw-yqqr, fetched 2026-10-25) unless a comment says otherwise.
// Registration 200271, 2140 Barnes Avenue, Bronx: one office written three ways, plus an officer and a super.
const PARKOFF: ContactRow[] = [
  { registrationcontactid: "20027103", registrationid: "200271", type: "CorporateOwner", corporationname: "BP ASSETS 46, LLC", businesshousenumber: "110", businessstreetname: "EAST 55TH STREET", businesszip: "10022" },
  { registrationcontactid: "20027104", registrationid: "200271", type: "Agent", corporationname: "NEW PARK MANAGEMENT, LLC", firstname: "DAVID", lastname: "FRIEDMAN", businesshousenumber: "110", businessstreetname: "EAST 55TH ST", businesszip: "10021" },
  { registrationcontactid: "20027105", registrationid: "200271", type: "HeadOfficer", firstname: "ADAM", lastname: "PARKOFF", businesshousenumber: "110", businessstreetname: "E. 55TH STREET", businesszip: "10022" },
  { registrationcontactid: "20027106", registrationid: "200271", type: "Officer", firstname: "ALLISON", lastname: "ANDERSON", businesshousenumber: "110", businessstreetname: "E. 55TH STREET", businesszip: "10022" },
  { registrationcontactid: "20027113", registrationid: "200271", type: "SiteManager", firstname: "JOSE", lastname: "POLANCO" },
];

// Registration 351922, 2505 Bedford Avenue, Brooklyn: the head officer is filed at a PO box and, as the agent, at an office.
const POMERANTZ: ContactRow[] = [
  { registrationcontactid: "35192201", registrationid: "351922", type: "HeadOfficer", firstname: "JOSHUA", lastname: "POMERANTZ", businesshousenumber: "POB", businessstreetname: "319", businesszip: "11204" },
  { registrationcontactid: "35192202", registrationid: "351922", type: "CorporateOwner", corporationname: "2505 BEDFORD 2015 LLC", businesshousenumber: "POB", businessstreetname: "319", businesszip: "11204" },
  { registrationcontactid: "35192203", registrationid: "351922", type: "Agent", firstname: "JOSHUA", lastname: "POMERANTZ", businesshousenumber: "1417", businessstreetname: "AVENUE J", businesszip: "11230" },
];

// Registrations 109944, 111435, 120724 and 207872: the demo building's landlord (EDWIN SHIRAZ / SHIRAZIAN, 579 5th Ave).
const SHIRAZ_ROWS: LotRegistrationRow[] = [
  { registrationid: "109944", buildingid: "40948", boroid: "1", block: "2002", lot: "91", housenumber: "618", lowhousenumber: "618", highhousenumber: "620", streetname: "WEST 136 STREET", bin: "1059976", lastregistrationdate: "2025-10-28T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" },
  { registrationid: "111435", buildingid: "40740", boroid: "1", block: "1940", lot: "45", housenumber: "234", lowhousenumber: "234", highhousenumber: "240", streetname: "WEST 135 STREET", bin: "1058850", lastregistrationdate: "2025-10-28T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" },
  { registrationid: "120724", buildingid: "40950", boroid: "1", block: "2002", lot: "93", housenumber: "622", lowhousenumber: "622", highhousenumber: "622", streetname: "WEST 136 STREET", bin: "1059977", lastregistrationdate: "2025-10-28T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" },
  { registrationid: "207872", buildingid: "66884", boroid: "2", block: "3276", lot: "35", housenumber: "357", lowhousenumber: "357", highhousenumber: "357", streetname: "EAST 193 STREET", bin: "2016343", lastregistrationdate: "2024-11-20T00:00:00.000", registrationenddate: "2025-09-01T00:00:00.000" },
];

const key = (keys: PortfolioKey[], kind: LinkKind) => keys.filter((k) => k.kind === kind);

describe("addressKey", () => {
  it("reads one office the same however it was typed", () => {
    const office = ["EAST 55TH STREET", "EAST 55TH ST", "E. 55TH STREET", "E 55TH ST", "East 55 Street", "  east  55th   st. "];
    const keys = office.map((s) => addressKey({ businesshousenumber: "110", businessstreetname: s }));
    expect(new Set(keys)).toEqual(new Set(["110|EAST 55 STREET"]));
    expect(addressKey({ businesshousenumber: "579", businessstreetname: "5th ave" })).toBe(addressKey({ businesshousenumber: "579", businessstreetname: "5TH AVENUE" }));
  });

  it("keeps different numbers, streets and missing streets apart", () => {
    expect(addressKey({ businesshousenumber: "5", businessstreetname: "5th ave" })).not.toBe(addressKey({ businesshousenumber: "579", businessstreetname: "5th ave" }));
    expect(addressKey({ businesshousenumber: "110", businessstreetname: "EAST 55TH ST" })).not.toBe(addressKey({ businesshousenumber: "110", businessstreetname: "WEST 55TH ST" }));
    expect(addressKey({ businesshousenumber: "12", businessstreetname: "" })).toBeNull();
    expect(addressKey({})).toBeNull();
  });
});

describe("portfolioKeys", () => {
  it("follows the head officer and agent by name and address, the corporate owner by name; never the officer or the super", () => {
    const keys = portfolioKeys([...PARKOFF, PARKOFF[2]]); // contact rows can repeat
    expect(keys).toEqual([
      { kind: "headOfficer", name: "ADAM PARKOFF", person: { first: "ADAM", last: "PARKOFF" }, company: "", addresses: ["110|EAST 55 STREET"] },
      { kind: "owner", name: "BP ASSETS 46, LLC", person: null, company: "BP ASSETS 46, LLC", addresses: null },
      {
        kind: "agent",
        name: "DAVID FRIEDMAN, NEW PARK MANAGEMENT, LLC",
        person: { first: "DAVID", last: "FRIEDMAN" },
        company: "NEW PARK MANAGEMENT, LLC",
        addresses: ["110|EAST 55 STREET"],
      },
    ]);
  });

  it("accepts every address this registration lists for the same person", () => {
    const [officer] = key(portfolioKeys(POMERANTZ), "headOfficer");
    expect(officer.addresses).toEqual(["POB|319", "1417|AVENUE J"]);
  });

  it("drops a person with no business address (a namesake couldn't be told apart)", () => {
    const keys = portfolioKeys([{ registrationcontactid: "1", registrationid: "9", type: "HeadOfficer", firstname: "JOHN", lastname: "SMITH" }]);
    expect(keys).toEqual([]);
  });
});

describe("keyWhere", () => {
  it("matches the person or the company for the key's contact type, apostrophes escaped", () => {
    const [agent] = key(portfolioKeys(PARKOFF), "agent");
    expect(keyWhere(agent)).toBe(
      "type='Agent' AND ((upper(trim(firstname))='DAVID' AND upper(trim(lastname))='FRIEDMAN') OR upper(trim(corporationname))='NEW PARK MANAGEMENT, LLC')",
    );
    const owner: PortfolioKey = { kind: "owner", name: "O'NEIL REALTY LLC", person: null, company: "O'NEIL REALTY LLC", addresses: null };
    expect(keyWhere(owner)).toBe("type='CorporateOwner' AND (upper(trim(corporationname))='O''NEIL REALTY LLC')");
  });
});

describe("matchContacts", () => {
  const keys = portfolioKeys(PARKOFF);
  const rows: ContactRow[] = [
    // the same agent at the same office, written another way; and the same row twice
    { registrationcontactid: "12777104", registrationid: "127771", type: "Agent", corporationname: "NEW PARK MANAGEMENT, LLC", firstname: "DAVID", lastname: "FRIEDMAN", businesshousenumber: "110", businessstreetname: "E 55TH ST", businesszip: "10022" },
    { registrationcontactid: "12777104", registrationid: "127771", type: "Agent", corporationname: "NEW PARK MANAGEMENT, LLC", firstname: "DAVID", lastname: "FRIEDMAN", businesshousenumber: "110", businessstreetname: "E 55TH ST", businesszip: "10022" },
    // a different DAVID FRIEDMAN, managing agent in Sunset Park (address as published; ids illustrative)
    { registrationcontactid: "30000104", registrationid: "300001", type: "Agent", firstname: "DAVID", lastname: "FRIEDMAN", businesshousenumber: "5302", businessstreetname: "6TH AVENUE", businesszip: "11220" },
    // ADAM PARKOFF as head officer of another building, and the same name filed as a plain officer (not followed)
    { registrationcontactid: "20027005", registrationid: "200270", type: "HeadOfficer", firstname: "ADAM", lastname: "PARKOFF", businesshousenumber: "110", businessstreetname: "EAST 55TH ST", businesszip: "10022" },
    { registrationcontactid: "40000106", registrationid: "400001", type: "Officer", firstname: "ADAM", lastname: "PARKOFF", businesshousenumber: "110", businessstreetname: "EAST 55TH ST", businesszip: "10022" },
    // the corporate owner's name matches on its own, wherever it is filed
    { registrationcontactid: "50000103", registrationid: "500001", type: "CorporateOwner", corporationname: "  bp assets 46, llc ", businesshousenumber: "1", businessstreetname: "PO BOX" },
  ];

  it("links each registration by the keys it shares; namesakes at other addresses are left out", () => {
    const m = matchContacts(keys, rows);
    expect(Object.fromEntries([...m].map(([id, kinds]) => [id, [...kinds]]))).toEqual({
      "127771": ["agent"],
      "200270": ["headOfficer"],
      "500001": ["owner"],
    });
  });
});

describe("bblOf", () => {
  it("pads block and lot back to a 10-digit BBL", () => {
    expect(bblOf({ boroid: "1", block: "2002", lot: "91" })).toBe("1020020091");
    expect(bblOf({ boroid: "3", block: "1", lot: "1" })).toBe("3000010001");
    expect(bblOf({ boroid: "1", block: "2002" })).toBeNull();
    expect(bblOf({ boroid: "9", block: "2002", lot: "91" })).toBeNull();
  });
});

describe("currentBuildings", () => {
  const matched = new Map<string, Set<LinkKind>>([
    ["109944", new Set<LinkKind>(["headOfficer", "owner", "agent"])],
    ["111435", new Set<LinkKind>(["agent"])],
    ["120724", new Set<LinkKind>(["agent", "owner", "headOfficer"])],
    ["207872", new Set<LinkKind>(["agent"])],
  ]);

  it("maps registrations to tax lots: this building, then owner-side links, then agent-only; links in a fixed order", () => {
    const { buildings, found } = currentBuildings(matched, SHIRAZ_ROWS, "1020020091");
    expect(found).toBe(4);
    expect(buildings).toEqual([
      { bbl: "1020020091", address: "618-620 WEST 136 STREET", links: ["headOfficer", "owner", "agent"] },
      { bbl: "1020020093", address: "622 WEST 136 STREET", links: ["headOfficer", "owner", "agent"] },
      { bbl: "1019400045", address: "234-240 WEST 135 STREET", links: ["agent"] },
      { bbl: "2032760035", address: "357 EAST 193 STREET", links: ["agent"] },
    ]);
    expect(linkCounts(buildings)).toEqual([
      { kind: "headOfficer", buildings: 2 },
      { kind: "owner", buildings: 2 },
      { kind: "agent", buildings: 4 },
    ]);
  });

  it("leaves out a building someone else has registered since", () => {
    // illustrative: building 66884 re-registered in 2026 under a registration that matched none of the names
    const resold: LotRegistrationRow = { ...SHIRAZ_ROWS[3], registrationid: "999001", lastregistrationdate: "2026-03-02T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" };
    const { buildings } = currentBuildings(matched, [...SHIRAZ_ROWS, resold], "1020020091");
    expect(buildings.map((b) => b.bbl)).not.toContain("2032760035");
  });

  it("counts two registered buildings on one lot once, with both links", () => {
    const second: LotRegistrationRow = { ...SHIRAZ_ROWS[1], registrationid: "111436", buildingid: "40741", housenumber: "242" };
    const m = new Map(matched).set("111436", new Set<LinkKind>(["owner"]));
    const lot = currentBuildings(m, [...SHIRAZ_ROWS, second], "1020020091").buildings.find((b) => b.bbl === "1019400045");
    expect(lot?.links).toEqual(["owner", "agent"]);
  });

  it(`keeps at most ${PORTFOLIO_CAP} lots and says how many were found`, () => {
    const rows: LotRegistrationRow[] = Array.from({ length: 300 }, (_, i) => ({
      registrationid: String(600000 + i),
      buildingid: String(700000 + i),
      boroid: "2",
      block: String(3000 + i),
      lot: "1",
      streetname: "TEST AVENUE",
      registrationenddate: "2026-09-01T00:00:00.000",
    }));
    const m = new Map(rows.map((r) => [r.registrationid, new Set<LinkKind>(["agent"])]));
    m.set("600280", new Set<LinkKind>(["owner"])); // an owner-side link survives the cut ahead of agent-only lots
    const subject = "2032990001"; // the last one by BBL still comes first
    const { buildings, found } = currentBuildings(m, rows, subject);
    expect(found).toBe(300);
    expect(buildings).toHaveLength(PORTFOLIO_CAP);
    expect(buildings.slice(0, 3).map((b) => b.bbl)).toEqual([subject, "2032800001", "2030000001"]);
    expect(linkCounts(buildings)).toEqual([
      { kind: "owner", buildings: 1 },
      { kind: "agent", buildings: 249 },
    ]);
  });
});

describe("chunk", () => {
  it("splits in-lists into pieces of 100", () => {
    const xs = Array.from({ length: 250 }, (_, i) => String(i));
    expect(chunk(xs).map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunk(xs).flat()).toEqual(xs);
    expect(chunk([])).toEqual([]);
  });
});

describe("lastHeatSeason", () => {
  it("is the last complete Oct 1 – May 31 season, on the New York calendar", () => {
    expect(lastHeatSeason(new Date("2026-10-25T12:00:00Z"))).toEqual({ start: "2025-10-01", end: "2026-05-31" });
    expect(lastHeatSeason(new Date("2027-03-01T12:00:00Z"))).toEqual({ start: "2025-10-01", end: "2026-05-31" });
    expect(lastHeatSeason(new Date("2026-06-01T12:00:00Z"))).toEqual({ start: "2025-10-01", end: "2026-05-31" });
    // 02:00 UTC on Jun 1 is still May 31 in New York: that season isn't over yet
    expect(lastHeatSeason(new Date("2026-06-01T02:00:00Z"))).toEqual({ start: "2024-10-01", end: "2025-05-31" });
  });
});

describe("scorePortfolio", () => {
  const portfolio: Portfolio = {
    asOf: "2026-07-31",
    registered: true,
    keys: [{ kind: "headOfficer", name: "EDWIN SHIRAZ" }],
    buildings: [
      { bbl: "1020020091", address: "618-620 WEST 136 STREET", links: ["headOfficer"] },
      { bbl: "1020020093", address: "622 WEST 136 STREET", links: ["headOfficer"] },
      { bbl: "1019400045", address: "234-240 WEST 135 STREET", links: ["agent"] },
      { bbl: "2032760035", address: "357 EAST 193 STREET", links: ["agent"] },
      { bbl: "2000010001", address: "1 TEST PLACE", links: ["agent"] },
      { bbl: "2000010002", address: "2 TEST PLACE", links: ["agent"] },
    ],
    found: 6,
    capped: false,
  };
  // Aggregate rows as Socrata sends them; numbers illustrative. 9999999999 is not in the portfolio and must be ignored.
  const rows: MetricRows = {
    violations: [
      { bbl: "1020020091", class: "A", n: "54" },
      { bbl: "1020020091", class: "B", n: "154" },
      { bbl: "1020020091", class: "C", n: "82" },
      { bbl: "1020020091", class: "I", n: "1" },
      { bbl: "1020020093", class: "B", n: "10" },
      { bbl: "1020020093", class: "C", n: "20" },
      { bbl: "1019400045", class: "C", n: "82" },
      { bbl: "2032760035", class: "C", n: "3" },
      { bbl: "2000010001", class: "C", n: "1" },
      { bbl: "2000010002", class: "C", n: "1" },
      { bbl: "9999999999", class: "C", n: "500" },
    ],
    // PLUTO sends bbl as a number; 2000010002 has no PLUTO count, so its violations stay out of the per-100 rate
    pluto: [
      { bbl: "1020020091.00000000", unitsres: "28" },
      { bbl: "1020020093.00000000", unitsres: "17" },
      { bbl: "1019400045.00000000", unitsres: "40" },
      { bbl: "2032760035.00000000", unitsres: "6" },
      { bbl: "2000010001.00000000", unitsres: "9" },
      { bbl: "2000010002.00000000", unitsres: "0" },
      { bbl: "9999999999.00000000", unitsres: "1000" },
    ],
    heat: [
      { bbl: "1020020091", n: "10" },
      { bbl: "1020020093", n: "19" },
      { bbl: "9999999999", n: "400" },
    ],
    litigation: [{ bbl: "1020020091", n: "3" }],
    aep: [
      { bbl: "2032760035", current_status: "AEP Discharged" },
      { bbl: "1019400045", current_status: "AEP Discharged" },
      { bbl: "1019400045", current_status: "AEP Active" },
    ],
    // citywide, as fetched live on 2026-10-25
    baseline: SAVED_BASELINE,
  };
  const meta = { bbl: "1020020091", season: { start: "2025-10-01", end: "2026-05-31" }, source: "live" as const, fetchedAt: "2026-10-25T00:00:00.000Z" };

  it("adds up the portfolio's own lots and compares B+C per 100 apartments with the city", () => {
    const r = scorePortfolio(portfolio, rows, meta);
    expect(r.open).toEqual({ byClass: { A: 54, B: 164, C: 189 }, total: 408 });
    expect(classICount(408, r.open!.byClass)).toBe(1); // the one class I row is in the total only
    expect(r.units).toEqual({ total: 100, buildings: 5 });
    // B+C at lots with a unit count: 236 + 30 + 82 + 3 + 1 = 352 over 100 apartments; the 1 at 2000010002 is left out
    expect(r.bcPer100).toBe(352);
    // 1,974,942 / 3,736,645 * 100 = 52.853…
    expect(r.baseline).toEqual({ bc: 1974942, units: 3736645, per100: 52.9, asOf: "2026-10-25" });
    expect(r.ratio).toBe(6.7); // 352 / 52.853… = 6.66…
    expect(r.heat311).toBe(29);
    expect(r.litigations).toBe(3);
    expect(r.aep).toBe(1);
  });

  it("rounds the rate and the ratio to one decimal from the unrounded values", () => {
    const small: MetricRows = { ...rows, violations: [{ bbl: "1020020093", class: "B", n: "7" }], pluto: [{ bbl: "1020020093", unitsres: "45" }] };
    const r = scorePortfolio(portfolio, small, meta);
    expect(r.bcPer100).toBe(15.6); // 7 / 45 * 100 = 15.555…
    expect(r.ratio).toBe(0.3); // 15.555… / 52.853… = 0.294…
  });

  it("lists the five lots with the most open Class C violations, ties by BBL, none without one", () => {
    const r = scorePortfolio(portfolio, rows, meta);
    expect(r.worst?.map((w) => [w.bbl, w.c, w.units])).toEqual([
      ["1019400045", 82, 40],
      ["1020020091", 82, 28],
      ["1020020093", 20, 17],
      ["2032760035", 3, 6],
      ["2000010001", 1, 9],
    ]);
    const fewer = scorePortfolio(portfolio, { ...rows, violations: [{ bbl: "2032760035", class: "C", n: "2" }, { bbl: "1020020091", class: "B", n: "9" }] }, meta);
    expect(fewer.worst?.map((w) => w.bbl)).toEqual(["2032760035"]);
  });

  it("leaves out only what failed", () => {
    const noViolations = scorePortfolio(portfolio, { ...rows, violations: null }, meta);
    expect([noViolations.open, noViolations.bcPer100, noViolations.ratio, noViolations.worst]).toEqual([null, null, null, null]);
    expect(noViolations.units?.total).toBe(100);
    expect(noViolations.heat311).toBe(29);

    const noPluto = scorePortfolio(portfolio, { ...rows, pluto: null }, meta);
    expect([noPluto.units, noPluto.bcPer100, noPluto.ratio]).toEqual([null, null, null]);
    expect(noPluto.worst?.[0]).toMatchObject({ c: 82, units: null });

    const noBaseline = scorePortfolio(portfolio, { ...rows, baseline: null }, meta);
    expect([noBaseline.baseline, noBaseline.ratio]).toEqual([null, null]);
    expect(noBaseline.bcPer100).toBe(352);

    const none = scorePortfolio(portfolio, { violations: null, pluto: null, heat: null, litigation: null, aep: null, baseline: null }, meta);
    expect([none.heat311, none.litigations, none.aep]).toEqual([null, null, null]);
    expect(none.portfolio.buildings).toHaveLength(6);
  });
});
