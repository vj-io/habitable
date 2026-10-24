"use client";

import { Building, DoodleButton, DoodleCard, Highlight, MonoLabel, PencilLoader, rough } from "@/components/doodle";
import { ISSUE_FOR, IssueIcon } from "@/components/issue/meta";
import { formatNY } from "@/lib/countdown";
import { RULES } from "@/lib/rules";
import { ISSUE_IDS, type BuildingRecord, type HazardClass, type IssueId } from "@/lib/types";
import type { BuildingState } from "./useBuilding";

/** HPD dates are calendar days ("2026-10-12"); read them at noon UTC so no timezone shifts the day. */
const day = (d: string | null) => (d ? formatNY(`${d}T12:00:00Z`, "date") : "undated");

const CLASS_ROWS: { c: HazardClass; label: string; color: string }[] = [
  { c: "C", label: "Immediately hazardous", color: "var(--color-red)" },
  { c: "B", label: "Hazardous", color: "var(--color-amber)" },
  { c: "A", label: "Non-hazardous", color: "var(--color-ink)" },
];

function TallyBar({ value, max, color, seed }: { value: number; max: number; color: string; seed: number }) {
  const w = value === 0 ? 0 : Math.max(4, Math.round((196 * value) / Math.max(max, 1)));
  const r = rough(seed);
  return (
    <svg viewBox="0 0 200 18" preserveAspectRatio="none" className="h-4.5 w-full overflow-visible" aria-hidden="true" fill="none" strokeLinecap="round">
      <path d={r.line(2, 16, 198, 16, 0.8)} stroke="var(--color-ink)" strokeOpacity="0.25" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {w > 0 && <path d={r.rectFill(2, 3, w, 12)} fill={color} opacity={color === "var(--color-ink)" ? 0.75 : 0.85} />}
    </svg>
  );
}

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";

function SourceLine({ record }: { record: BuildingRecord }) {
  return (
    <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.06em] text-muted">
      <a href={record.sourceUrl} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
        NYC Open Data · HPD violations
      </a>
      <br />
      {record.source === "demo-fixture" ? "Saved snapshot for the demo" : "Updated"} · {formatNY(record.fetchedAt, "datetime")}
    </p>
  );
}

/** The building's public record: open HPD violations by class and by problem, plus the newest ones. */
export function BuildingPanel({ state, related }: { state: BuildingState; related: IssueId[] }) {
  const { status, record, retry } = state;
  return (
    <DoodleCard as="section" seed={21} padding="1.25rem" aria-labelledby="building-title" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <MonoLabel as="h2">
          <span id="building-title">Your building · public record</span>
        </MonoLabel>
        <Building size={26} />
      </div>

      <div aria-live="polite" className="space-y-5">
        {status === "loading" && <PencilLoader caption="pulling the city's records…" />}

        {status === "error" && (
          <div className="space-y-3">
            <p className="font-display text-xl leading-snug font-bold">Building records are unavailable right now.</p>
            <p className="text-muted">Everything else still works — your log doesn&apos;t depend on it.</p>
            <DoodleButton variant="secondary" onClick={retry}>
              Try again
            </DoodleButton>
          </div>
        )}

        {record && record.openTotal === 0 && (
          <>
            <p className="font-display text-xl leading-snug font-bold">No open HPD violations on record for this building.</p>
            <p className="text-muted">That can change quickly — an inspection is what puts a violation on record.</p>
            <SourceLine record={record} />
          </>
        )}

        {record && record.openTotal > 0 && <Record record={record} related={related} />}
      </div>
    </DoodleCard>
  );
}

function Record({ record, related }: { record: BuildingRecord; related: IssueId[] }) {
  const max = Math.max(...CLASS_ROWS.map((r) => record.byClass[r.c]));
  const recent = [...record.recent]
    .sort((a, b) => Number(!!b.issue && related.includes(b.issue)) - Number(!!a.issue && related.includes(a.issue)))
    .slice(0, 5);
  const issues = ISSUE_IDS.filter((id) => record.byIssue[id] > 0).sort((a, b) => record.byIssue[b] - record.byIssue[a]);
  return (
    <>
      <p className="font-display text-[1.6rem] leading-[1.15] font-extrabold">
        This building has <Highlight>{record.openTotal.toLocaleString("en-US")}</Highlight> open HPD violations
      </p>

      <ul className="space-y-2.5" aria-label="Open violations by class">
        {CLASS_ROWS.map((row, i) => (
          <li key={row.c} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
            <span className="leading-tight">
              <span className="block font-mono text-sm font-bold">Class {row.c}</span>
              <span className="block font-hand text-sm leading-tight text-muted">{row.label}</span>
            </span>
            <TallyBar value={record.byClass[row.c]} max={max} color={row.color} seed={60 + i} />
            <span className="text-right font-mono text-lg font-bold tabular-nums">{record.byClass[row.c]}</span>
          </li>
        ))}
      </ul>

      {issues.length > 0 && (
        <div className="space-y-2">
          <MonoLabel as="h3">By problem</MonoLabel>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 min-[400px]:grid-cols-2">
            {issues.map((id) => (
              <li key={id} className={`flex items-center gap-2 ${related.includes(id) ? "font-bold" : ""}`}>
                <IssueIcon issue={id} size={20} />
                <span className="font-mono tabular-nums">{record.byIssue[id]}</span>
                <span className="leading-tight">{ISSUE_FOR[id]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <MonoLabel as="h3">Most recent{related.length > 0 ? " · yours first" : ""}</MonoLabel>
          <ol className="space-y-3">
            {recent.map((v) => (
              <li key={v.id} className="flex gap-2.5">
                <span className={`mt-0.5 shrink-0 ${v.issue && related.includes(v.issue) ? "text-ink" : "text-muted"}`}>
                  {v.issue ? <IssueIcon issue={v.issue} size={20} /> : <span className="inline-block w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[0.75rem] tracking-[0.06em] text-muted uppercase">
                    {day(v.date)}
                    {v.hazardClass && <> · Class {v.hazardClass}</>}
                  </span>
                  <span className="line-clamp-2 text-[0.9375rem] leading-snug">{v.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <SourceLine record={record} />
    </>
  );
}

/** One line of building context under the rules card in the snap sheet. Hidden when records are unavailable. */
export function BuildingSnippet({ state, issue, delay = 0 }: { state: BuildingState; issue: IssueId; delay?: number }) {
  const { record } = state;
  if (!record) return null;
  const count = record.byIssue[issue];
  const recent = record.recent.filter((v) => v.issue === issue).slice(0, 2);
  return (
    <DoodleCard tone="lime" seed={23} padding="1rem 1.25rem" delay={delay} className="space-y-2">
      <p className="flex items-start gap-2.5 font-display text-lg leading-snug font-bold">
        <Building size={24} className="mt-0.5" />
        {record.openTotal === 0 ? (
          <span>No open HPD violations on record for this building — yours could be the first.</span>
        ) : (
          <span>
            This building already has {record.openTotal.toLocaleString("en-US")} open HPD violations
            {count > 0 ? ` — ${count} for ${ISSUE_FOR[issue]}.` : `, none yet for ${RULES[issue].short.toLowerCase()}.`}
          </span>
        )}
      </p>
      {recent.length > 0 && (
        <ul className="space-y-1 pl-8.5">
          {recent.map((v) => (
            <li key={v.id} className="text-[0.9375rem] leading-snug">
              <span className="font-mono text-[0.75rem] tracking-[0.06em] text-muted uppercase">
                {day(v.date)}
                {v.hazardClass && <> · Class {v.hazardClass}</>}
              </span>{" "}
              <span className="line-clamp-2">{v.description}</span>
            </li>
          ))}
        </ul>
      )}
      {count > 0 && <p className="pl-8.5 font-hand text-lg leading-snug text-muted">You&apos;re not the only one — it&apos;s on the public record.</p>}
    </DoodleCard>
  );
}
