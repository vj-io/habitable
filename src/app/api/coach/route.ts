// POST /api/coach { facts, channel, tone, lang, note? } -> { source: "ai" | "template", draft, model? | reason? }.
// The model only writes words around placeholders; coachDraft validates them (lib/coach.ts) and falls back to
// the deterministic template. Facts arrive from the browser and are re-validated here, but they only fill
// placeholders: the model is never given the address, unit or dates.
//
// No `dynamic` / `runtime` exports on purpose (see /api/classify): POST handlers are never cached, and those
// config exports are not allowed with cacheComponents on.

import { pickModels } from "@/lib/ai";
import { coachDraft, CoachInputSchema } from "@/lib/coach-ai";
import { templateDraft, type CoachResult } from "@/lib/coach";
import { clientIp, createLimiter } from "@/lib/rate-limit";

export const maxDuration = 30;

const MAX_BODY_CHARS = 4096;

// Per person: 12 drafts per 10 minutes. Whole instance: 12 per minute, a share of the same free-tier quota the
// photo classifier uses. Only real model calls count.
const rateLimited = createLimiter({ perIp: { limit: 12, windowMs: 10 * 60 * 1000 }, global: { limit: 12, windowMs: 60 * 1000 } });

const plain = (message: string, status: number) =>
  new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return plain("Request is too large.", 413);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return plain("Body must be JSON.", 400);
  }
  const parsed = CoachInputSchema.safeParse(json);
  if (!parsed.success) return plain(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  const input = parsed.data;

  const models = pickModels();
  if (models.length > 0) {
    const limit = rateLimited(clientIp(request));
    if (limit) {
      const reason =
        limit === "ip"
          ? "Too many drafts in a short time, so this is our template. Try the AI again in a few minutes."
          : "Lots of drafts right now and the AI is taking a breather, so this is our template.";
      const body: CoachResult = { source: "template", draft: templateDraft(input.channel, input.facts, input.lang, input.tone), reason };
      return Response.json(body, { status: 429 });
    }
  }
  return Response.json(await coachDraft(input, { models }));
}
