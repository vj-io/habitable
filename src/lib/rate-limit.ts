// Per-visitor and per-instance request caps for routes that spend AI quota.
// ponytail: per-instance memory only. Each serverless instance counts on its own and a cold start resets
// it, so this slows casual abuse but is not a hard limit. Use a shared store (KV/Redis) or Vercel's
// firewall rate limit if it ever needs to be strict.

type Window = { limit: number; windowMs: number };

export function createLimiter({ perIp, global }: { perIp: Window; global: Window }) {
  const hits = new Map<string, number[]>();
  const over = (key: string, w: Window, now: number) => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < w.windowMs);
    hits.set(key, recent);
    return recent.length >= w.limit;
  };
  /** "ip" or "global" when that cap is reached (and nothing is counted), else null after counting the hit. */
  return function check(ip: string, now = Date.now()): "ip" | "global" | null {
    if (over(`ip:${ip}`, perIp, now)) return "ip";
    if (over("global", global, now)) return "global";
    hits.get(`ip:${ip}`)!.push(now);
    hits.get("global")!.push(now);
    if (hits.size > 5000) {
      for (const [key, times] of hits) if (times.every((t) => now - t >= perIp.windowMs)) hits.delete(key);
    }
    return null;
  };
}

/** The caller's address as Vercel reports it. */
export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
