import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { latestOutdoor } from "@/lib/outdoor";

// GET /api/outdoor -> OutdoorReading { tempF, observedAt, station, source } from the NWS (Central Park first).
// The browser never calls weather.gov itself. The lookup is cached about 5 minutes with `"use cache"` (stations
// report hourly, so this adds little staleness); "unavailable" is a thrown error, which is never cached.
const CACHEABLE = { "Cache-Control": "public, s-maxage=300" };
const NO_STORE = { "Cache-Control": "no-store" };

async function loadLatest() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 600 });
  return latestOutdoor();
}

export async function GET() {
  await connection(); // a weather reading is never part of the build's prerender
  try {
    return Response.json(await loadLatest(), { headers: CACHEABLE });
  } catch {
    return Response.json({ error: "The outdoor temperature is unavailable right now." }, { status: 503, headers: NO_STORE });
  }
}
