// NYC GeoSearch (Pelias) address autocomplete. Runs in the browser and on the server.
// GeoSearch allows cross-origin GET but answers a CORS preflight with 403: send NO custom headers.
import type { Address } from "./types";

const AUTOCOMPLETE_URL = "https://geosearch.planninglabs.nyc/v2/autocomplete";

interface GeoFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    label?: string;
    housenumber?: string;
    street?: string;
    borough?: string;
    locality?: string;
    postalcode?: string;
    addendum?: { pad?: { bbl?: string; bin?: string } };
  };
}

/** "WEST 136 STREET" -> "West 136 Street" ("1ST AVENUE" -> "1st Avenue"). */
const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

function toAddress(f: GeoFeature): Address | null {
  const p = f.properties;
  const bbl = p?.addendum?.pad?.bbl;
  if (!p || !bbl || !/^\d{10}$/.test(bbl)) return null;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || p.label?.split(",")[0] || "";
  if (!street) return null;
  const borough = p.borough ?? p.locality ?? "New York";
  const [lng, lat] = f.geometry?.coordinates ?? [];
  return {
    label: `${titleCase(street)}, ${borough}, NY${p.postalcode ? ` ${p.postalcode}` : ""}`,
    borough,
    bbl,
    ...(p.postalcode && { zip: p.postalcode }),
    ...(p.addendum?.pad?.bin && { bin: p.addendum.pad.bin }),
    ...(typeof lat === "number" && typeof lng === "number" && { lat, lng }),
  };
}

/** Up to 6 NYC address suggestions for `text`. [] for under 3 characters; throws on a network or HTTP error. */
export async function searchAddresses(text: string, signal?: AbortSignal): Promise<Address[]> {
  const q = text.trim();
  if (q.length < 3) return [];
  const res = await fetch(`${AUTOCOMPLETE_URL}?text=${encodeURIComponent(q)}&size=6`, { signal });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const data = (await res.json()) as { features?: GeoFeature[] };
  const seen = new Set<string>();
  return (data.features ?? []).flatMap((f) => {
    const a = toAddress(f);
    const key = a && `${a.bbl}|${a.label}`;
    if (!a || !key || seen.has(key)) return [];
    seen.add(key);
    return [a];
  });
}
