import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickModels, resetAiState } from "@/lib/ai";
import { templateDraft, type CoachFacts } from "@/lib/coach";
import { POST } from "./route";

// The real route, Zod, rate limiter, cache and validator; only the choice of model is replaced.
vi.mock("@/lib/ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/ai")>()), pickModels: vi.fn() }));

const facts: CoachFacts = {
  problem: "leak / water damage",
  hazardClass: "C",
  classLabel: "immediately hazardous",
  window: { hours: 24, text: "24 hours" },
  firstDate: "Oct 15, 2026",
  repairBy: "Oct 16, 2026",
  citation: "NYC Admin. Code §27-2005(a), §27-2026",
  unit: "4B",
  address: "618 West 136th Street, Manhattan, NY 10031",
  days: 3,
  followUps: 0,
  photos: 1,
  fixed: false,
};
const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const replying = (value: unknown) =>
  new MockLanguageModelV4({
    modelId: "mock-a",
    doGenerate: async () => ({ content: [{ type: "text", text: JSON.stringify(value) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] }),
  });

let n = 0;
const post = (body: unknown, ip = `10.0.0.${++n}`) =>
  POST(new Request("http://localhost/api/coach", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "x-forwarded-for": ip } }));
const ask = (over: Record<string, unknown> = {}) => ({ facts, channel: "text", tone: "polite", lang: "en", ...over });

beforeEach(() => {
  resetAiState();
  vi.mocked(pickModels).mockReturnValue([]);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

describe("POST /api/coach", () => {
  it("a good AI draft comes back as the AI's, placeholders intact", async () => {
    const message = "Hi, {{UNIT}} here. The {{PROBLEM}} can't wait. Please reply today.";
    vi.mocked(pickModels).mockReturnValue([replying({ message })]);
    const res = await post(ask());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: "ai", draft: { body: message }, model: "mock-a" });
  });

  it("a draft with an invented date comes back as the template", async () => {
    vi.mocked(pickModels).mockReturnValue([replying({ message: "Please come by October 30 and fix the {{PROBLEM}}." })]);
    const body = await (await post(ask())).json();
    expect(body).toMatchObject({ source: "template", draft: templateDraft("text", facts, "en", "polite") });
    expect(body.reason).toMatch(/set aside/);
    expect(body.reason).not.toMatch(/October/);
  });

  it("AI unavailable (no key) comes back as the template for each channel and language", async () => {
    for (const channel of ["text", "email", "call"] as const) {
      for (const lang of ["en", "es"] as const) {
        const res = await post(ask({ channel, lang }));
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ source: "template", draft: templateDraft(channel, facts, lang, "polite"), reason: expect.stringMatching(/No AI is set up/) });
      }
    }
  });

  it("AI failing mid-request comes back as the template", async () => {
    vi.mocked(pickModels).mockReturnValue([
      new MockLanguageModelV4({
        modelId: "boom",
        doGenerate: async () => {
          throw new Error("boom");
        },
      }),
    ]);
    expect(await (await post(ask({ tone: "firm" }))).json()).toMatchObject({ source: "template", draft: templateDraft("text", facts, "en", "firm") });
  });

  it("refuses bad input with a 400 and a plain message", async () => {
    for (const bad of [
      "not json",
      {},
      ask({ channel: "fax" }),
      ask({ tone: "angry" }),
      ask({ lang: "fr" }),
      ask({ facts: { ...facts, address: "x".repeat(200) } }),
      ask({ facts: { ...facts, days: -1 } }),
      ask({ facts: { ...facts, hazardClass: "D" } }),
      ask({ facts: { ...facts, unit: "" } }),
      ask({ note: "x".repeat(300) }),
      ask({ facts: undefined }),
    ]) {
      const res = await post(bad);
      expect(res.status, JSON.stringify(bad).slice(0, 60)).toBe(400);
      expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    }
  });

  it("refuses an oversized body with a 413", async () => {
    expect((await post(ask({ note: "x".repeat(5000) }))).status).toBe(413);
  });

  it("rate-limits real model calls per visitor with a 429 that still carries the template", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z")); // a clean window for the limiter
    vi.mocked(pickModels).mockReturnValue([replying({ message: "Hi {{UNIT}}. The {{PROBLEM}} can't wait." })]);
    for (let i = 0; i < 12; i++) expect((await post(ask(), "9.9.9.9")).status).toBe(200);
    const res = await post(ask(), "9.9.9.9");
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ source: "template", draft: templateDraft("text", facts, "en", "polite"), reason: expect.stringMatching(/Too many drafts/) });
    // Another visitor is over the whole-instance cap in the same minute; a later minute is clear again.
    expect(await (await post(ask(), "8.8.8.8")).json()).toMatchObject({ source: "template", reason: expect.stringMatching(/Lots of drafts/) });
    vi.setSystemTime(new Date("2030-01-01T00:11:00Z"));
    expect((await post(ask(), "9.9.9.9")).status).toBe(200);
  });

  it("with no AI configured, the limiter is not touched", async () => {
    for (let i = 0; i < 30; i++) expect((await post(ask(), "7.7.7.7")).status).toBe(200);
  });
});
