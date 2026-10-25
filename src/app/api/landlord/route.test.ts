// No network: fetch is stubbed per dataset, so each test decides which Open Data lookup answers or fails.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LandlordRecord } from "@/lib/portfolio";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));

type Answer = unknown[] | number; // rows, or an HTTP error status
type Rule = (dataset: string, where: string, select: string) => Answer | undefined;

/** fetch stub: the first rule that answers wins; anything unanswered is a 404 (and fails the lookup that asked). */
function socrata(...rules: Rule[]) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const dataset = url.pathname.split("/").pop()!.replace(/\.json$/, "");
    const where = url.searchParams.get("$where") ?? "";
    const select = url.searchParams.get("$select") ?? "";
    const answer = rules.map((r) => r(dataset, where, select)).find((a) => a !== undefined) ?? 404;
    return typeof answer === "number" ? Response.json({ message: "error" }, { status: answer }) : Response.json(answer);
  });
}

// The demo landlord's portfolio seen from 234-240 West 135th Street (not a demo BBL, so no saved snapshot):
// real registration rows and agent contacts (fetched 2026-10-25); the aggregate counts are illustrative.
const REG = {
  "111435": { registrationid: "111435", buildingid: "40740", boroid: "1", block: "1940", lot: "45", housenumber: "234", lowhousenumber: "234", highhousenumber: "240", streetname: "WEST 135 STREET", registrationenddate: "2026-09-01T00:00:00.000", lastregistrationdate: "2025-10-28T00:00:00.000" },
  "109944": { registrationid: "109944", buildingid: "40948", boroid: "1", block: "2002", lot: "91", housenumber: "618", lowhousenumber: "618", highhousenumber: "620", streetname: "WEST 136 STREET", registrationenddate: "2026-09-01T00:00:00.000", lastregistrationdate: "2025-10-28T00:00:00.000" },
  "120724": { registrationid: "120724", buildingid: "40950", boroid: "1", block: "2002", lot: "93", housenumber: "622", lowhousenumber: "622", highhousenumber: "622", streetname: "WEST 136 STREET", registrationenddate: "2026-09-01T00:00:00.000", lastregistrationdate: "2025-10-28T00:00:00.000" },
};
const agent = (registrationid: string, street = "5th ave") => ({
  registrationcontactid: `${registrationid}04`,
  registrationid,
  type: "Agent",
  firstname: "EDWIN",
  lastname: "SHIRAZIAN",
  businesshousenumber: "579",
  businessstreetname: street,
  businesszip: "10017",
});

const portfolio: Rule = (ds, where, select) => {
  if (ds === "tesw-yqqr" && select.startsWith("max(")) return [{ max_lastregistrationdate: "2026-07-31T00:00:00.000" }];
  if (ds === "tesw-yqqr" && where.startsWith("boroid=1 AND block=1940 AND lot=45")) return [REG["111435"]];
  if (ds === "tesw-yqqr" && where.startsWith("registrationid in")) return Object.values(REG).map(({ registrationid, buildingid }) => ({ registrationid, buildingid }));
  if (ds === "tesw-yqqr" && where.startsWith("buildingid in")) return Object.values(REG);
  if (ds === "feu5-w2e2" && where.startsWith("registrationid=111435")) return [agent("111435")];
  if (ds === "feu5-w2e2" && where.startsWith("type='Agent'")) return [agent("111435"), agent("109944"), agent("120724", "5th Ave"), agent("120724", "5th Ave")];
};
const metrics: Rule = (ds, where, select) => {
  if (ds === "wvxf-dwi5" && where.includes("bbl in"))
    return [
      { bbl: "1019400045", class: "C", n: "140" },
      { bbl: "1019400045", class: "B", n: "60" },
      { bbl: "1020020091", class: "C", n: "82" },
      { bbl: "1020020093", class: "A", n: "5" },
    ];
  if (ds === "64uk-42ks" && where.includes("bbl in"))
    return [
      { bbl: "1019400045.00000000", unitsres: "29" },
      { bbl: "1020020091.00000000", unitsres: "28" },
      { bbl: "1020020093.00000000", unitsres: "17" },
    ];
  if (ds === "erm2-nwe9") return [{ bbl: "1019400045", n: "59" }, { bbl: "1020020091", n: "10" }];
  if (ds === "59kj-x8nc") return [{ bbl: "1020020091", n: "16" }];
  if (ds === "hcir-3275") return [{ bbl: "1020020091", current_status: "AEP Active" }];
  if (ds === "wvxf-dwi5" && where.includes("class in ('B','C')")) return [{ class: "B", n: "1000" }, { class: "C", n: "500" }];
  if (ds === "64uk-42ks" && select.startsWith("sum(")) return [{ units: "3000" }];
};
const fails = (dataset: string, status = 500): Rule => (ds) => (ds === dataset ? status : undefined);

async function get(query: string) {
  const { GET } = await import("@/app/api/landlord/route");
  return GET(new Request(`http://localhost/api/landlord?${query}`));
}

describe("GET /api/landlord", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-25T16:00:00Z"), toFake: ["Date"] }));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("answers 400 for a bad bbl", async () => {
    vi.stubGlobal("fetch", socrata());
    const res = await get("bbl=12345");
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("follows the agent to every current building and scores them; cached an hour when every lookup answered", async () => {
    const fetchMock = socrata(portfolio, metrics);
    vi.stubGlobal("fetch", fetchMock);
    const res = await get("bbl=1019400045");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
    const body = (await res.json()) as LandlordRecord;
    expect(body.portfolio).toMatchObject({ asOf: "2026-07-31", registered: true, keys: [{ kind: "agent", name: "EDWIN SHIRAZIAN" }], found: 3, capped: false });
    expect(body.portfolio.buildings.map((b) => b.bbl)).toEqual(["1019400045", "1020020091", "1020020093"]);
    expect(body.open).toEqual({ byClass: { A: 5, B: 60, C: 222 }, total: 287 });
    expect(body.units).toEqual({ total: 74, buildings: 3 });
    expect(body.bcPer100).toBe(381.1); // 282 / 74
    expect(body.baseline).toEqual({ bc: 1500, units: 3000, per100: 50, asOf: "2026-10-25" });
    expect(body.ratio).toBe(7.6);
    expect([body.heat311, body.litigations, body.aep]).toEqual([69, 16, 1]);
    expect(body.worst?.map((w) => [w.address, w.c])).toEqual([
      ["234-240 WEST 135 STREET", 140],
      ["618-620 WEST 136 STREET", 82],
    ]);
    expect(body.season).toEqual({ start: "2025-10-01", end: "2026-05-31" });
    const heatCall = fetchMock.mock.calls.map(([u]) => decodeURIComponent(String(u))).find((u) => u.includes("erm2-nwe9"));
    expect(heatCall).toContain("created_date>='2025-10-01T00:00:00' AND created_date<='2026-05-31T23:59:59.999'");
  });

  it("leaves out a metric whose lookup failed, keeps the rest, and isn't cached", async () => {
    vi.stubGlobal("fetch", socrata(fails("erm2-nwe9"), portfolio, metrics));
    const res = await get("bbl=1019400045");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as LandlordRecord;
    expect(body.heat311).toBeNull();
    expect(body.open?.total).toBe(287);
    expect(body.ratio).toBe(7.6);
  });

  it("uses the saved, dated citywide counts when the baseline query fails", async () => {
    vi.stubGlobal("fetch", socrata((ds, where) => (ds === "wvxf-dwi5" && where.includes("class in ('B','C')") ? 503 : undefined), portfolio, metrics));
    const body = (await (await get("bbl=1019400045")).json()) as LandlordRecord;
    expect(body.baseline).toEqual({ bc: 1974942, units: 3736645, per100: 52.9, asOf: "2026-10-25" });
    expect(body.ratio).toBe(7.2); // 381.08 / 52.85
  });

  it("answers 502 when the portfolio itself can't be found, for a building with no saved snapshot", async () => {
    vi.stubGlobal("fetch", socrata(fails("tesw-yqqr")));
    const res = await get("bbl=1019400045");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Landlord records are unavailable right now." });
  });

  it("answers a demo building from its saved snapshot, without calling Open Data", async () => {
    const fetchMock = socrata();
    vi.stubGlobal("fetch", fetchMock);
    const res = await get("bbl=1020020091&demo=1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as LandlordRecord;
    expect(body.source).toBe("demo-fixture");
    expect(body.portfolio.buildings[0].bbl).toBe("1020020091");
    expect(fetchMock).not.toHaveBeenCalled();

    // and falls back to it, uncached, when the live lookup fails
    vi.stubGlobal("fetch", socrata(fails("tesw-yqqr")));
    const fallback = await get("bbl=1020020091");
    expect(fallback.status).toBe(200);
    expect(fallback.headers.get("Cache-Control")).toBe("no-store");
    expect(((await fallback.json()) as LandlordRecord).source).toBe("demo-fixture");
  });
});
