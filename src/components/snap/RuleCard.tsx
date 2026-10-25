"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Chip, CircleMark, DoodleCard, Highlight, MonoLabel, Stamp, Tag } from "@/components/doodle";
import { CLASS_TONE, IssueIcon, factLines } from "@/components/issue/meta";
import { formatNY } from "@/lib/countdown";
import { CLOCK_NOTE, CLOCK_SOURCE_URL, RULES, RULES_VERSION } from "@/lib/rules";
import type { ClassifiedOutcome, CorrectionWindow, RuleOutcome } from "@/lib/types";
import { Countdown } from "./Countdown";

const isNoTime = (w: CorrectionWindow) => w.text.startsWith("No time");
const span = (w: CorrectionWindow) => (w.days ? `${w.days}-day` : `${w.hours}-hour`);

export function windowPhrase(w: CorrectionWindow) {
  return isNoTime(w) ? "No time to correct" : `${span(w)} correction window`;
}

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";

/** The code's verdict: stamped class, window, live countdown, citation, and the "why?" drawer. */
export function RuleCard({
  outcome,
  facts,
  yearBuilt,
  repairBy,
  fixedAt = null,
  stampDelay = 250,
  action,
}: {
  outcome: ClassifiedOutcome;
  facts: Record<string, string>;
  yearBuilt: number | null;
  repairBy: string;
  fixedAt?: string | null;
  stampDelay?: number;
  /** Shown under the countdown while the issue is not fixed (e.g. "Add to my calendar"). */
  action?: ReactNode;
}) {
  const { window: w } = outcome;
  const lines = factLines(outcome.issue, facts, yearBuilt);
  return (
    <DoodleCard seed={9} padding="1.25rem" aria-label={`Rules table result: Class ${outcome.hazardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-4">
        <div className="min-w-0 flex-1 basis-44 space-y-1.5">
          <MonoLabel>Rules table · NYC housing code</MonoLabel>
          <p className="flex items-center gap-2 font-display text-xl leading-tight font-bold">
            <IssueIcon issue={outcome.issue} /> {RULES[outcome.issue].label}
          </p>
        </div>
        <Stamp tone={CLASS_TONE[outcome.hazardClass]} size="lg" sub={outcome.classLabel} delay={stampDelay} className="mt-1 ml-auto shrink-0">
          Class {outcome.hazardClass}
        </Stamp>
      </div>

      <p className="mt-5 font-display text-[1.6rem] leading-tight font-extrabold">{windowPhrase(w)}</p>

      <div className="mt-4 border-y-2 border-dashed border-ink/20 py-4">
        {fixedAt ? (
          <p className="flex flex-wrap items-center gap-2 font-display text-xl font-bold">
            <Check size={26} className="text-ink" /> Fixed on <span className="font-mono">{formatNY(fixedAt, "date")}</span>
          </p>
        ) : (
          <>
            <MonoLabel as="p">
              {isNoTime(w) ? "Requested repair-by" : "Requested repair-by date"} · {formatNY(repairBy, "datetime")}
            </MonoLabel>
            <Countdown repairBy={repairBy} className="mt-2" />
            {action && <div className="mt-3">{action}</div>}
          </>
        )}
        <p className="mt-2 font-hand text-lg leading-snug text-muted">
          {isNoTime(w)
            ? "Immediately — the notice asks for a repair within 24 hours. HPD gives no time to correct this."
            : `Requested repair-by date · mirrors HPD's ${span(w)} window, which starts when HPD serves a violation.`}
        </p>
      </div>

      <p className="mt-4 leading-relaxed">{outcome.plainEnglish}</p>
      {outcome.note && <p className="mt-2 font-hand text-lg leading-snug text-muted">{outcome.note}</p>}
      <p className="mt-3 font-mono text-sm font-medium">
        <a href={outcome.sourceUrl} target="_blank" rel="noreferrer" className={linkClass}>
          {outcome.citation}
        </a>
      </p>
      <Link
        href={`/ask?q=${encodeURIComponent(`What does the law say about ${RULES[outcome.issue].short.toLowerCase()}? (${outcome.citation})`)}`}
        className={`${linkClass} inline-flex min-h-11 items-center font-hand text-lg`}
      >
        Ask about this rule →
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Chip lead="Set by code">not the AI</Chip>
      </div>

      <details className="group mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-hand text-xl [&::-webkit-details-marker]:hidden">
          <CircleMark draw delay={stampDelay + 600}>why?</CircleMark>
          <span className="text-base text-muted group-open:hidden">see the rule row</span>
          <span className="hidden text-base text-muted group-open:inline">hide</span>
        </summary>
        <div className="mt-3 space-y-4 border-l-[3px] border-ink/15 pl-4">
          <p className="text-lg leading-snug font-medium">
            The AI picked the problem type. <Highlight>This table — not the AI — set the class and window.</Highlight>
          </p>
          <div className="space-y-1">
            <MonoLabel as="p">The rule row</MonoLabel>
            <p className="font-mono text-sm break-words">
              {outcome.ruleId} → Class {outcome.hazardClass} · {w.text}
            </p>
          </div>
          {lines.length > 0 && (
            <div className="space-y-1.5">
              <MonoLabel as="p">Facts it used</MonoLabel>
              <ul className="space-y-1.5">
                {lines.map((l) => (
                  <li key={l.q} className="leading-snug">
                    <span className="text-muted">{l.q}</span> <b className="font-bold">{l.a}</b>
                    {l.from && <span className="font-hand text-lg text-muted"> ({l.from})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outcome.quote && (
            <blockquote className="font-hand text-xl leading-snug">
              “{outcome.quote}”
              <footer className="mt-1 font-mono text-xs tracking-[0.1em] text-muted uppercase">— {host(outcome.sourceUrl)}</footer>
            </blockquote>
          )}
          <ul className="space-y-1 text-base">
            <li>
              Source:{" "}
              <a href={outcome.sourceUrl} target="_blank" rel="noreferrer" className={linkClass}>
                {host(outcome.sourceUrl)}
              </a>
            </li>
            {outcome.lawUrl && (
              <li>
                Law text:{" "}
                <a href={outcome.lawUrl} target="_blank" rel="noreferrer" className={linkClass}>
                  {host(outcome.lawUrl)}
                </a>
              </li>
            )}
          </ul>
          <p className="text-base leading-relaxed text-muted">
            <b className="text-ink">About the clock:</b> {CLOCK_NOTE}{" "}
            <a href={CLOCK_SOURCE_URL} target="_blank" rel="noreferrer" className={linkClass}>
              HPD source
            </a>
          </p>
          <p className="font-mono text-xs tracking-[0.1em] text-muted uppercase">
            Not legal advice · rules table v{RULES_VERSION}
          </p>
        </div>
      </details>
    </DoodleCard>
  );
}

/** Rules said "no class": heat out of season, or something Habitable doesn't cover. */
export function NotApplicableCard({ outcome }: { outcome: Extract<RuleOutcome, { status: "not_applicable" }> }) {
  return (
    <DoodleCard tone="marker" seed={13} padding="1.25rem">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonoLabel>Rules table</MonoLabel>
        <Tag>no class</Tag>
      </div>
      <p className="mt-3 flex items-center gap-2 font-display text-xl font-bold">
        <IssueIcon issue={outcome.issue} />
        {outcome.issue === "not_covered" ? "Not one of the six conditions" : "No violation right now"}
      </p>
      <p className="mt-2 leading-relaxed">{outcome.reason}</p>
      {outcome.sourceUrl && (
        <p className="mt-3 text-base">
          Source:{" "}
          <a href={outcome.sourceUrl} target="_blank" rel="noreferrer" className={linkClass}>
            {host(outcome.sourceUrl)}
          </a>
        </p>
      )}
    </DoodleCard>
  );
}
