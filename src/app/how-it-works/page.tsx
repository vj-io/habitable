import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Arrow,
  Camera,
  Chip,
  Clock,
  Doc,
  DoodleCard,
  Highlight,
  MonoLabel,
  NumberCircle,
  Pencil,
  Shield,
  SketchBox,
  Stamp,
  Tag,
} from "@/components/doodle";
import { CLASS_TONE, IssueIcon } from "@/components/issue/meta";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CLASS_TABLE, CLOCK_NOTE, CLOCK_SOURCE_URL, RULES, RULES_VERSION, type IssueRules } from "@/lib/rules";
import { ISSUE_IDS, type IssueId } from "@/lib/types";

const REPO_URL = "https://github.com/vj-io/habitable";

export const metadata: Metadata = {
  title: "How it works — Habitable",
  description:
    "AI proposes, code disposes: the AI only names the problem; a cited table of NYC housing-code rules sets the hazard class and the correction window. Full rules table, sources and privacy.",
};

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";

function Section({ n, title, id, children }: { n: number; title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-6 space-y-5">
      <NumberCircle n={n} as="h2">
        <span id={id}>{title}</span>
      </NumberCircle>
      {children}
    </section>
  );
}

type Node = { title: string; body: string; icon: ReactNode; tone: "ink" | "violet" | "marker" };

const FLOW: Node[] = [
  { title: "Your photo", body: "Fingerprinted and dated on your phone. Location stripped.", icon: <Camera size={30} />, tone: "ink" },
  { title: "AI picks one of 7", body: "Leak, mold, heat, pests, lock, paint — or not covered. Plus how sure.", icon: <Pencil size={28} />, tone: "violet" },
  { title: "Rules table", body: "Plain data. Every row cites the NYC code and an HPD source.", icon: <Shield size={30} />, tone: "marker" },
  { title: "Class + window + citation", body: "Stamped A, B or C, the correction window, the section.", icon: <Stamp tone="amber" size="sm" rotate={-6} thud={false}>B</Stamp>, tone: "ink" },
  { title: "Your timeline", body: "Day counter, countdown, follow-ups, receipts.", icon: <Clock size={30} />, tone: "ink" },
  { title: "The notice", body: "A dated PDF for your landlord, EN or ES.", icon: <Doc size={30} />, tone: "ink" },
];

const NODE_STYLE = {
  ink: { fill: "var(--color-paper-2)", color: "var(--color-ink)", text: "" },
  violet: { fill: "var(--color-violet-tint)", color: "var(--color-violet)", text: "text-violet-ink" },
  marker: { fill: "var(--color-marker)", color: "var(--color-ink)", text: "text-on-marker" },
};

function Diagram() {
  return (
    <figure className="space-y-4">
      <ol className="mx-auto flex max-w-xl flex-col items-stretch gap-1 2xl:max-w-none 2xl:flex-row 2xl:items-stretch 2xl:gap-0">
        {FLOW.map((n, i) => {
          const s = NODE_STYLE[n.tone];
          return (
            <li key={n.title} className="flex flex-col items-center 2xl:flex-1 2xl:flex-row">
              <SketchBox seed={200 + i} fill={s.fill} color={s.color} strokeWidth={2.5} className={`w-full space-y-1.5 p-4 2xl:h-full ${s.text}`}>
                <span className="flex items-center gap-2">
                  {n.icon}
                  <span className={`font-display text-lg leading-tight font-extrabold ${n.tone === "violet" ? "font-hand text-[1.4rem] font-normal" : ""}`}>{n.title}</span>
                </span>
                <span className={`block text-[0.9375rem] leading-snug ${n.tone === "violet" ? "font-hand text-lg" : "text-ink/80"}`}>{n.body}</span>
              </SketchBox>
              {i < FLOW.length - 1 &&
                (i === 1 ? (
                  <span className="my-2 flex flex-col items-center gap-1 text-center 2xl:mx-1 2xl:my-0 2xl:w-14 2xl:shrink-0 2xl:justify-center">
                    <span className="h-6 border-l-[3px] border-dashed border-red 2xl:h-14" aria-hidden="true" />
                    <span className="font-hand text-base leading-tight text-red-ink">AI stops here</span>
                  </span>
                ) : (
                  <span className="flex justify-center py-1 2xl:w-7 2xl:shrink-0 2xl:items-center 2xl:py-0" aria-hidden="true">
                    <Arrow direction="down" size={26} className="2xl:hidden" />
                    <Arrow size={24} className="hidden 2xl:block" />
                  </span>
                ))}
            </li>
          );
        })}
      </ol>
      <figcaption className="font-hand text-xl leading-snug">
        <span className="text-violet-ink">Violet is the AI&apos;s pencil</span> — a guess you can correct.{" "}
        <Highlight animate={false}>Lime and ink are the code</Highlight> — the same answer every time, with a source.
      </figcaption>
    </figure>
  );
}

type Variant = IssueRules["variants"][number];

function conditionText(issue: IssueId, v: Variant) {
  const rules = RULES[issue];
  return Object.entries(v.when).map(([factId, expected]) => {
    const values = Array.isArray(expected) ? expected : [expected];
    if (factId === "heatSeason") return `Heat season (Oct 1 – May 31): ${values[0] === "yes" ? "yes" : "no"} — from the date`;
    const q = rules.facts.find((f) => f.factId === factId);
    const labels = values.map((val) => q?.options.find((o) => o.value === val)?.label ?? val);
    return `${q?.prompt ?? factId} → ${labels.join(" or ")}`;
  });
}

function RulesTable() {
  return (
    <div className="space-y-6">
      {ISSUE_IDS.map((id, idx) => {
        const r = RULES[id];
        return (
          <DoodleCard key={id} as="article" seed={300 + idx} padding="1.25rem" appear={false} draw={false} aria-labelledby={`rule-${id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`rule-${id}`} className="flex items-center gap-2 font-display text-xl font-extrabold">
                <IssueIcon issue={id} size={26} /> {r.label}
              </h3>
              <span className="flex gap-3 font-mono text-[0.75rem] tracking-[0.06em] uppercase">
                <a href={r.hpdUrl} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
                  HPD
                </a>
                <a href={r.complaintUrl} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
                  311
                </a>
              </span>
            </div>
            <ul className="mt-3 divide-y-2 divide-dashed divide-ink/15">
              {r.variants.map((v) => (
                <li key={v.ruleId} className="grid gap-2 py-3.5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:gap-5">
                  <div className="space-y-0.5">
                    <MonoLabel as="p">If</MonoLabel>
                    {conditionText(id, v).map((c) => (
                      <p key={c} className="leading-snug">
                        {c}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 md:block md:space-y-1.5">
                    {"outcome" in v ? (
                      <Tag>no class</Tag>
                    ) : (
                      <>
                        <Stamp tone={CLASS_TONE[v.hazardClass]} size="sm" rotate={-4} thud={false} seed={v.ruleId.length}>
                          Class {v.hazardClass}
                        </Stamp>
                        <p className="font-mono text-sm font-bold">{v.window.text}</p>
                      </>
                    )}
                  </div>
                  <div className="text-[0.9375rem] leading-snug">
                    {"outcome" in v ? (
                      <p>{v.reason}</p>
                    ) : (
                      <a href={v.sourceUrl} target="_blank" rel="noreferrer" className={`${linkClass} font-mono text-[0.8125rem]`}>
                        {v.citation}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </DoodleCard>
        );
      })}
      <DoodleCard tone="marker" seed={340} padding="1.25rem" appear={false} draw={false}>
        <h3 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <IssueIcon issue="not_covered" size={26} /> Anything else
        </h3>
        <p className="mt-2 leading-snug">
          No class. You can pick one of the six yourself, or log it as a dated note — it still gets a fingerprint and a receipt.
        </p>
      </DoodleCard>
    </div>
  );
}

const SOURCES: [string, string][] = [
  ["HPD — Clear Violations (classes and correction windows)", CLOCK_SOURCE_URL],
  ["HPD — Mold and pests (Local Law 55)", "https://www.nyc.gov/site/hpd/services-and-information/indoor-allergen-hazards-mold-and-pests.page"],
  ["HPD — Heat and hot water", "https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water-information.page"],
  ["HPD — Lead-based paint", "https://www.nyc.gov/site/hpd/services-and-information/lead-based-paint.page"],
  ["NYC Open Data — HPD violations (wvxf-dwi5)", "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5"],
  ["NYC Open Data — HPD registrations (tesw-yqqr)", "https://data.cityofnewyork.us/Housing-Development/Multiple-Dwelling-Registrations/tesw-yqqr"],
  ["NYC Open Data — HPD registration contacts (feu5-w2e2)", "https://data.cityofnewyork.us/resource/feu5-w2e2.json"],
  ["NYC Open Data — PLUTO, year built (64uk-42ks)", "https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks"],
  ["NYC GeoSearch — address lookup", "https://geosearch.planninglabs.nyc/docs/"],
  ["NYC311 — apartment maintenance complaints", "https://portal.311.nyc.gov/article/?kanumber=KA-01074"],
  ["Local Law 55 of 2018", "https://www.nyc.gov/assets/buildings/local_laws/ll55of2018.pdf"],
  ["Local Law 86 of 2017", "https://www.nyc.gov/assets/buildings/local_laws/ll86of2017.pdf"],
];

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 space-y-16 px-4 pt-8 pb-6 sm:px-6">
        <header className="max-w-3xl space-y-5">
          <MonoLabel as="p">How it works</MonoLabel>
          <h1 className="font-display text-[2.75rem] leading-[1.02] font-extrabold sm:text-6xl">
            AI proposes, <Highlight>code disposes</Highlight>.
          </h1>
          <p className="text-lg leading-relaxed text-ink/85">
            A vision model is good at saying &ldquo;that looks like a leak.&rdquo; It is not allowed to say what the law requires. In Habitable the
            AI only names the problem, and a small, cited table of NYC housing-code rules decides the hazard class and the correction window —
            the same answer every time, with a source you can click.
          </p>
        </header>

        <Section n={1} title="The flow" id="flow">
          <Diagram />
        </Section>

        <Section n={2} title="Who does what" id="roles">
          <div className="grid gap-6 md:grid-cols-3">
            <DoodleCard tone="violet" seed={401} padding="1.25rem" appear={false} className="space-y-2">
              <MonoLabel as="p" muted={false} className="text-violet-ink">
                The AI proposes
              </MonoLabel>
              <p className="font-hand text-xl leading-snug text-violet-ink">
                Picks exactly one of seven answers, says how sure it is and why in one sentence. If it&apos;s unsure, it asks you one question.
              </p>
              <p className="text-[0.9375rem] leading-snug">It never sees the law and never sets a class or a deadline. You can always correct it.</p>
            </DoodleCard>
            <DoodleCard seed={402} padding="1.25rem" appear={false} className="space-y-2">
              <MonoLabel as="p">The code disposes</MonoLabel>
              <p className="leading-snug">
                The rules table is plain data. Each row carries the code section, an HPD or 311 source, the official wording and a plain-English
                line.
              </p>
              <p className="text-[0.9375rem] leading-snug">If a rule needs a fact the photo can&apos;t show — mold size, a child under 6 — it asks you.</p>
              <Chip lead="Set by code">not the AI</Chip>
            </DoodleCard>
            <DoodleCard tone="mint" seed={403} padding="1.25rem" appear={false} className="space-y-2">
              <MonoLabel as="p">You keep the record</MonoLabel>
              <p className="leading-snug">
                Photo, capture time, a SHA-256 fingerprint, a signed server receipt and dated follow-ups — on your phone, ready for a notice,
                311, or housing court.
              </p>
            </DoodleCard>
          </div>
        </Section>

        <Section n={3} title="The full rules table" id="rules">
          <p className="max-w-3xl leading-relaxed">
            Rules are checked top to bottom; the first row whose conditions hold wins. Verified against HPD and NYC311 pages and the enacted local
            laws. <span className="font-mono text-sm">Table version {RULES_VERSION}.</span>
          </p>
          <RulesTable />
          <div className="space-y-3">
            <h3 className="font-display text-xl font-extrabold">HPD&apos;s classes, in its own words</h3>
            <div className="overflow-hidden">
              <table className="w-full border-collapse text-left text-[0.9375rem]">
                <thead>
                  <tr className="border-b-[3px] border-ink">
                    <th scope="col" className="py-2 pr-3 font-mono text-[0.75rem] tracking-[0.1em] uppercase">
                      Class
                    </th>
                    <th scope="col" className="py-2 pr-3 font-mono text-[0.75rem] tracking-[0.1em] uppercase">
                      Meaning
                    </th>
                    <th scope="col" className="py-2 font-mono text-[0.75rem] tracking-[0.1em] uppercase">
                      Window
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CLASS_TABLE.map((row) => (
                    <tr key={row.label} className="border-b-2 border-dashed border-ink/15 align-top">
                      <td className="py-2.5 pr-3 font-display text-lg font-extrabold">{row.class}</td>
                      <td className="py-2.5 pr-3 leading-snug">{row.label}</td>
                      <td className="py-2.5 font-mono text-sm">{row.window}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[0.9375rem] text-muted">
              Source:{" "}
              <a href={CLOCK_SOURCE_URL} target="_blank" rel="noreferrer" className={linkClass}>
                HPD — Clear Violations
              </a>
            </p>
          </div>
        </Section>

        <Section n={4} title="What the countdown means" id="clock">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-4 leading-relaxed">
              <p>
                <b>The legal clock isn&apos;t yours to start.</b> {CLOCK_NOTE}
              </p>
              <p>
                So Habitable&apos;s countdown is the <Highlight animate={false}>repair-by date your notice requests</Highlight>: the day you first
                documented the problem plus the window HPD would give for that class. It&apos;s a fair, specific ask that mirrors the law — not a
                legal deadline.
              </p>
              <p>
                For heat and hot water HPD gives no time at all, so the notice asks for a repair within 24 hours. Heat is only required October 1
                to May 31; hot water all year.
              </p>
            </div>
            <DoodleCard seed={404} padding="1.25rem" appear={false} className="space-y-2 self-start">
              <MonoLabel as="p">Example · Class B leak</MonoLabel>
              <p className="font-display text-lg font-bold">Documented Oct 24 → repair-by Nov 23</p>
              <p className="font-mono text-2xl font-bold">
                30<span className="text-base text-muted">d</span> 00<span className="text-base text-muted">h</span> 00
                <span className="text-base text-muted">m</span>
              </p>
              <p className="font-hand text-lg leading-snug text-muted">Requested repair-by date · mirrors HPD&apos;s 30-day window.</p>
            </DoodleCard>
          </div>
        </Section>

        <Section n={5} title="Privacy" id="privacy">
          <ul className="grid max-w-3xl gap-3 leading-relaxed">
            {[
              ["Stored only on this device.", "Your address, issues, photos and follow-ups live in this browser's storage. No account, no cloud copy."],
              ["Location removed.", "Photos are re-drawn before they're stored, which drops GPS and every other metadata tag."],
              ["What leaves your phone:", "a downscaled copy of the photo and your optional one-line note go to the AI to name the problem, and the photo's fingerprint (not the photo) goes to Habitable's receipt service. Nothing else from your log."],
              ["Address and building lookups", "send what you type in the address box to NYC's public GeoSearch service, then only your building's public tax-lot number (BBL) to NYC Open Data."],
              ["Deleting is real.", "\"Delete my case\" removes everything from this device."],
            ].map(([b, t]) => (
              <li key={b} className="flex gap-2.5">
                <Shield size={22} className="mt-0.5 shrink-0" />
                <span>
                  <b>{b}</b> {t}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={6} title="Limits — and not legal advice" id="limits">
          <div className="max-w-3xl space-y-3 leading-relaxed">
            <p>
              Habitable documents and cites; it doesn&apos;t give legal advice or represent you. An HPD inspector decides the actual class of a
              violation — where that&apos;s a judgment call (leaks, locks, plaster), the card says so and shows how HPD has classed similar cases.
            </p>
            <p>
              NYC only, six problem types. For what usually comes after the notice (311, Housing Court, free legal help, your rights as a tenant),
              see{" "}
              <Link href="/next-steps" className={linkClass}>
                next steps &amp; your rights
              </Link>
              . To file a complaint now, call 311 or go to{" "}
              <a href="https://portal.311.nyc.gov/article/?kanumber=KA-01074" target="_blank" rel="noreferrer" className={linkClass}>
                portal.311.nyc.gov
              </a>
              .
            </p>
          </div>
        </Section>

        <Section n={7} title="Data sources" id="sources">
          <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            {SOURCES.map(([label, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center leading-snug`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="font-hand text-xl leading-snug">
            Built with the Devpost Learn skill pack —{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>
              see the planning docs in the repo
            </a>
            .
          </p>
        </Section>
      </main>
    </>
  );
}
