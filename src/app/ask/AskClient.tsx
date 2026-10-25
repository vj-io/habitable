"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { DoodleButton, DoodleCard, Highlight, MonoLabel, PencilLoader, Stamp, Tag } from "@/components/doodle";
import { Columns, useLg } from "@/components/site/Columns";
import { SketchInput, inputClass } from "@/components/site/Field";
import type { AskPassage, AskResult } from "@/lib/law/ask";

const MAX = 300;
const EXAMPLES = [
  "Can my landlord charge me for mold removal?",
  "How cold is too cold at night?",
  "How many days does my landlord have to get rid of roaches?",
  "Does my landlord have to paint my apartment?",
];

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Text with [start, end) spans wrapped in a marker highlight. Overlapping spans merge. */
function Marked({ text, spans }: { text: string; spans: [number, number][] }) {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const parts: ReactNode[] = [];
  let at = 0;
  for (const [s, e] of sorted) {
    if (e <= at) continue;
    const start = Math.max(s, at);
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark key={start} className="rounded-sm bg-marker-tint px-0.5 text-ink">
        {text.slice(start, e)}
      </mark>,
    );
    at = e;
  }
  parts.push(text.slice(at));
  return <>{parts}</>;
}

/** "§27-2029(a) · Minimum temperature to be maintained" for law, the page name for HPD excerpts. */
const label = (p: AskPassage) => (p.section.startsWith("§") ? `${p.section} · ${p.title}` : p.source);

function PassageItem({ passage, spans }: { passage: AskPassage; spans: [number, number][] }) {
  return (
    <li className="space-y-2 border-t-2 border-dashed border-ink/15 pt-3 first:border-t-0 first:pt-0">
      <p className="font-mono text-sm font-medium break-words">
        <a href={passage.url} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
          {label(passage)} ↗
        </a>
      </p>
      <p className="leading-relaxed break-words whitespace-pre-line">
        <Marked text={passage.text} spans={spans} />
      </p>
      <p className="font-mono text-xs tracking-[0.08em] text-muted uppercase">
        {passage.source.split(" (")[0]} · copied {passage.retrieved}
      </p>
    </li>
  );
}

function Passages({ passages, spansFor }: { passages: AskPassage[]; spansFor: (p: AskPassage) => [number, number][] }) {
  return (
    <ul className="space-y-4">
      {passages.map((p) => (
        <PassageItem key={p.id} passage={p} spans={spansFor(p)} />
      ))}
    </ul>
  );
}

function Notes({ result }: { result: AskResult }) {
  return (
    <>
      {result.dropped > 0 && (
        <p className="font-hand text-lg leading-snug text-muted">
          {plural(result.dropped, "sentence", "sentences")} dropped — {result.dropped === 1 ? "its quote wasn't" : "their quotes weren't"} in the law
          text.
        </p>
      )}
      {result.blocked > 0 && (
        <p className="font-hand text-lg leading-snug text-muted">
          {plural(result.blocked, "sentence", "sentences")} removed — Habitable never suggests withholding rent.
        </p>
      )}
    </>
  );
}

function Answer({ result }: { result: AskResult }) {
  const byId = new Map(result.passages.map((p) => [p.id, p]));
  return (
    <section aria-labelledby="answer-title" className="space-y-5">
      <div className="space-y-1">
        <h2 id="answer-title" className="font-display text-2xl font-extrabold">
          What the law text says
        </h2>
        <p className="text-[0.9375rem] leading-snug text-muted">
          <span className="font-bold text-violet-ink">Violet</span>: written by AI. <Highlight animate={false}>Highlighted</Highlight>: copied from
          the law, checked word for word by code.
        </p>
      </div>
      <ol className="space-y-6">
        {result.claims.map((c, i) => {
          const p = byId.get(c.passageId)!;
          return (
            <li key={i} className="space-y-2">
              <p className="text-lg leading-snug font-medium text-violet-ink">
                <span className="sr-only">AI-written summary: </span>
                {c.sentence}
              </p>
              <blockquote className="font-hand text-xl leading-snug break-words">
                <span className="sr-only">Quote from the law: </span>
                <Highlight animate={false}>“{c.quote}”</Highlight>
              </blockquote>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Stamp tone="mint" size="sm" rotate={-4} thud={false}>
                  Quote checked
                </Stamp>
                <a href={p.url} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center font-mono text-sm font-medium break-words`}>
                  {p.section.startsWith("§") ? p.section : p.source} ↗
                </a>
              </div>
            </li>
          );
        })}
      </ol>
      <Notes result={result} />
    </section>
  );
}

/** What the AI was given, with the quoted spans marked. A fold-out under the answer on phones; open beside it from lg. */
function PassagesUsed({ result }: { result: AskResult }) {
  const wide = useLg();
  const quoted = (p: AskPassage) => result.claims.filter((c) => c.passageId === p.id).map((c) => [c.start, c.end] as [number, number]);
  return (
    <details open={wide || undefined} className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-display font-bold underline decoration-2 underline-offset-4 lg:hidden [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Show the {plural(result.passages.length, "passage", "passages")} the AI was given</span>
        <span className="hidden group-open:inline">Hide the passages</span>
      </summary>
      <h2 className="mb-3 hidden font-display text-2xl font-extrabold lg:block">The passages the AI was given</h2>
      <div className="mt-3 lg:mt-0">
        <Passages passages={result.passages} spansFor={quoted} />
      </div>
    </details>
  );
}

function Result({ result }: { result: AskResult }) {
  if (result.mode === "answer") return <Answer result={result} />;
  const marks = (p: AskPassage) => p.marks;
  if (result.mode === "search") {
    return (
      <section aria-labelledby="search-title" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="search-title" className="font-display text-2xl font-extrabold">
            Closest law text
          </h2>
          <Tag tone="marker">search only · no AI</Tag>
        </div>
        {result.note && <p className="leading-snug text-muted">{result.note} Your words are highlighted.</p>}
        <Passages passages={result.passages} spansFor={marks} />
      </section>
    );
  }
  return (
    <section aria-labelledby="none-title" className="space-y-4">
      <DoodleCard tone="marker" seed={41} padding="1.1rem" appear={false} draw={false}>
        <h2 id="none-title" className="font-display text-xl font-extrabold">
          I couldn&apos;t find that in the law text I have.
        </h2>
        <p className="mt-1 leading-snug">
          {result.passages.length ? "These passages came closest; your words are highlighted." : "None of its passages use the words in your question."}
        </p>
      </DoodleCard>
      <Notes result={result} />
      {result.passages.length > 0 && <Passages passages={result.passages} spansFor={marks} />}
    </section>
  );
}

/** `aside` is the page's note on what the law text is; it goes under the passages in the right column from lg. */
export function AskClient({ aside }: { aside: ReactNode }) {
  const params = useSearchParams();
  const [question, setQuestion] = useState(() => (params.get("q") ?? "").slice(0, MAX));
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) {
      setError("Type a question first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      if (res.ok) setResult((await res.json()) as AskResult);
      else {
        setResult(null);
        setError((await res.text()) || "Something went wrong. Try again.");
      }
    } catch {
      setError("Couldn't reach Habitable. Asking needs a connection.");
    }
    setBusy(false);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "start" }));
  }

  return (
    <Columns
      left={
        <div className="space-y-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
            className="space-y-3"
          >
            <label htmlFor="ask-q" className="block font-display text-lg font-bold">
              Your question
            </label>
            <SketchInput>
              <textarea
                id="ask-q"
                rows={3}
                maxLength={MAX}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Does my landlord have to fix a leak?"
                aria-describedby="ask-count"
                className={`${inputClass} resize-none text-lg`}
              />
            </SketchInput>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DoodleButton type="submit" size="lg" loading={busy}>
                Ask
              </DoodleButton>
              <span id="ask-count" className="font-mono text-xs text-muted">
                {question.length}/{MAX}
              </span>
            </div>
            {error && (
              <p role="alert" className="font-hand text-lg leading-snug text-red-ink">
                {error}
              </p>
            )}
            <div className="space-y-1 pt-2">
              <MonoLabel as="p">Or try one</MonoLabel>
              <ul className="flex flex-wrap gap-2">
                {EXAMPLES.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setQuestion(q);
                        void ask(q);
                      }}
                      className="min-h-11 cursor-pointer text-left disabled:cursor-not-allowed"
                    >
                      <Tag className="hover:bg-marker-tint">{q}</Tag>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </form>

          <div ref={resultRef} aria-live="polite" className="scroll-mt-6">
            {busy ? <PencilLoader caption="reading the law text…" /> : result && <Result result={result} />}
          </div>
        </div>
      }
      right={
        <>
          {!busy && result?.mode === "answer" && <PassagesUsed result={result} />}
          {aside}
        </>
      }
    />
  );
}
