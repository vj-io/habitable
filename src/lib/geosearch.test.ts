import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "@/lib/demo/fixtures/1020020091-geosearch.json";
import { searchAddresses } from "@/lib/geosearch";

const mockFetch = (body: unknown, ok = true, status = 200) => {
  const fn = vi.fn(async () => ({ ok, status, json: async () => body }) as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
};

afterEach(() => vi.unstubAllGlobals());

describe("searchAddresses", () => {
  it("maps GeoSearch features to Address with a prettified label", async () => {
    const fetchMock = mockFetch(fixture);
    const results = await searchAddresses("  618 west 136 ");
    expect(results[0]).toEqual({
      label: "618 West 136 Street, Manhattan, NY 10031",
      borough: "Manhattan",
      zip: "10031",
      bbl: "1020020091",
      bin: "1059976",
      lat: 40.821049,
      lng: -73.955775,
    });
    expect(results.length).toBe(fixture.features.length);
    expect(results.every((a) => /^\d{10}$/.test(a.bbl))).toBe(true);

    // Plain GET, size 6, and no custom headers (any header would trigger a CORS preflight, which GeoSearch refuses).
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(url).toBe("https://geosearch.planninglabs.nyc/v2/autocomplete?text=618%20west%20136&size=6");
    expect(init?.headers).toBeUndefined();
    expect(init?.method).toBeUndefined();
  });

  it("passes the abort signal through", async () => {
    const fetchMock = mockFetch({ features: [] });
    const ctl = new AbortController();
    await searchAddresses("618 west", ctl.signal);
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBe(ctl.signal);
  });

  it("returns [] for under 3 characters without calling the network", async () => {
    const fetchMock = mockFetch(fixture);
    expect(await searchAddresses("")).toEqual([]);
    expect(await searchAddresses(" 61 ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops features without a 10-digit BBL and dedupes by bbl + label", async () => {
    const [first] = fixture.features;
    const noBbl = { ...first, properties: { ...first.properties, addendum: { pad: {} } } };
    const noPad = { ...first, properties: { ...first.properties, addendum: undefined } };
    const shortBbl = { ...first, properties: { ...first.properties, addendum: { pad: { bbl: "102002009" } } } };
    mockFetch({ features: [first, first, noBbl, noPad, shortBbl] });
    const results = await searchAddresses("618 west 136");
    expect(results.map((a) => a.bbl)).toEqual(["1020020091"]);
  });

  it("keeps same-bbl results whose labels differ (CENTER vs CENTRE)", async () => {
    const [first] = fixture.features;
    const other = { ...first, properties: { ...first.properties, street: "WEST 136 STREET EXTENSION" } };
    mockFetch({ features: [first, other] });
    expect(await searchAddresses("618 west 136")).toHaveLength(2);
  });

  it("title-cases ordinals and hyphens, and tolerates missing optional fields", async () => {
    const f = {
      properties: { housenumber: "1", street: "1ST AVENUE", borough: "Brooklyn", addendum: { pad: { bbl: "3000010001" } } },
    };
    mockFetch({ features: [f] });
    expect(await searchAddresses("1 1st ave")).toEqual([
      { label: "1 1st Avenue, Brooklyn, NY", borough: "Brooklyn", bbl: "3000010001" },
    ]);
  });

  it("throws on an HTTP error or a network failure so the caller can show a message", async () => {
    mockFetch({}, false, 503);
    await expect(searchAddresses("618 west")).rejects.toThrow(/503/);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(searchAddresses("618 west")).rejects.toThrow("Failed to fetch");
  });
});
