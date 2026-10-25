// "AI proposes, code disposes" for legal answers. The model proposes sentences, each with a quote and the id of
// the passage it copied from. Code keeps a sentence only if its quote really is in that passage, word for word
// (ignoring whitespace, letter case, curly vs straight quotes and dash styles). What is shown as the quote is
// then the passage's own text at the matched place, never the model's copy.
import type { Passage } from "./corpus";

/** Shorter quotes ("the owner shall") prove nothing about what the law says. */
export const MIN_QUOTE_CHARS = 20;
export const MAX_CLAIMS = 5;

const FOLD: [RegExp, string][] = [
  [/[‘’‚‛′´`]/, "'"],
  [/[“”„‟″«»]/, '"'],
  [/[‐-―−﹘﹣－]/, "-"],
];
const foldChar = (c: string) => FOLD.find(([re]) => re.test(c))?.[1] ?? c.toLowerCase();

/** Folded text plus, for each folded character, its index in the original (runs of whitespace become one space). */
export function normalize(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      if (norm !== "" && !norm.endsWith(" ")) {
        norm += " ";
        map.push(i);
      }
      continue;
    }
    norm += foldChar(c);
    map.push(i);
  }
  if (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    map.pop();
  }
  return { norm, map };
}

/** Models often wrap a quote in quotation marks or end it with the sentence's period; neither is part of it. */
const trimQuote = (q: string) => q.trim().replace(/^["'“”‘’«»\s]+|["'“”‘’«»\s.,;:]+$/g, "");

/** [start, end) of `quote` in `text`, or null when it is not there word for word (or too short to mean anything). */
export function findQuote(text: string, quote: string): { start: number; end: number } | null {
  const q = normalize(trimQuote(quote)).norm;
  if (q.length < MIN_QUOTE_CHARS) return null;
  const { norm, map } = normalize(text);
  const at = norm.indexOf(q);
  if (at < 0) return null;
  return { start: map[at], end: map[at + q.length - 1] + 1 };
}

export interface ProposedClaim {
  sentence: string;
  quote: string;
  passageId: string;
}

export interface VerifiedClaim {
  /** AI-written. */
  sentence: string;
  passageId: string;
  /** Verbatim from the passage: text.slice(start, end). */
  quote: string;
  start: number;
  end: number;
}

/** Never shown, whatever the quote: Habitable does not tell renters to withhold rent. */
const BLOCKED = /\bwith(?:hold|held|holding)\b|\bstop paying\b|\bdon'?t pay\b/i;

/**
 * Keeps the claims whose quote is in the passage they cite. `passages` are the ones the model was shown; a
 * citation of anything else fails. `dropped` counts failed quotes, `blocked` sentences refused by rule.
 */
export function verifyClaims(
  claims: ProposedClaim[],
  passages: Passage[],
): { verified: VerifiedClaim[]; dropped: number; blocked: number } {
  const byId = new Map(passages.map((p) => [p.id, p]));
  const verified: VerifiedClaim[] = [];
  let dropped = 0;
  let blocked = 0;
  for (const c of claims.slice(0, MAX_CLAIMS)) {
    const sentence = c.sentence.trim();
    if (BLOCKED.test(sentence)) {
      blocked++;
      continue;
    }
    const passage = byId.get(c.passageId);
    const span = passage && sentence ? findQuote(passage.text, c.quote) : null;
    if (!passage || !span) {
      dropped++;
      continue;
    }
    verified.push({ sentence, passageId: passage.id, quote: passage.text.slice(span.start, span.end), ...span });
  }
  return { verified, dropped, blocked };
}
