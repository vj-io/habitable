// POST /api/classify -> ClassifyResponse. The model (or a saved demo answer) only PROPOSES a problem
// type; decide() applies the confidence threshold. Nothing here decides a class or a deadline.
//
// No `dynamic` / `runtime` exports on purpose: with cacheComponents on, POST handlers are never
// cached and always run on the default Node.js runtime, and those config exports are not allowed.

import { z } from "zod";
import {
  ClassifyBusy,
  ClassifyUnavailable,
  IMAGE_DATA_URL,
  classifyImage,
  decide,
  pickModels,
} from "@/lib/classify";
import { DEMO_MODEL_LABEL, DEMO_SAMPLES } from "@/lib/demo/samples";
import type { ClassifyResponse } from "@/lib/types";

export const maxDuration = 30;

const MAX_IMAGE_CHARS = 2_000_000;
// Per model. Flash normally answers in ~3 s; past 8 s it is stalled and Flash-Lite should take over.
const MODEL_TIMEOUT_MS = 8_000;
// Demo only: a pause so the UI's "reading the photo" moment is visible. Real calls are slower anyway.
const DEMO_DELAY_MS = 700;

const BodySchema = z
  .object({
    image: z.string().regex(IMAGE_DATA_URL, "image must be a base64 jpeg, png or webp data URL").optional(),
    note: z.string().max(280).optional(),
    answer: z.object({ question: z.string().max(140), answer: z.string().max(60) }).optional(),
    sampleId: z.string().max(60).optional(),
  })
  .refine((b) => b.image || b.sampleId, { message: "Send an image or a sampleId." });

// ponytail: per-instance memory only. Each serverless instance counts on its own and a cold start
// resets it, so this slows casual abuse but is not a hard limit. Use a shared store (KV/Redis) or
// Vercel's firewall rate limit if it ever needs to be strict.
// Per person: 12 live photos per 10 minutes. Whole instance: 16 per minute, under the combined
// free-tier per-minute quota of the two Gemini models, so one busy visitor can't drain it for everyone.
const PER_IP_LIMIT = 12;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const GLOBAL_LIMIT = 16;
const GLOBAL_WINDOW_MS = 60 * 1000;
const hits = new Map<string, number[]>();

function limited(key: string, limit: number, windowMs: number, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent.length >= limit;
}

function rateLimited(ip: string, now = Date.now()): "ip" | "global" | null {
  if (limited(`ip:${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS, now)) return "ip";
  if (limited("global", GLOBAL_LIMIT, GLOBAL_WINDOW_MS, now)) return "global";
  hits.get(`ip:${ip}`)!.push(now);
  hits.get("global")!.push(now);
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= PER_IP_WINDOW_MS)) hits.delete(key);
  }
  return null;
}

const unavailable = (reason: string, status = 200) =>
  Response.json({ status: "unavailable", reason } satisfies ClassifyResponse, { status });

const plain = (message: string, status: number) =>
  new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_IMAGE_CHARS + 4096) return plain("Photo is too large.", 413);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return plain("Body must be JSON.", 400);
  }
  if (
    typeof json === "object" &&
    json !== null &&
    typeof (json as { image?: unknown }).image === "string" &&
    (json as { image: string }).image.length > MAX_IMAGE_CHARS
  ) {
    return plain("Photo is too large.", 413);
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return plain(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  const { image, note, answer, sampleId } = parsed.data;
  const answered = Boolean(answer);

  // Demo mode: saved answers, through the same decide() as a live answer.
  // Own keys only: "constructor" or "toString" must not reach Object.prototype.
  if (sampleId && Object.hasOwn(DEMO_SAMPLES, sampleId)) {
    const sample = DEMO_SAMPLES[sampleId];
    const raw = (answer && sample.afterAnswer && Object.hasOwn(sample.afterAnswer, answer.answer) && sample.afterAnswer[answer.answer]) || sample.first;
    await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
    return Response.json(decide(raw, { answered, source: "demo", model: DEMO_MODEL_LABEL }));
  }
  if (!image) return plain("Unknown sampleId.", 400);

  const models = pickModels();
  if (models.length === 0) {
    return unavailable("No AI key configured — pick the problem yourself; the rules still apply.");
  }

  // Only real model calls count toward the limit; saved demo answers cost nothing.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimited(ip);
  if (limit === "ip") {
    return unavailable("Too many photos in a short time — try again in a few minutes. You can pick the problem yourself; the rules still apply.", 429);
  }
  if (limit === "global") {
    return unavailable("Lots of photos right now, so the AI is taking a breather. Pick the problem yourself — the rules still apply.", 429);
  }

  try {
    const { raw, model } = await classifyImage(
      { image, note, answer },
      { models, timeoutMs: MODEL_TIMEOUT_MS },
    );
    return Response.json(decide(raw, { answered, source: "ai", model }));
  } catch (error) {
    // The message lists model ids and error text only; the photo is never logged.
    if (error instanceof ClassifyBusy) {
      console.warn("[classify] busy:", error.message);
      return unavailable("The AI is at its free-tier limit for the moment. Pick the problem yourself — the rules still apply.");
    }
    if (error instanceof ClassifyUnavailable) console.warn("[classify] unavailable:", error.message);
    else console.warn("[classify] unexpected error:", error instanceof Error ? error.name : "unknown");
    return unavailable("The AI couldn't read this photo right now.");
  }
}
