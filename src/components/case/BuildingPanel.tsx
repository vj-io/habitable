"use client";

import { Building, DoodleButton, DoodleCard, Highlight, MonoLabel, PencilLoader, Tag, rough } from "@/components/doodle";
import { ISSUE_FOR, IssueBadge, IssueIcon } from "@/components/issue/meta";
import { classICount } from "@/lib/building";
import { formatNY } from "@/lib/countdown";
import { LINK_LABEL, linkCounts } from "@/lib/portfolio";
import { useLandlord } from "@/lib/portfolio-client";
import { HPD_ONLINE_URL, REGISTRATION_SOURCE_URL, dayLabel, isOldRegistration, snapshotLabel } from "@/lib/registration";
import { RULES } from "@/lib/rules";
import { AEP_URL, COMPLAINTS_URL, LITIGATIONS_URL, categoryLabel } from "@/lib/signals";
import { ISSUE_IDS, type BuildingRecord, type BuildingSignals, type HazardClass, type IssueId, type RegistrationContact } from "@/lib/types";
import type { BuildingState } from "./useBuilding";

/** HPD dates are calendar days ("2026-10-12"); read them at noon UTC so no timezone shifts the day. */
const day = (d: string | null) => (d ? formatNY(`${d}T12:00:00Z`, "date") : "undated");

const CLASS_ROWS: { c: HazardClass; label: string; color: string }[] = [
  { c: "C", label: "Immediately hazardous", color: "var(--color-red)" },
  { c: "B", label: "Hazardous", color: "var(--color-amber)" },
  { c: "A", label: "Non-hazardous", color: "var(--color-sky)" },
];

export function TallyBar({ value, max, color, seed }: { value: number; max: number; color: string; seed: number }) {
  const w = value === 0 ? 0 : Math.max(4, Math.round((196 * value) / Math.max(max, 1)));
  const r = rough(seed);
  return (
    <svg viewBox="0 0 200 18" preserveAspectRatio="none" className="h-4.5 w-full overflow-visible" aria-hidden="true" fill="none" strokeLinecap="round">
      <path d={r.line(2, 16, 198, 16, 0.8)} stroke="var(--color-ink)" strokeOpacity="0.25" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {w > 0 && <path d={r.rectFill(2, 3, w, 12)} fill={color} opacity={0.85} />}
    </svg>
  );
}

/**
 * Open violations by class, as bars. Class I (information orders) has no bar of its own in the data; it gets an
 * "Other" row when it isn't zero, so the rows always add up to `total`.
 */
export function ClassBars({ byClass, total, label, seed }: { byClass: Record<HazardClass, number>; total: number; label: string; seed: number }) {
  const other = classICount(total, byClass);
  const rows = [
    ...CLASS_ROWS.map((r) => ({ key: r.c, name: `Class ${r.c}`, sub: r.label, n: byClass[r.c], color: r.color })),
    ...(other > 0 ? [{ key: "I", name: "Other", sub: "Class I (information orders)", n: other, color: "var(--color-muted)" }] : []),
  ];
  const max = Math.max(...rows.map((r) => r.n));
  return (
    <ul className="space-y-2.5" aria-label={label}>
      {rows.map((row, i) => (
        <li key={row.key} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3">
          <span className="leading-tight">
            <span className="block font-mono text-sm font-bold">{row.name}</span>
            <span className="block font-hand text-sm leading-tight text-muted">{row.sub}</span>
          </span>
          <TallyBar value={row.n} max={max} color={row.color} seed={seed + i} />
          <span className="text-right font-mono text-lg font-bold tabular-nums">{row.n.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ul>
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
            <Registered record={record} />
          </>
        )}

        {record && record.openTotal > 0 && <Record record={record} related={related} />}

        {record?.signals && <Signals signals={record.signals} />}

        {record && <Landlord bbl={record.bbl} demo={record.source === "demo-fixture"} />}
      </div>
    </DoodleCard>
  );
}

function Record({ record, related }: { record: BuildingRecord; related: IssueId[] }) {
  const recent = [...record.recent]
    .sort((a, b) => Number(!!b.issue && related.includes(b.issue)) - Number(!!a.issue && related.includes(a.issue)))
    .slice(0, 5);
  const issues = ISSUE_IDS.filter((id) => record.byIssue[id] > 0).sort((a, b) => record.byIssue[b] - record.byIssue[a]);
  return (
    <>
      <p className="font-display text-[1.6rem] leading-[1.15] font-extrabold">
        This building has <Highlight>{record.openTotal.toLocaleString("en-US")}</Highlight> open HPD violations
      </p>

      <ClassBars byClass={record.byClass} total={record.openTotal} label="Open violations by class" seed={60} />

      {issues.length > 0 && (
        <div className="space-y-2">
          <MonoLabel as="h3">By problem</MonoLabel>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 min-[400px]:grid-cols-2">
            {issues.map((id) => (
              <li key={id} className={`flex items-center gap-2 ${related.includes(id) ? "font-bold" : ""}`}>
                <IssueBadge issue={id} size={18} />
                <span className="font-mono tabular-nums">{record.byIssue[id]}</span>
                <span className="leading-tight">{ISSUE_FOR[id]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* before the list of recent violations: this panel is sticky on desktop, so what's first stays in view */}
      <Registered record={record} />

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

function Contact({ label, contact }: { label: string; contact: RegistrationContact | null }) {
  return (
    <div className="space-y-0.5">
      <MonoLabel as="dt">{label}</MonoLabel>
      <dd className="leading-snug">
        {contact ? (
          <>
            <span className="block font-bold break-words">{contact.name}</span>
            {contact.address && <span className="block text-[0.9375rem] break-words text-muted">{contact.address}</span>}
          </>
        ) : (
          <span className="text-muted">Not listed</span>
        )}
      </dd>
    </div>
  );
}

/** Who HPD has on record for the building: managing agent first (the person violations are mailed to), then owner and head officer. */
function Registered({ record }: { record: BuildingRecord }) {
  const info = record.registration;
  const current = info?.current;
  return (
    <section aria-labelledby="registered-title" className="space-y-3 border-t-2 border-dashed border-ink/20 pt-5">
      <MonoLabel as="h3">
        <span id="registered-title">Registered with HPD</span>
      </MonoLabel>

      {!info && <p className="text-muted">The registered contacts are unavailable right now.</p>}

      {info && !current && (
        <>
          <p className="font-display text-lg leading-snug font-bold">No HPD registration found for this building.</p>
          <p className="text-[0.9375rem] leading-snug text-muted">
            Many small buildings aren&apos;t registered, so there may be no name on file. Check your lease or rent bill: NYC law (Admin. Code §27-2105) says the
            bill must name the managing agent or owner and a NYC address.
          </p>
        </>
      )}

      {current && (
        <>
          <dl className="space-y-3">
            <Contact label="Managing agent" contact={current.agent} />
            <Contact label="Owner" contact={current.owner} />
            <Contact label="Head officer" contact={current.headOfficer} />
          </dl>
          <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.06em] text-muted">
            Registration {current.registrationId}
            {current.endDate && <> · end date {dayLabel(current.endDate)}</>}
          </p>
          <p className="text-[0.9375rem] leading-snug text-muted">
            {isOldRegistration(current, info?.asOf ?? null)
              ? "This is the newest registration on file for the building, and it is old. Check HPD Online for current contacts."
              : "An end date in the past doesn't mean the building isn't registered; the snapshot may be missing a renewal."}
          </p>
        </>
      )}

      {info && (
        <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.06em] text-muted">
          {snapshotLabel(info.asOf)}
          {record.source === "demo-fixture" && " · saved copy for the demo"}
          <br />
          <a href={HPD_ONLINE_URL} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
            Verify on HPD Online
          </a>
          {" · "}
          <a href={REGISTRATION_SOURCE_URL} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
            NYC Open Data
          </a>
        </p>
      )}
    </section>
  );
}

/** The building's recent HPD history beyond open violations: problems reported, litigation, and the AEP flag. Counts only. */
function Signals({ signals }: { signals: BuildingSignals }) {
  const total = signals.complaints.reduce((t, c) => t + c.n, 0);
  const top = signals.complaints.slice(0, 5);
  return (
    <section aria-labelledby="signals-title" className="space-y-3 border-t-2 border-dashed border-ink/20 pt-5">
      <MonoLabel as="h3">
        <span id="signals-title">Also on HPD&apos;s record</span>
      </MonoLabel>

      {signals.aep && (
        <div className="space-y-1">
          <Tag tone="marker" className="text-lg">
            In HPD&apos;s Alternative Enforcement Program
          </Tag>
          <p className="text-[0.9375rem] leading-snug text-muted">HPD&apos;s program for the city&apos;s most distressed buildings.</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="leading-snug">
          {total > 0 ? (
            <>
              <b className="font-bold tabular-nums">{total.toLocaleString("en-US")}</b> problems reported to HPD since {dayLabel(signals.since)}
            </>
          ) : (
            <>No problems reported to HPD since {dayLabel(signals.since)}.</>
          )}
        </p>
        {top.length > 0 && (
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1 min-[400px]:grid-cols-2" aria-label="Problems reported to HPD by category">
            {top.map((c) => (
              <li key={c.category} className="flex items-baseline gap-2">
                <span className="font-mono tabular-nums">{c.n}</span>
                <span className="leading-tight">{categoryLabel(c.category)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="leading-snug">
        {signals.litigations > 0 ? (
          <>
            <b className="font-bold tabular-nums">{signals.litigations}</b> HPD litigation {signals.litigations === 1 ? "case" : "cases"} on record
          </>
        ) : (
          <>No HPD litigation cases on record.</>
        )}
      </p>

      <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.06em] text-muted">
        Counts by category: no apartments, no names.
        <br />
        <a href={COMPLAINTS_URL} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
          HPD complaints
        </a>
        {" · "}
        <a href={LITIGATIONS_URL} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
          HPD litigation
        </a>
        {" · "}
        <a href={AEP_URL} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
          AEP list
        </a>
      </p>
    </section>
  );
}

/**
 * The landlord's other buildings in one line (count, open violations, rate against the city), linking to /landlord.
 * A saved building snapshot reads the saved landlord snapshot too. Hidden when the building has no HPD registration.
 */
function Landlord({ bbl, demo }: { bbl: string; demo: boolean }) {
  const { status, record, retry } = useLandlord(bbl, demo);
  if (record && !record.portfolio.registered) return null;
  const n = record?.portfolio.buildings.length ?? 0;
  const links = record ? linkCounts(record.portfolio.buildings).filter((l) => l.buildings > 1) : [];
  return (
    <section aria-labelledby="landlord-title" className="space-y-3 border-t-2 border-dashed border-ink/20 pt-5">
      <MonoLabel as="h3">
        <span id="landlord-title">This landlord&apos;s buildings</span>
      </MonoLabel>

      {status === "loading" && (
        <p role="status" className="font-hand text-lg leading-snug text-muted">
          Following the registration to the landlord&apos;s other buildings…
        </p>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-muted">The landlord&apos;s other buildings are unavailable right now.</p>
          <DoodleButton variant="secondary" onClick={retry}>
            Try again
          </DoodleButton>
        </div>
      )}

      {record && (
        <>
          <p className="font-display text-xl leading-snug font-bold">
            <Highlight>{n.toLocaleString("en-US")}</Highlight> {n === 1 ? "building" : "buildings"}
            {record.open && <> · {record.open.total.toLocaleString("en-US")} open violations</>}
            {record.ratio !== null && (
              <>
                {" "}
                · <Highlight>{record.ratio.toFixed(1)}×</Highlight> the NYC rate per apartment
              </>
            )}
          </p>
          <p className="text-[0.9375rem] leading-snug text-muted">
            {links.length > 0
              ? links.map((l) => `${LINK_LABEL[l.kind]}: ${l.buildings} buildings`).join(" · ")
              : "No other buildings found under the same head officer, owner or managing agent."}
          </p>
          <DoodleButton href="/landlord" variant="secondary" icon={<Building size={22} />}>
            See the landlord&apos;s record
          </DoodleButton>
        </>
      )}
    </section>
  );
}

/** One line of building context under the rules card in the snap sheet. Hidden when records are unavailable. */
export function BuildingSnippet({ state, issue, delay = 0 }: { state: BuildingState; issue: IssueId; delay?: number }) {
  const { record } = state;
  if (!record) return null;
  const count = record.byIssue[issue];
  const recent = record.recent.filter((v) => v.issue === issue).slice(0, 2);
  return (
    <DoodleCard tone="sky" seed={23} padding="1rem 1.25rem" delay={delay} className="space-y-2">
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
