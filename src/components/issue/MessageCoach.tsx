"use client";

import { useMemo, useState } from "react";
import { Check, Doc, DoodleButton, DoodleCard, Highlight, MonoLabel, Pencil, Stamp, Tag } from "@/components/doodle";
import {
  buildFacts,
  callLines,
  placeholderValues,
  render,
  segments,
  templateDraft,
  validateDraft,
  type Channel,
  type CoachResult,
  type Lang,
  type Tone,
  type Values,
} from "@/lib/coach";
import type { CaseFile, Issue } from "@/lib/types";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "email", label: "Email" },
  { id: "call", label: "Call script" },
];

/** A reply that has the shape of a CoachResult (its words are checked separately, by validateDraft). */
function isResult(x: unknown): x is CoachResult {
  const r = x as { source?: unknown; draft?: { subject?: unknown; body?: unknown } } | null;
  return (
    (r?.source === "ai" || r?.source === "template") &&
    typeof r.draft?.body === "string" &&
    (r.draft.subject === undefined || typeof r.draft.subject === "string")
  );
}

/** The draft's words, with each code-filled fact in marker. The AI's own words are violet pencil; a template's are plain ink. */
function Words({ text, values, ai }: { text: string; values: Values; ai: boolean }) {
  return segments(text, values).map((s, i) =>
    s.fact ? (
      <Highlight key={i} animate={false}>
        {s.text}
      </Highlight>
    ) : (
      <span key={i} className={ai ? "text-violet-ink" : undefined}>
        {s.text}
      </span>
    ),
  );
}

/** A small set of choices drawn as pills; a real radio group underneath. */
function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { id: T; label: string; lang?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden="true" className="mr-1">
        <MonoLabel>{legend}</MonoLabel>
      </span>
      {options.map((o) => (
        <label key={o.id} className="inline-flex min-h-11 cursor-pointer items-center">
          <input type="radio" name={`coach-${legend}`} className="peer sr-only" checked={value === o.id} onChange={() => onChange(o.id)} />
          <Tag
            tone={value === o.id ? "marker" : "ink"}
            className={`peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-violet-ink ${value === o.id ? "font-bold" : ""}`}
          >
            <span lang={o.lang}>{o.label}</span>
          </Tag>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * "Draft a message to your landlord or super". The model writes the words; every date, class, window and
 * address is filled in by code from this issue's log (lib/coach.ts) and the result is checked before it is shown.
 * Nothing is sent from here: Copy, or hand the text to the phone's own Messages or Mail.
 */
export function MessageCoach({ caseFile, issue, now }: { caseFile: CaseFile; issue: Issue; now: Date }) {
  const [channel, setChannel] = useState<Channel>("text");
  const [tone, setTone] = useState<Tone>("polite");
  const [lang, setLang] = useState<Lang>("en");
  const [results, setResults] = useState<Record<string, CoachResult>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<{ key: string; ok: boolean } | null>(null);

  const facts = useMemo(() => buildFacts(caseFile, issue, lang, now), [caseFile, issue, lang, now]);
  const values = placeholderValues(facts, lang);
  const key = `${channel}|${tone}|${lang}`;
  const result = results[key];
  const out = result ? render(result.draft, channel, values) : null;
  const ai = result?.source === "ai";
  const note = issue.note.trim().slice(0, 280);

  async function write() {
    const forKey = key;
    // Whatever comes back is checked again here, and a failed call still ends in a usable message.
    const template = (reason: string): CoachResult => ({ source: "template", draft: templateDraft(channel, facts, lang, tone), reason });
    setBusy(true);
    let next: CoachResult;
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facts, channel, tone, lang, ...(note ? { note } : {}) }),
      });
      const data: unknown = res.ok || res.status === 429 ? await res.json() : null;
      if (!isResult(data)) next = template("Habitable's server couldn't write this just now, so this is our template.");
      else if (!validateDraft(data.draft, facts, lang, channel).ok) next = template("That draft didn't pass our checks, so this is our template.");
      else next = data;
    } catch {
      next = template("Couldn't reach Habitable (are you offline?), so this is our template.");
    }
    setResults((r) => ({ ...r, [forKey]: next }));
    setBusy(false);
  }

  async function copy() {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out.copy);
      setCopied({ key, ok: true });
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied({ key, ok: false });
    }
  }

  function onTabKey(e: React.KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = CHANNELS.findIndex((c) => c.id === channel);
    const next = CHANNELS[(i + step + CHANNELS.length) % CHANNELS.length];
    setChannel(next.id);
    document.getElementById(`coach-tab-${next.id}`)?.focus();
  }

  const copyState = copied?.key === key ? copied.ok : null;
  const linkClass = "inline-flex min-h-11 items-center gap-2 font-display font-bold underline decoration-2 underline-offset-4";

  return (
    <DoodleCard as="section" seed={73} padding="1.25rem" appear={false} aria-labelledby="coach-title" className="space-y-4">
      <div className="space-y-1">
        <h2 id="coach-title" className="font-display text-xl font-extrabold">
          Draft a message to your landlord or super
        </h2>
        <p className="font-hand text-lg leading-snug text-muted">
          The AI picks the words. Every date, class and address comes from your log, filled in by code.
        </p>
      </div>

      <div role="tablist" aria-label="Kind of message" className="flex flex-wrap gap-2" onKeyDown={onTabKey}>
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            id={`coach-tab-${c.id}`}
            aria-selected={channel === c.id}
            aria-controls="coach-panel"
            tabIndex={channel === c.id ? 0 : -1}
            onClick={() => setChannel(c.id)}
            className="min-h-11 cursor-pointer"
          >
            <Tag tone={channel === c.id ? "marker" : "ink"} className={channel === c.id ? "font-bold" : ""}>
              {c.label}
            </Tag>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <Choice
          legend="Tone"
          value={tone}
          onChange={setTone}
          options={[
            { id: "polite", label: "Polite" },
            { id: "firm", label: "Firm" },
          ]}
        />
        <Choice
          legend="Language"
          value={lang}
          onChange={setLang}
          options={[
            { id: "en", label: "English", lang: "en" },
            { id: "es", label: "Español", lang: "es" },
          ]}
        />
      </div>

      <div role="tabpanel" id="coach-panel" aria-labelledby={`coach-tab-${channel}`} className="space-y-3">
        <p role="status" className="sr-only">
          {result ? "Draft ready" : ""}
        </p>
        {!result || !out ? (
          <p className="font-hand text-xl leading-snug text-muted">Nothing written yet. Pick the kind of message, then tap the button.</p>
        ) : (
          <DoodleCard tone={ai ? "violet" : "paper"} seed={79} padding="1rem" appear={false} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tag tone={ai ? "violet" : "ink"}>{ai ? "AI wrote the words" : "Template · no AI"}</Tag>
              <Stamp tone="marker" size="sm" rotate={-4} thud={false}>
                Facts from your log
              </Stamp>
            </div>
            {result.source === "template" && <p className="font-hand text-lg leading-snug text-muted">{result.reason}</p>}

            <div lang={lang} data-testid="coach-draft" data-source={result.source} className="space-y-2 font-hand text-[1.35rem] leading-snug">
              {channel === "email" && (
                <p>
                  <MonoLabel as="span" className="mr-2">
                    Subject
                  </MonoLabel>
                  <Words text={(result.draft.subject ?? "").trim()} values={values} ai={ai} />
                </p>
              )}
              {channel === "call" ? (
                <ul className="list-disc space-y-1.5 pl-5">
                  {callLines(result.draft.body).map((line, i) => (
                    <li key={i}>
                      <Words text={line} values={values} ai={ai} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-line">
                  <Words text={result.draft.body.trim()} values={values} ai={ai} />
                </p>
              )}
            </div>

            <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.04em] text-muted">
              <Highlight animate={false}>Marker</Highlight> = a fact filled in by code from your log.{" "}
              {ai ? <span className="text-violet-ink">Violet pencil = the AI&apos;s words ({result.model}).</span> : "The words are our fixed template."}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <DoodleButton variant="secondary" icon={copyState ? <Check size={20} /> : <Doc size={20} />} onClick={() => void copy()}>
                <span aria-live="polite">{copyState ? "Copied" : "Copy"}</span>
              </DoodleButton>
              {channel === "text" && (
                <a href={`sms:?&body=${encodeURIComponent(out.body)}`} className={linkClass}>
                  Open in Messages
                </a>
              )}
              {channel === "email" && (
                <a href={`mailto:?subject=${encodeURIComponent(out.subject ?? "")}&body=${encodeURIComponent(out.body)}`} className={linkClass}>
                  Open in Mail
                </a>
              )}
            </div>
            {copyState === false && <p role="alert" className="font-hand text-lg text-red-ink">Copy didn&apos;t work here. Select the text and copy it yourself.</p>}
            {channel === "call" && <p className="font-hand text-lg leading-snug text-muted">Keep notes: who you spoke to, the date, and what they promised.</p>}
          </DoodleCard>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <DoodleButton variant={result ? "ghost" : "primary"} icon={<Pencil size={20} />} loading={busy} onClick={() => void write()}>
            {result ? "Draft again" : "Write my message"}
          </DoodleButton>
        </div>
      </div>

      <p className="font-hand text-lg leading-snug text-muted">
        Habitable sends nothing: read it, change what you like, then send it yourself. The AI sees the problem type, its class and your note, never your
        address, unit or dates. Not legal advice.
      </p>
    </DoodleCard>
  );
}
