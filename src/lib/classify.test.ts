import { MockLanguageModelV4 } from "ai/test";
import { APICallError } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CONFIDENCE_THRESHOLD,
  ClassifyBusy,
  ClassifyUnavailable,
  DEFAULT_QUESTIONS,
  ISSUE_DEFINITIONS,
  ProposalSchema,
  buildPrompt,
  classifyImage,
  decide,
  pickModels,
  rateLimitDelay,
  resetClassifyState,
  type RawProposal,
} from "@/lib/classify";
import { DEMO_SAMPLES } from "@/lib/demo/samples";
import { PROPOSAL_IDS } from "@/lib/types";

const raw = (over: Partial<RawProposal> = {}): RawProposal => ({
  issue: "leak",
  confidence: 0.9,
  rationale: "A brown ring on the ceiling.",
  clarifyingQuestion: null,
  clarifyingOptions: [],
  ...over,
});
const ctx = { answered: false, source: "ai" as const, model: "m" };

describe("decide", () => {
  it("asks the model's question when confidence is below the threshold", () => {
    const r = decide(
      raw({ confidence: 0.5, clarifyingQuestion: "Is it dripping?", clarifyingOptions: ["Yes", "No"] }),
      ctx,
    );
    expect(r).toMatchObject({
      status: "proposal",
      proposal: { issue: "leak", confidence: 0.5, source: "ai", model: "m" },
      clarifyingQuestion: { question: "Is it dripping?", options: ["Yes", "No"] },
    });
  });

  it("does not ask again once answered, even at low confidence", () => {
    const r = decide(raw({ confidence: 0.3, clarifyingQuestion: "Is it dripping?" }), { ...ctx, answered: true });
    expect(r.status === "proposal" && r.clarifyingQuestion).toBeNull();
  });

  it("does not ask at or above the threshold", () => {
    for (const confidence of [CONFIDENCE_THRESHOLD, 0.95]) {
      const r = decide(raw({ confidence, clarifyingQuestion: "Is it dripping?" }), ctx);
      expect(r.status === "proposal" && r.clarifyingQuestion).toBeNull();
    }
  });

  it("falls back to the default question and options when the model gave none", () => {
    const r = decide(raw({ issue: "mold", confidence: 0.4, clarifyingOptions: ["stray"] }), ctx);
    expect(r.status === "proposal" && r.clarifyingQuestion).toEqual({
      question: DEFAULT_QUESTIONS.mold,
      options: ["Yes", "No", "Not sure"],
    });
  });

  it("uses default options when the model asked a question without options", () => {
    const r = decide(raw({ confidence: 0.4, clarifyingQuestion: "Is it dripping?" }), ctx);
    expect(r.status === "proposal" && r.clarifyingQuestion?.options).toEqual(["Yes", "No", "Not sure"]);
  });

  it("clamps a long rationale and omits model when none is given", () => {
    const r = decide(raw({ rationale: "x".repeat(240) }), { answered: false, source: "demo" });
    if (r.status !== "proposal") throw new Error("expected proposal");
    expect(r.proposal.rationale.length).toBe(200);
    expect("model" in r.proposal).toBe(false);
  });
});

describe("ProposalSchema", () => {
  it("accepts a valid proposal", () => {
    expect(ProposalSchema.safeParse(raw()).success).toBe(true);
  });
  it("rejects an issue outside the list", () => {
    expect(ProposalSchema.safeParse(raw({ issue: "asbestos" as never })).success).toBe(false);
  });
  it("rejects out-of-range confidence and an over-long question", () => {
    expect(ProposalSchema.safeParse(raw({ confidence: 1.2 })).success).toBe(false);
    expect(ProposalSchema.safeParse(raw({ clarifyingQuestion: "q".repeat(141) })).success).toBe(false);
  });
});

describe("buildPrompt", () => {
  it("lists every allowed id with a definition", () => {
    const { system } = buildPrompt({});
    for (const id of PROPOSAL_IDS) {
      expect(ISSUE_DEFINITIONS[id]).toBeTruthy();
      expect(system).toContain(`- ${id}:`);
    }
  });
  it("includes the note and the answer, and tells the model not to ask again", () => {
    const { user } = buildPrompt({
      note: "since Monday",
      answer: { question: "Is it dripping?", answer: "Yes" },
    });
    expect(user).toContain("since Monday");
    expect(user).toContain("Is it dripping?");
    expect(user).toContain("do not ask again");
  });
});

describe("pickModels", () => {
  it("prefers a Google key, then the gateway, else none", () => {
    expect(pickModels({ GOOGLE_GENERATIVE_AI_API_KEY: "k" })).toHaveLength(2);
    expect(pickModels({ AI_GATEWAY_API_KEY: "k" })).toEqual(["anthropic/claude-haiku-5.5", "google/gemini-3.5-flash"]);
    expect(pickModels({ VERCEL_OIDC_TOKEN: "t" })).toHaveLength(2);
    expect(pickModels({ VERCEL: "1" })).toHaveLength(2);
    expect(pickModels({})).toEqual([]);
  });
});

// Smallest valid JPEG data URL shape; the mock never decodes it.
const IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const replying = (value: unknown, modelId: string) =>
  new MockLanguageModelV4({
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(value) }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
const failing = (modelId: string) =>
  new MockLanguageModelV4({
    modelId,
    doGenerate: async () => {
      throw new Error("boom");
    },
  });

beforeEach(() => resetClassifyState());

const limitedError = (retry = "12s") =>
  new APICallError({
    message: `Resource has been exhausted (e.g. check quota). Please retry in ${retry}.`,
    url: "https://generativelanguage.googleapis.com",
    requestBodyValues: {},
    statusCode: 429,
    isRetryable: true,
  });
const rateLimited = (modelId: string) =>
  new MockLanguageModelV4({
    modelId,
    doGenerate: async () => {
      throw limitedError();
    },
  });

describe("classifyImage", () => {
  it("parses a valid model answer and sends the photo as an image file part", async () => {
    const model = replying(raw({ issue: "pests", confidence: 0.88 }), "mock-a");
    const out = await classifyImage({ image: IMAGE, note: "kitchen" }, { models: [model] });
    expect(out).toEqual({ raw: raw({ issue: "pests", confidence: 0.88 }), model: "mock-a" });

    const call = model.doGenerateCalls[0];
    expect(call.temperature).toBe(0);
    const userMsg = call.prompt.find((m) => m.role === "user");
    const parts = userMsg && typeof userMsg.content !== "string" ? userMsg.content : [];
    expect(parts.some((p) => p.type === "file" && p.mediaType === "image/jpeg")).toBe(true);
  });

  it("falls back to the next model when the first one throws", async () => {
    const first = failing("mock-a");
    const second = replying(raw({ issue: "mold" }), "mock-b");
    const out = await classifyImage({ image: IMAGE }, { models: [first, second] });
    expect(out.model).toBe("mock-b");
    expect(out.raw.issue).toBe("mold");
    expect(first.doGenerateCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("falls back when the first model answers outside the schema", async () => {
    const first = replying({ issue: "asbestos", confidence: 1 }, "mock-a");
    const second = replying(raw(), "mock-b");
    expect((await classifyImage({ image: IMAGE }, { models: [first, second] })).model).toBe("mock-b");
  });

  it("throws ClassifyUnavailable when every model fails", async () => {
    await expect(
      classifyImage({ image: IMAGE }, { models: [failing("mock-a"), failing("mock-b")] }),
    ).rejects.toBeInstanceOf(ClassifyUnavailable);
  });

  it("throws ClassifyUnavailable when no model is configured", async () => {
    await expect(classifyImage({ image: IMAGE }, { models: [] })).rejects.toBeInstanceOf(ClassifyUnavailable);
  });

  it("throws ClassifyUnavailable on a non-image data URL", async () => {
    await expect(
      classifyImage({ image: "data:text/html;base64,AAAA" }, { models: [replying(raw(), "m")] }),
    ).rejects.toBeInstanceOf(ClassifyUnavailable);
  });
});

describe("rate limits", () => {
  it("reads the provider's retry delay from a 429, and ignores other errors", () => {
    expect(rateLimitDelay(limitedError("12s"))).toBe(12_000);
    expect(rateLimitDelay(limitedError("0.4s"))).toBe(1000); // floor
    expect(rateLimitDelay(new Error("RESOURCE_EXHAUSTED"))).toBe(60_000); // no hint → default
    expect(rateLimitDelay(new Error("This model is currently experiencing high demand."))).toBe(15_000);
    expect(rateLimitDelay(new Error("boom"))).toBeNull();
  });

  it("never retries a rate-limited model and falls through to the next one", async () => {
    const first = rateLimited("mock-a");
    const second = replying(raw({ issue: "leak" }), "mock-b");
    const out = await classifyImage({ image: IMAGE }, { models: [first, second] });
    expect(out.model).toBe("mock-b");
    expect(first.doGenerateCalls.length).toBe(1);
  });

  it("skips a cooling-down model on the next photo, then uses it again after the cooldown", async () => {
    let t = 1_000_000;
    const now = () => t;
    const first = rateLimited("mock-a");
    const second = replying(raw(), "mock-b");
    await classifyImage({ image: IMAGE }, { models: [first, second], now });
    await classifyImage({ image: "data:image/jpeg;base64,BBBB" }, { models: [first, second], now });
    expect(first.doGenerateCalls.length).toBe(1); // skipped while cooling down
    t += 13_000;
    await classifyImage({ image: "data:image/jpeg;base64,CCCC" }, { models: [first, second], now });
    expect(first.doGenerateCalls.length).toBe(2); // tried again after 12 s
  });

  it("throws ClassifyBusy when every model is rate-limited", async () => {
    await expect(
      classifyImage({ image: IMAGE }, { models: [rateLimited("mock-a"), rateLimited("mock-b")] }),
    ).rejects.toBeInstanceOf(ClassifyBusy);
  });

  it("answers an identical request from the cache without calling the model again", async () => {
    const model = replying(raw({ issue: "pests" }), "mock-a");
    await classifyImage({ image: IMAGE, note: "x" }, { models: [model] });
    await classifyImage({ image: IMAGE, note: "x" }, { models: [model] });
    expect(model.doGenerateCalls.length).toBe(1);
    await classifyImage({ image: IMAGE, note: "different" }, { models: [model] });
    expect(model.doGenerateCalls.length).toBe(2);
  });
});

describe("demo samples", () => {
  it("cover the seven ids and pass through decide() as expected", () => {
    expect(Object.keys(DEMO_SAMPLES).sort()).toEqual(
      ["ambiguous-stain", "broken-lock", "cold-radiator", "leak-ceiling", "mice-kitchen", "mold-bathroom", "peeling-paint"],
    );
    for (const [id, s] of Object.entries(DEMO_SAMPLES)) {
      expect(ProposalSchema.safeParse(s.first).success).toBe(true);
      expect(s.first.rationale.length).toBeLessThanOrEqual(200);
      if (id !== "ambiguous-stain") expect(s.first.confidence).toBeGreaterThanOrEqual(0.86);
    }
    const amb = DEMO_SAMPLES["ambiguous-stain"];
    const first = decide(amb.first, { answered: false, source: "demo" });
    expect(first.status === "proposal" && first.clarifyingQuestion?.options).toEqual(Object.keys(amb.afterAnswer!));
    expect(amb.afterAnswer!["Fuzzy spots"].issue).toBe("mold");
  });
});
