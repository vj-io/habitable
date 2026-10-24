import { describe, expect, it } from "vitest";
import { demoBuilding } from "@/lib/demo/summaries";
import {
  buildRegistration,
  houseNumberOf,
  isOldRegistration,
  parseBbl,
  pickRegistrationRow,
  registrationInfo,
  snapshotLabel,
  suggestAddressee,
  type ContactRow,
  type RegistrationRow,
} from "@/lib/registration";
import type { Registration } from "@/lib/types";

// Real Socrata rows (HPD tesw-yqqr / feu5-w2e2, fetched 2026-10-24/25) for BBL 2029610018, 1306-1312 Boston Road, Bronx:
// four buildings on one lot, two of them last registered in 1993-94, and contacts that include a super and an officer.
const BRONX_ROWS: RegistrationRow[] = [
  { registrationid: "203047", buildingid: "806304", housenumber: "1310", lowhousenumber: "1310", highhousenumber: "1310", streetname: "BOSTON ROAD", bin: "2092156", lastregistrationdate: "2026-07-16T00:00:00.000", registrationenddate: "2027-09-01T00:00:00.000" },
  { registrationid: "207071", buildingid: "50400", housenumber: "1306", lowhousenumber: "1306", highhousenumber: "1306", streetname: "BOSTON ROAD", bin: "2010170", lastregistrationdate: "2026-07-16T00:00:00.000", registrationenddate: "2027-09-01T00:00:00.000" },
  { registrationid: "207072", buildingid: "806303", housenumber: "1308", lowhousenumber: "1308", highhousenumber: "1308", streetname: "BOSTON ROAD", bin: "0", lastregistrationdate: "1993-04-01T00:00:00.000", registrationenddate: "1994-05-31T00:00:00.000" },
  { registrationid: "203046", buildingid: "806305", housenumber: "1312", lowhousenumber: "1312", highhousenumber: "1312", streetname: "BOSTON ROAD", bin: "0", lastregistrationdate: "1993-04-01T00:00:00.000", registrationenddate: "1994-05-31T00:00:00.000" },
];

const BRONX_CONTACTS: ContactRow[] = [
  { registrationcontactid: "20304703", registrationid: "203047", type: "CorporateOwner", corporationname: "LOSOKA LLC", businesshousenumber: "1310", businessstreetname: "BOSTON RD", businesscity: "BX", businessstate: "NY", businesszip: "10456" },
  { registrationcontactid: "20304705", registrationid: "203047", type: "HeadOfficer", firstname: "LOUIS", lastname: "PLEVRITIS", businesshousenumber: "12", businessstreetname: "MORLEY COURT", businesscity: "Albertson", businessstate: "NY", businesszip: "11507" },
  { registrationcontactid: "20304706", registrationid: "203047", type: "Officer", firstname: "SOPHIA", lastname: "MITSIOS", businesshousenumber: "12", businessstreetname: "MORLEY COURT", businesscity: "Albertson", businessstate: "NY", businesszip: "11507" },
  { registrationcontactid: "20304713", registrationid: "203047", type: "SiteManager", firstname: "Louis", lastname: "PLEVRITIS" },
  { registrationcontactid: "20304704", registrationid: "203047", type: "Agent", corporationname: "LOSOKA LLC", firstname: "LOUIS", lastname: "PLEVRITIS", businesshousenumber: "2811", businessstreetname: "DITMAS BLVD", businesscity: "ASTORIA", businessstate: "NY", businesszip: "11105" },
];

const ids = (r: RegistrationRow | null) => r?.registrationid ?? null;

describe("parseBbl", () => {
  it("reads borough, block and lot as numbers (leading zeros dropped)", () => {
    expect(parseBbl("1020020091")).toEqual({ boroid: 1, block: 2002, lot: 91 });
    expect(parseBbl("2029610018")).toEqual({ boroid: 2, block: 2961, lot: 18 });
    expect(parseBbl("3000010001")).toEqual({ boroid: 3, block: 1, lot: 1 });
  });
  it("rejects anything that is not 10 digits", () => {
    expect(parseBbl("102002009")).toBeNull();
    expect(parseBbl("10200200ab")).toBeNull();
    expect(parseBbl("")).toBeNull();
  });
});

describe("houseNumberOf", () => {
  it.each([
    ["618 West 136th Street, Manhattan, NY 10031", "618"],
    ["123-45 Roosevelt Avenue, Queens, NY 11368", "123-45"],
    ["2505 Bedford Avenue, Brooklyn, NY", "2505"],
    ["12A Main Street, Staten Island, NY", "12A"],
    ["Apt 4, Somewhere", null],
    ["", null],
  ])("%j -> %j", (label, want) => {
    expect(houseNumberOf(label)).toBe(want);
  });
});

describe("pickRegistrationRow", () => {
  it("takes the newest registration on the lot when nothing says which building", () => {
    const row = pickRegistrationRow(BRONX_ROWS);
    expect(row?.registrationenddate).toBe("2027-09-01T00:00:00.000");
    expect(["203047", "207071"]).toContain(ids(row));
  });

  it("prefers the building with the case's BIN", () => {
    expect(ids(pickRegistrationRow(BRONX_ROWS, { bin: "2010170" }))).toBe("207071");
    expect(ids(pickRegistrationRow(BRONX_ROWS, { bin: "2092156" }))).toBe("203047");
  });

  it("falls back to the house number, including a range, when the BIN is missing, unknown or unmatched", () => {
    expect(ids(pickRegistrationRow(BRONX_ROWS, { houseNumber: "1306" }))).toBe("207071");
    expect(ids(pickRegistrationRow(BRONX_ROWS, { bin: "9999999", houseNumber: "1310" }))).toBe("203047");
    const range: RegistrationRow[] = [{ registrationid: "1", buildingid: "10", housenumber: "618", lowhousenumber: "618", highhousenumber: "620", streetname: "X ST" }];
    expect(ids(pickRegistrationRow(range, { houseNumber: "620" }))).toBe("1");
  });

  it("ignores a BIN of 0: HPD writes it when it has none, so it would match unrelated buildings", () => {
    const row = pickRegistrationRow(BRONX_ROWS, { bin: "0" });
    expect(row?.registrationenddate).toBe("2027-09-01T00:00:00.000");
  });

  it("still returns an old registration when that is the building's only one", () => {
    const row = pickRegistrationRow(BRONX_ROWS, { houseNumber: "1308" });
    expect(ids(row)).toBe("207072");
    expect(row?.registrationenddate).toBe("1994-05-31T00:00:00.000");
  });

  it("keeps each building's newest row: current beats an older registration of the same building", () => {
    const rows: RegistrationRow[] = [
      { registrationid: "1", buildingid: "7", lastregistrationdate: "1993-04-01T00:00:00.000", registrationenddate: "1994-05-31T00:00:00.000" },
      { registrationid: "2", buildingid: "7", lastregistrationdate: "2025-10-28T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" },
    ];
    expect(ids(pickRegistrationRow(rows))).toBe("2");
  });

  it("breaks an end-date tie with the later registration date, and copes with missing dates", () => {
    const rows: RegistrationRow[] = [
      { registrationid: "1", buildingid: "1", lastregistrationdate: "2025-01-01T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" },
      { registrationid: "2", buildingid: "2", lastregistrationdate: "2025-06-01T00:00:00.000", registrationenddate: "2026-09-01T00:00:00.000" },
      { registrationid: "3", buildingid: "3" },
    ];
    expect(ids(pickRegistrationRow(rows))).toBe("2");
  });

  it("returns null when the lot has no registration", () => {
    expect(pickRegistrationRow([])).toBeNull();
  });
});

describe("buildRegistration", () => {
  const row = BRONX_ROWS[0];
  const reg = buildRegistration(row, BRONX_CONTACTS);

  it("carries ids, dates and the registered address", () => {
    expect(reg).toMatchObject({ registrationId: "203047", buildingId: "806304", buildingAddress: "1310 BOSTON ROAD", lastRegistered: "2026-07-16", endDate: "2027-09-01" });
    expect(buildRegistration({ ...BRONX_ROWS[1], lowhousenumber: "618", highhousenumber: "620", housenumber: "618" }, []).buildingAddress).toBe("618-620 BOSTON ROAD");
  });

  it("names the managing agent (person, then company), head officer and owner with their addresses as published", () => {
    expect(reg.agent).toEqual({ name: "LOUIS PLEVRITIS, LOSOKA LLC", address: "2811 DITMAS BLVD, ASTORIA, NY 11105" });
    expect(reg.headOfficer).toEqual({ name: "LOUIS PLEVRITIS", address: "12 MORLEY COURT, Albertson, NY 11507" });
    expect(reg.owner).toEqual({ name: "LOSOKA LLC", address: "1310 BOSTON RD, BX, NY 10456" });
  });

  it("never uses the super (SiteManager) or other officers", () => {
    const only: ContactRow[] = BRONX_CONTACTS.filter((c) => c.type === "SiteManager" || c.type === "Officer");
    expect(buildRegistration(row, only)).toMatchObject({ agent: null, headOfficer: null, owner: null });
  });

  it("de-duplicates contacts by id and ignores other registrations' contacts", () => {
    const noisy: ContactRow[] = [
      ...BRONX_CONTACTS,
      ...BRONX_CONTACTS,
      { registrationcontactid: "1", registrationid: "999999", type: "Agent", firstname: "SOMEONE", lastname: "ELSE", businessstreetname: "ELSEWHERE" },
    ];
    expect(buildRegistration(row, noisy)).toEqual(reg);
  });

  it("prefers a corporate owner, then an individual, then a joint owner", () => {
    const owner = (type: string, id: string, name: string): ContactRow => ({ registrationcontactid: id, type, firstname: name, lastname: "O" });
    const all = [owner("JointOwner", "3", "JOINT"), owner("IndividualOwner", "2", "INDIVIDUAL"), { registrationcontactid: "1", type: "CorporateOwner", corporationname: "CORP LLC" }];
    expect(buildRegistration(row, all).owner?.name).toBe("CORP LLC");
    expect(buildRegistration(row, all.slice(0, 2)).owner?.name).toBe("INDIVIDUAL O");
    expect(buildRegistration(row, all.slice(0, 1)).owner?.name).toBe("JOINT O");
  });

  it("prefers an agent with an address over one without", () => {
    const agents: ContactRow[] = [
      { registrationcontactid: "1", type: "Agent", firstname: "NO", lastname: "ADDRESS" },
      { registrationcontactid: "2", type: "Agent", firstname: "HAS", lastname: "ADDRESS", businesshousenumber: "5", businessstreetname: "MAIN ST", businesscity: "NEW YORK", businessstate: "NY", businesszip: "10001" },
    ];
    expect(buildRegistration(row, agents).agent).toEqual({ name: "HAS ADDRESS", address: "5 MAIN ST, NEW YORK, NY 10001" });
  });

  it("writes an address with an apartment line, a PO box (house number 'POB'), or none", () => {
    const one = (c: Partial<ContactRow>) => buildRegistration(row, [{ registrationcontactid: "1", type: "Agent", firstname: "A", lastname: "B", ...c }]).agent?.address;
    expect(one({ businesshousenumber: "579", businessstreetname: "5th ave", businessapartment: " 2nd  fl ", businesscity: "New York", businessstate: "NY", businesszip: "10017" })).toBe(
      "579 5th ave, 2nd fl, New York, NY 10017",
    );
    expect(one({ businesshousenumber: "POB", businessstreetname: "319", businesscity: "Brooklyn", businessstate: "NY", businesszip: "11204" })).toBe("POB 319, Brooklyn, NY 11204");
    expect(one({ businesscity: "Brooklyn" })).toBeNull();
  });

  it("tolerates a registration with no contacts at all", () => {
    expect(buildRegistration(row, [])).toMatchObject({ agent: null, headOfficer: null, owner: null });
  });
});

describe("registrationInfo", () => {
  it("is null for a lot with no registration, and keeps the snapshot date", () => {
    expect(registrationInfo([], [], {}, "2026-07-31T00:00:00.000")).toEqual({ asOf: "2026-07-31", current: null });
    expect(registrationInfo([], [], {}, null).asOf).toBeNull();
  });
  it("picks the row for the hint and attaches its contacts", () => {
    const info = registrationInfo(BRONX_ROWS, BRONX_CONTACTS, { bin: "2092156" }, "2026-07-31T00:00:00.000");
    expect(info.current?.registrationId).toBe("203047");
    expect(info.current?.agent?.name).toBe("LOUIS PLEVRITIS, LOSOKA LLC");
  });
});

describe("isOldRegistration", () => {
  const reg = (endDate: string | null): Registration => ({ registrationId: "1", buildingId: "1", buildingAddress: "", lastRegistered: null, endDate, agent: null, headOfficer: null, owner: null });
  it("flags only an end date more than a year before the snapshot", () => {
    expect(isOldRegistration(reg("1994-05-31"), "2026-07-31")).toBe(true);
    expect(isOldRegistration(reg("2025-07-30"), "2026-07-31")).toBe(true);
    expect(isOldRegistration(reg("2025-09-01"), "2026-07-31")).toBe(false); // missing one Sept-1 renewal is normal
    expect(isOldRegistration(reg("2026-09-01"), "2026-07-31")).toBe(false);
  });
  it("is false when a date is missing", () => {
    expect(isOldRegistration(reg(null), "2026-07-31")).toBe(false);
    expect(isOldRegistration(reg("1994-05-31"), null)).toBe(false);
  });
});

describe("snapshotLabel", () => {
  it("says what the facts are as of, never that they are live", () => {
    expect(snapshotLabel("2026-07-31")).toBe("HPD registration snapshot as of Jul 31, 2026");
    expect(snapshotLabel(null)).toBe("HPD registration snapshot");
  });
});

describe("suggestAddressee", () => {
  const contact = (name: string, address: string | null = "1 MAIN ST, NEW YORK, NY 10001") => ({ name, address });
  const reg = (over: Partial<Registration>): Registration => ({
    registrationId: "1",
    buildingId: "1",
    buildingAddress: "",
    lastRegistered: null,
    endDate: null,
    agent: null,
    headOfficer: null,
    owner: null,
    ...over,
  });

  it("addresses the managing agent and copies the owner", () => {
    const r = reg({ agent: contact("AGENT"), headOfficer: contact("HEAD"), owner: contact("OWNER LLC", "9 OAK AVE, BROOKLYN, NY 11201") });
    expect(suggestAddressee(r)).toEqual({ name: "AGENT", address: "1 MAIN ST, NEW YORK, NY 10001", cc: "OWNER LLC, 9 OAK AVE, BROOKLYN, NY 11201" });
  });

  it("falls back from agent to head officer to owner, and does not copy the owner to itself", () => {
    expect(suggestAddressee(reg({ headOfficer: contact("HEAD"), owner: contact("OWNER LLC", null) }))).toEqual({
      name: "HEAD",
      address: "1 MAIN ST, NEW YORK, NY 10001",
      cc: "OWNER LLC",
    });
    expect(suggestAddressee(reg({ owner: contact("OWNER LLC") }))).toEqual({ name: "OWNER LLC", address: "1 MAIN ST, NEW YORK, NY 10001", cc: "" });
  });

  it("skips an agent without a mailing address for the next contact that has one, else keeps the first name", () => {
    expect(suggestAddressee(reg({ agent: contact("AGENT", null), owner: contact("OWNER LLC") }))?.name).toBe("OWNER LLC");
    expect(suggestAddressee(reg({ agent: contact("AGENT", null), owner: contact("OWNER LLC", null) }))).toEqual({ name: "AGENT", address: "", cc: "OWNER LLC" });
  });

  it("is null when the registration names nobody", () => {
    expect(suggestAddressee(reg({}))).toBeNull();
  });
});

describe("demo registrations", () => {
  it("each demo building has its saved HPD registration, snapshot dated", () => {
    const want: Record<string, [string, string]> = {
      "1020020091": ["109944", "EDWIN SHIRAZIAN"],
      "2043220010": ["200271", "DAVID FRIEDMAN, NEW PARK MANAGEMENT, LLC"],
      "3051900075": ["351922", "Joshua Pomerantz"],
    };
    for (const [bbl, [registrationId, agent]] of Object.entries(want)) {
      const info = demoBuilding(bbl)?.registration;
      expect(info?.asOf).toBe("2026-07-31");
      expect(info?.current).toMatchObject({ registrationId, agent: { name: agent } });
    }
  });

  it("the demo building's notice goes to its agent, address as published, with the owner copied", () => {
    const current = demoBuilding("1020020091")?.registration?.current;
    expect(current && suggestAddressee(current)).toEqual({
      name: "EDWIN SHIRAZIAN",
      address: "579 5th ave, 2nd fl, New York, NY 10017",
      cc: "COLUMBIA HEIGHTS 136 LLC, 579 5th ave, 2nd fl, New York, NY 10017",
    });
  });

  it("a PO box is kept as published", () => {
    expect(demoBuilding("3051900075")?.registration?.current?.owner).toEqual({ name: "2505 BEDFORD 2015 LLC", address: "POB 319, Brooklyn, NY 11204" });
  });
});
