"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow, Building, DoodleButton, DoodleCard, Highlight, MonoLabel, Tag } from "@/components/doodle";
import { CLASS_ROWS, TallyBar } from "@/components/case/BuildingPanel";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatNY } from "@/lib/countdown";
import {
  CONTACTS_URL,
  LINK_LABEL,
  PLUTO_URL,
  PORTFOLIO_CAP,
  SR311_URL,
  VIOLATIONS_URL,
  boroughOf,
  linkCounts,
  type LandlordRecord,
  type LinkKind,
} from "@/lib/portfolio";
import { useLandlord } from "@/lib/portfolio-client";
import { HPD_ONLINE_URL, REGISTRATION_SOURCE_URL, dayLabel, snapshotLabel } from "@/lib/registration";
import { AEP_URL, LITIGATIONS_URL } from "@/lib/signals";
import { useCaseData } from "@/lib/store";

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";
const int = (n: number) => n.toLocaleString("en-US");
const one = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number, word: string) => `${int(n)} ${word}${n === 1 ? "" : "s"}`;

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-4 pb-20 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-mono text-xs font-medium tracking-[0.12em] uppercase underline decoration-2 underline-offset-4 hover:decoration-wavy"
        >
          <Arrow direction="left" size={20} />
          Back to your case file
        </Link>
        {children}
      </main>
    </>
  );
}

/** Official page, new tab, 44px tall. */
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center leading-snug`}>
      {children} ↗
    </a>
  );
}

function Section({ title, id, children, tone = "paper" }: { title: string; id: string; children: ReactNode; tone?: "paper" | "marker" }) {
  return (
    <DoodleCard as="section" tone={tone} seed={700 + id.length} padding="1.25rem" appear={false} draw={false} aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="font-display text-xl leading-tight font-extrabold">
        {title}
      </h2>
      {children}
    </DoodleCard>
  );
}

const Unavailable = ({ what }: { what: string }) => <p className="text-muted">{what} unavailable right now.</p>;

export function LandlordClient() {
  const { caseFile, ready } = useCaseData();
  const state = useLandlord(caseFile?.address.bbl ?? null, caseFile?.demo ?? false);
  if (!ready) {
    return (
      <Shell>
        <p role="status" className="font-hand text-xl text-muted">
          Opening your case…
        </p>
      </Shell>
    );
  }
  if (!caseFile) {
    return (
      <Shell>
        <DoodleCard className="space-y-4">
          <h1 className="font-display text-3xl leading-tight font-extrabold">Set up your case first</h1>
          <p>The landlord&apos;s record starts from your building. Add your address, then come back.</p>
          <DoodleButton href="/">Set up my case</DoodleButton>
        </DoodleCard>
      </Shell>
    );
  }
  const { status, record, retry } = state;
  return (
    <Shell>
      <header className="space-y-3">
        <MonoLabel as="p">Landlord track record</MonoLabel>
        <h1 className="font-display text-[2.4rem] leading-[1.02] font-extrabold">
          This landlord&apos;s <Highlight>buildings</Highlight>
        </h1>
        <p className="text-lg leading-relaxed text-ink/85">
          Every building HPD has registered under the same head officer, corporate owner or managing agent as{" "}
          <span className="font-bold break-words">{caseFile.address.label}</span>.
        </p>
        <p className="font-hand text-xl leading-snug">
          <span className="font-mono text-[0.75rem] tracking-[0.14em] uppercase">Not legal advice.</span> Public records as published. A shared name on a
          registration is a lead, not proof of who owns what.
        </p>
      </header>

      <div aria-live="polite" className="space-y-6">
        {status === "loading" && (
          <p role="status" className="font-hand text-xl leading-snug text-muted">
            Following the registration to the landlord&apos;s other buildings… the first look-up can take half a minute.
          </p>
        )}
        {status === "error" && (
          <DoodleCard className="space-y-3" appear={false}>
            <p className="font-display text-xl leading-snug font-bold">The landlord&apos;s records are unavailable right now.</p>
            <p className="text-muted">NYC Open Data didn&apos;t answer. Your case file doesn&apos;t depend on it.</p>
            <DoodleButton variant="secondary" onClick={retry}>
              Try again
            </DoodleButton>
          </DoodleCard>
        )}
        {record && !record.portfolio.registered && (
          <DoodleCard className="space-y-3" appear={false}>
            <p className="font-display text-xl leading-snug font-bold">No HPD registration found for this building.</p>
            <p className="text-muted">Without a registration there is no head officer, owner or managing agent on file to follow.</p>
          </DoodleCard>
        )}
        {record?.portfolio.registered && <Record record={record} />}
      </div>
    </Shell>
  );
}

function Record({ record }: { record: LandlordRecord }) {
  const { portfolio } = record;
  const n = portfolio.buildings.length;
  return (
    <>
      <Section title="The record at a glance" id="glance" tone="marker">
        <p className="font-display text-[1.6rem] leading-[1.15] font-extrabold">
          {plural(n, "building")}
          {record.units && <> · {plural(record.units.total, "apartment")}</>}
          {record.open && <> · {plural(record.open.total, "open violation")}</>}
        </p>
        {portfolio.capped && (
          <p className="leading-snug">
            More than {int(PORTFOLIO_CAP)} buildings are on record under these names ({int(portfolio.found)} found). The numbers here cover {int(n)}: this
            building, then the ones linked through the owner side, then the rest by tax lot.
          </p>
        )}
        <Comparison record={record} />
      </Section>

      <Section title="Open violations by class" id="classes">
        {record.open ? (
          <ul className="space-y-2.5" aria-label="Open violations by class, all buildings">
            {CLASS_ROWS.map((row, i) => (
              <li key={row.c} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3">
                <span className="leading-tight">
                  <span className="block font-mono text-sm font-bold">Class {row.c}</span>
                  <span className="block font-hand text-sm leading-tight text-muted">{row.label}</span>
                </span>
                <TallyBar value={record.open!.byClass[row.c]} max={Math.max(...CLASS_ROWS.map((r) => record.open!.byClass[r.c]))} color={row.color} seed={80 + i} />
                <span className="text-right font-mono text-lg font-bold tabular-nums">{int(record.open!.byClass[row.c])}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable what="Violation counts are" />
        )}
      </Section>

      <Section title="Most open Class C violations" id="worst">
        {record.worst === null && <Unavailable what="This list is" />}
        {record.worst?.length === 0 && <p>None of these buildings has an open Class C violation.</p>}
        {!!record.worst?.length && (
          <ol className="space-y-3">
            {record.worst.map((w) => (
              <li key={w.bbl} className="flex gap-3">
                <span className="mt-0.5 grid min-w-12 shrink-0 place-items-center rounded-sm bg-red-tint px-1.5 py-0.5 font-mono text-lg font-bold text-red-ink tabular-nums">
                  {int(w.c)}
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block font-bold break-words">
                    {w.address}, {boroughOf(w.bbl)}
                    {w.bbl === record.bbl && (
                      <Tag tone="marker" className="ml-2 align-middle text-base">
                        your building
                      </Tag>
                    )}
                  </span>
                  <span className="block text-[0.9375rem] text-muted">
                    {plural(w.c, "open Class C violation")}
                    {w.units !== null && <> · {plural(w.units, "apartment")}</>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Also on the record" id="also">
        <ul className="space-y-2 leading-snug">
          <li>
            {record.heat311 === null ? (
              <Unavailable what="311 heat complaints are" />
            ) : (
              <>
                <b className="font-bold tabular-nums">{int(record.heat311)}</b> heat and hot water complaints to 311 last heat season ({dayLabel(record.season.start)} –{" "}
                {dayLabel(record.season.end)})
              </>
            )}
          </li>
          <li>
            {record.litigations === null ? (
              <Unavailable what="Litigation counts are" />
            ) : (
              <>
                <b className="font-bold tabular-nums">{int(record.litigations)}</b> HPD litigation {record.litigations === 1 ? "case" : "cases"}, all years
              </>
            )}
          </li>
          <li>
            {record.aep === null ? (
              <Unavailable what="The AEP list is" />
            ) : (
              <>
                <b className="font-bold tabular-nums">{int(record.aep)}</b> of {plural(n, "building")} in HPD&apos;s Alternative Enforcement Program, its program for the
                city&apos;s most distressed buildings
              </>
            )}
          </li>
        </ul>
      </Section>

      <Links record={record} />
      <Method record={record} />
    </>
  );
}

/** Portfolio vs city, open B+C violations per 100 apartments, as two hand-drawn bars. */
function Comparison({ record }: { record: LandlordRecord }) {
  const { bcPer100, baseline, ratio } = record;
  if (bcPer100 === null) return <Unavailable what="The per-apartment rate is" />;
  const max = Math.max(bcPer100, baseline?.per100 ?? 0);
  return (
    <div className="space-y-3">
      {ratio !== null && (
        <p className="font-display text-xl leading-snug font-bold">
          <Highlight>{ratio.toFixed(1)}×</Highlight> the New York City rate of open Class B and C violations per apartment
        </p>
      )}
      <ul className="space-y-2.5" aria-label="Open Class B and C violations per 100 apartments">
        <li className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-3">
          <span className="font-mono text-sm leading-tight font-bold">This landlord</span>
          <TallyBar value={bcPer100} max={max} color="var(--color-marker)" seed={91} />
          <span className="text-right font-mono text-lg font-bold tabular-nums">{one(bcPer100)}</span>
        </li>
        {baseline && (
          <li className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-3">
            <span className="font-mono text-sm leading-tight font-bold">New York City</span>
            <TallyBar value={baseline.per100} max={max} color="var(--color-muted)" seed={92} />
            <span className="text-right font-mono text-lg font-bold tabular-nums">{one(baseline.per100)}</span>
          </li>
        )}
      </ul>
      <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.06em] text-muted">
        Open Class B and C violations per 100 apartments
        {record.units && record.units.buildings < record.portfolio.buildings.length && (
          <>
            {" "}
            · {record.units.buildings} of {record.portfolio.buildings.length} buildings have a PLUTO unit count
          </>
        )}
      </p>
    </div>
  );
}

const LINK_HELP: Record<LinkKind, string> = {
  headOfficer: "The same person, at a business address this building's registration lists for them.",
  owner: "The same company name on the registration.",
  agent: "The same managing agent at the same business address. An agent can manage buildings for several owners.",
};

/** Which names connect the buildings, and how many each brings in. */
function Links({ record }: { record: LandlordRecord }) {
  const counts = linkCounts(record.portfolio.buildings);
  return (
    <Section title="How these buildings are connected" id="links">
      <dl className="space-y-3">
        {record.portfolio.keys.map((k) => (
          <div key={`${k.kind}-${k.name}`} className="space-y-0.5">
            <MonoLabel as="dt">{LINK_LABEL[k.kind]}</MonoLabel>
            <dd className="leading-snug">
              <span className="block font-bold break-words">{k.name}</span>
              <span className="block text-[0.9375rem] text-muted">
                {plural(counts.find((c) => c.kind === k.kind)?.buildings ?? 0, "building")} · {LINK_HELP[k.kind]}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {record.portfolio.keys.length === 0 && <p className="text-muted">The registration names no head officer, corporate owner or managing agent to follow.</p>}
    </Section>
  );
}

function Method({ record }: { record: LandlordRecord }) {
  const { portfolio, baseline } = record;
  return (
    <Section title="How it's counted" id="method">
      <ul className="list-disc space-y-2 pl-5 leading-snug">
        <li>
          Start from this building&apos;s newest HPD registration. Find every registration with the same head officer or managing agent (same name, same
          business address) or the same corporate owner name. Keep a building only if that registration is still its newest one.
        </li>
        <li>Buildings are counted by tax lot (BBL), up to {int(PORTFOLIO_CAP)}.</li>
        <li>
          Open violations are HPD&apos;s open violations on those lots, all classes in the total. Apartments are PLUTO&apos;s residential units.
        </li>
        <li>
          The rate is open Class B and C violations per 100 apartments, at buildings with a unit count. New York City&apos;s rate is all open Class B and C
          violations divided by all residential units in PLUTO
          {baseline && (
            <>
              {" "}
              ({int(baseline.bc)} ÷ {int(baseline.units)}, counted {dayLabel(baseline.asOf)})
            </>
          )}
          .
        </li>
        <li>311 complaints are service requests of type Heat/Hot Water sent to HPD, by tax lot.</li>
      </ul>
      <div className="space-y-0.5">
        <MonoLabel as="p">Sources · NYC Open Data</MonoLabel>
        <ul>
          <li>
            <Ext href={REGISTRATION_SOURCE_URL}>HPD registrations</Ext>
          </li>
          <li>
            <Ext href={CONTACTS_URL}>HPD registration contacts</Ext>
          </li>
          <li>
            <Ext href={VIOLATIONS_URL}>HPD violations</Ext>
          </li>
          <li>
            <Ext href={PLUTO_URL}>PLUTO (residential units)</Ext>
          </li>
          <li>
            <Ext href={SR311_URL}>311 service requests</Ext>
          </li>
          <li>
            <Ext href={LITIGATIONS_URL}>HPD litigations</Ext>
          </li>
          <li>
            <Ext href={AEP_URL}>Alternative Enforcement Program</Ext>
          </li>
          <li>
            <Ext href={HPD_ONLINE_URL}>Verify a building on HPD Online</Ext>
          </li>
        </ul>
      </div>
      <p className="font-mono text-[0.75rem] leading-relaxed tracking-[0.06em] text-muted">
        <Building size={16} className="mr-1 inline align-[-3px]" />
        {record.source === "demo-fixture" ? "Saved snapshot for the demo" : "Updated"} · {formatNY(record.fetchedAt, "datetime")}
        <br />
        {snapshotLabel(portfolio.asOf)}
        <br />
        Not legal advice · Public records as published
      </p>
    </Section>
  );
}
