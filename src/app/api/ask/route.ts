// POST /api/ask {question} -> AskResult. The model may only propose quoted sentences; askLaw keeps the ones
// whose quotes code finds word for word in the law text (src/lib/law). No `dynamic` / `runtime` exports:
// with cacheComponents on, POST handlers always run on the Node.js runtime and are never cached.

import { z } from "zod";
import { pickModels } from "@/lib/ai";
import { MAX_QUESTION_CHARS, NOTES, askLaw } from "@/lib/law/ask";
import { clientIp, createLimiter } from "@/lib/rate-limit";

export const maxDuration = 30;

const BodySchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Type a question.")
    .max(MAX_QUESTION_CHARS, `Keep the question under ${MAX_QUESTION_CHARS} characters.`),
});

// Per person: 10 AI answers per 10 minutes. Whole instance: 10 per minute, leaving room in the shared
// Gemini free-tier quota for photo reading. Past either cap the answer is a search (no AI), not an error.
const rateLimited = createLimiter({ perIp: { limit: 10, windowMs: 10 * 60 * 1000 }, global: { limit: 10, windowMs: 60 * 1000 } });

const plain = (message: string, status: number) =>
  new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 4096) return plain("Request is too large.", 413);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return plain("Body must be JSON.", 400);
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return plain(parsed.error.issues[0]?.message ?? "Invalid request.", 400);

  let models = pickModels();
  let note: string | undefined;
  // Only questions that would reach a model count toward the limit; a search costs no quota.
  if (models.length && rateLimited(clientIp(request))) {
    models = [];
    note = NOTES.limited;
  }
  return Response.json(await askLaw(parsed.data.question, { models, note }));
}
