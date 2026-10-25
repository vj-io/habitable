// Shared model access for every AI feature: which models, in which order, and how to behave on the Gemini
// free tier. Features (photo classifier, law Q&A, message coach) call generateObjectWithFallback; they all
// share one cooldown map, so a model that answered 429 for one feature rests for all of them.

import "server-only";
import { google } from "@ai-sdk/google";
import { generateText, Output, type LanguageModel, type ModelMessage } from "ai";
import type { z } from "zod";

// Direct Gemini (verified 2026-10-25): gemini-2.5-flash is closed to new API keys and 3.8 Flash took
// > 30 s per photo, so 3.5 Flash (thinking off, ~3 s) leads and 3.5 Flash-Lite (~4 s) follows. On the
// free tier each model has its own quota, so the fallback also doubles the photos per minute.
const GOOGLE_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
// Ids verified against https://ai-gateway.vercel.sh/v1/models (both list "vision"). Gateway ids use
// a dot in version numbers: "anthropic/claude-haiku-5.5", not "claude-haiku-5-5".
const GATEWAY_MODELS = ["anthropic/claude-haiku-5.5", "google/gemini-3.5-flash"];

/** Which provider to use, in order (primary, fallback). [] means no AI is configured. */
export function pickModels(env: Record<string, string | undefined> = process.env): LanguageModel[] {
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) return GOOGLE_MODELS.map((m) => google(m));
  if (env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || env.VERCEL) return [...GATEWAY_MODELS];
  return [];
}

export class AiUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailable";
  }
}

// Rate limits (Gemini free tier allows a handful of requests per minute per model):
// - no retry within a model: a retry after a 429 burns quota and time; the next model has its own quota;
// - a model that answers 429 sits out until its cooldown ends, so we stop hammering it;
// - identical requests (same cache key: same photo and note, same question...) are answered from a small cache.
// ponytail: all three live in instance memory; on serverless each instance keeps its own. Move to a
// shared store (KV) if traffic ever needs a strict global budget.
const DEFAULT_COOLDOWN_MS = 60_000;
const MAX_COOLDOWN_MS = 5 * 60_000;
const cooldownUntil = new Map<string, number>();

const CACHE_TTL_MS = 60 * 60_000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; value: { output: unknown; model: string } }>();

const OVERLOAD_COOLDOWN_MS = 15_000;

/**
 * How long to rest a model after an error, or null to keep using it. Rate/quota limits (429) wait as
 * long as the provider asks; "high demand" overloads (503) rest briefly.
 */
export function rateLimitDelay(error: unknown): number | null {
  const e = error as { statusCode?: number; message?: string; responseBody?: string } | null;
  const text = `${e?.message ?? ""} ${typeof e?.responseBody === "string" ? e.responseBody : ""}`;
  if (e?.statusCode === 503 || /high demand|overloaded/i.test(text)) return OVERLOAD_COOLDOWN_MS;
  if (e?.statusCode !== 429 && !/RESOURCE_EXHAUSTED|rate limit|quota/i.test(text)) return null;
  const seconds = /retry (?:in|after)\s*([\d.]+)\s*s/i.exec(text) ?? /"retryDelay":\s*"([\d.]+)s"/.exec(text);
  const ms = seconds ? Math.ceil(Number(seconds[1]) * 1000) : DEFAULT_COOLDOWN_MS;
  return Math.min(Math.max(ms, 1000), MAX_COOLDOWN_MS);
}

/** Every model is resting after a rate limit. */
export class AiBusy extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBusy";
  }
}

/**
 * Thinking adds seconds and quota for a one-label answer, so turn it off where the model allows it.
 * Flash-Lite rejects a zero budget ("invalid argument") and already answers without thinking.
 */
export function thinkingOff(id: string) {
  return /gemini-[\d.]+-flash$/.test(id) ? { google: { thinkingConfig: { thinkingBudget: 0 } } } : undefined;
}

/** Test hook: forget cooldowns and cached answers. */
export function resetAiState() {
  cooldownUntil.clear();
  cache.clear();
}

/**
 * Asks each available model once, in order, for an object matching `schema`. Answers are cached by
 * `cacheKey` for an hour. Throws AiBusy when every model is resting after a rate limit, AiUnavailable for
 * any other failure. Error text never includes the request (it can hold a photo or the renter's words).
 */
export async function generateObjectWithFallback<T>({
  models,
  schema,
  instructions,
  messages,
  cacheKey,
  timeoutMs = 20_000,
  temperature = 0,
  now = Date.now,
}: {
  models: LanguageModel[];
  schema: z.ZodType<T>;
  instructions: string;
  messages: ModelMessage[];
  cacheKey?: string;
  timeoutMs?: number;
  temperature?: number;
  now?: () => number;
}): Promise<{ output: T; model: string }> {
  if (models.length === 0) throw new AiUnavailable("No AI model configured");
  const hit = cacheKey ? cache.get(cacheKey) : undefined;
  if (hit && now() - hit.at < CACHE_TTL_MS) return hit.value as { output: T; model: string };

  const failures: string[] = [];
  let tried = 0;
  for (const model of models) {
    const id = typeof model === "string" ? model : model.modelId;
    if ((cooldownUntil.get(id) ?? 0) > now()) {
      failures.push(`${id}: cooling down`);
      continue;
    }
    tried++;
    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema }),
        temperature,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(timeoutMs),
        instructions,
        providerOptions: thinkingOff(id),
        messages,
      });
      const value = { output: output as T, model: id };
      if (cacheKey) {
        cache.set(cacheKey, { at: now(), value });
        if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
      }
      return value;
    } catch (error) {
      const wait = rateLimitDelay(error);
      if (wait !== null) cooldownUntil.set(id, now() + wait);
      failures.push(`${id}: ${wait !== null ? `resting ${Math.round(wait / 1000)}s` : error instanceof Error ? error.message.slice(0, 200) : "failed"}`);
    }
  }
  const allLimited = models.every((m) => (cooldownUntil.get(typeof m === "string" ? m : m.modelId) ?? 0) > now());
  if (allLimited) throw new AiBusy(failures.join(" | ") + (tried === 0 ? " (skipped: all cooling down)" : ""));
  throw new AiUnavailable(failures.join(" | "));
}
