import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTES, type AskResult } from "@/lib/law/ask";
import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://x/api/ask", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

// No AI keys: the route answers with a search.
beforeEach(() => {
  for (const k of ["GOOGLE_GENERATIVE_AI_API_KEY", "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "VERCEL"]) vi.stubEnv(k, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/ask", () => {
  it("returns a labelled search with marked passages when no AI is configured", async () => {
    const res = await post({ question: "How cold is too cold at night?" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AskResult;
    expect(body).toMatchObject({ mode: "search", note: NOTES.noKey, claims: [] });
    expect(body.passages.some((p) => p.section === "§27-2029(a)")).toBe(true);
  });

  it("rejects bad requests", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ question: "  " })).status).toBe(400);
    const long = await post({ question: "x".repeat(301) });
    expect(long.status).toBe(400);
    expect(await long.text()).toMatch(/300 characters/);
    expect((await post("x".repeat(5000))).status).toBe(413);
  });
});
