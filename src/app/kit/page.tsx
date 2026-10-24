import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Arrow,
  Brush,
  Bug,
  Building,
  Camera,
  Check,
  Chip,
  CircleMark,
  Clock,
  Cross,
  Doc,
  DoodleButton,
  DoodleCard,
  Drop,
  Flame,
  Highlight,
  Lock,
  MonoLabel,
  NumberCircle,
  Pencil,
  PencilLoader,
  Shield,
  SketchBox,
  Spark,
  Spore,
  Stamp,
  Tag,
  Underline,
} from "@/components/doodle";
import { SheetDemo } from "./sheet-demo";

export const metadata: Metadata = {
  title: "UI kit — Habitable",
  robots: { index: false },
};

// Values live in globals.css and change with the theme, so the kit shows token names, not hex.
const SWATCHES = [
  ["paper", "bg-paper"],
  ["paper-2", "bg-paper-2"],
  ["ink", "bg-ink"],
  ["muted", "bg-muted"],
  ["marker", "bg-marker"],
  ["marker-tint", "bg-marker-tint"],
  ["violet", "bg-violet"],
  ["violet-ink", "bg-violet-ink"],
  ["violet-tint", "bg-violet-tint"],
  ["red", "bg-red"],
  ["red-ink", "bg-red-ink"],
  ["red-tint", "bg-red-tint"],
  ["amber", "bg-amber"],
  ["amber-ink", "bg-amber-ink"],
  ["amber-tint", "bg-amber-tint"],
  ["sky", "bg-sky"],
  ["sky-ink", "bg-sky-ink"],
  ["sky-tint", "bg-sky-tint"],
  ["mint", "bg-mint"],
  ["mint-ink", "bg-mint-ink"],
  ["mint-tint", "bg-mint-tint"],
  ["pink", "bg-pink"],
  ["pink-ink", "bg-pink-ink"],
  ["pink-tint", "bg-pink-tint"],
] as const;

const ICONS = [
  ["Drop", Drop, "leak"],
  ["Spore", Spore, "mold"],
  ["Flame", Flame, "heat"],
  ["Bug", Bug, "pests"],
  ["Lock", Lock, "lock"],
  ["Brush", Brush, "paint"],
  ["Camera", Camera, ""],
  ["Check", Check, ""],
  ["Cross", Cross, ""],
  ["Spark", Spark, ""],
  ["Pencil", Pencil, ""],
  ["Clock", Clock, ""],
  ["Building", Building, ""],
  ["Doc", Doc, ""],
  ["Shield", Shield, ""],
  ["Arrow", Arrow, ""],
] as const;

function Section({ n, title, id, children }: { n: number; title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`s${n}`} className="scroll-mt-6 space-y-5">
      <NumberCircle n={n} as="h2">
        <span id={`s${n}`}>{title}</span>
      </NumberCircle>
      {children}
    </section>
  );
}

export default function KitPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-14 px-4 pt-10 pb-24 sm:px-6">
      <header className="space-y-4">
        <MonoLabel>Habitable / doodle UI kit</MonoLabel>
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl">
          Your repair problem, <Highlight>on the record</Highlight>.
        </h1>
        <p className="max-w-xl text-lg text-ink/85">
          Ink on grid paper. <Highlight tone="violet">Violet pencil</Highlight> is what the AI proposes;{" "}
          the <Highlight>marker</Highlight> is what the code decided; red, amber and sky are HPD classes C, B and A; mint means done.
        </p>
      </header>

      <Section n={1} title="Tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, bg]) => (
            <li key={name} className="flex items-center gap-2.5">
              <span
                className={`size-10 shrink-0 border-2 border-ink ${bg}`}
                style={{ borderRadius: "14px 4px 12px 5px / 5px 12px 4px 14px" }}
              />
              <span className="min-w-0">
                <span className="block font-mono text-xs font-bold">{name}</span>
                <span className="block font-mono text-xs text-muted">--color-{name}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={2} title="Type">
        <div className="space-y-3">
          <p className="font-display text-4xl font-extrabold leading-tight">Archivo 800 for claims.</p>
          <p className="font-display text-2xl font-bold">Archivo 700 for headings and buttons.</p>
          <p>Archivo 400 for body copy: plain, warm, direct, a little wry.</p>
          <p className="font-hand text-2xl text-violet-ink">Patrick Hand for notes, labels and the AI&apos;s voice.</p>
          <p className="font-mono text-sm">JetBrains Mono · 2026-10-24 14:02 · sha256 9f2c…e41a · 29d 23h 59m</p>
          <MonoLabel>Mono label · uppercase · .14em</MonoLabel>
        </div>
      </Section>

      <Section n={3} title="Buttons" id="buttons">
        <DoodleButton size="xl" icon={<Camera size={32} />} className="w-full">
          Snap a problem
        </DoodleButton>
        <div className="flex flex-wrap items-center gap-4">
          <DoodleButton>Continue</DoodleButton>
          <DoodleButton variant="secondary" icon={<Building />}>
            Try the demo building
          </DoodleButton>
          <DoodleButton variant="danger" icon={<Cross size={20} />}>
            Delete my case
          </DoodleButton>
          <DoodleButton variant="ghost" icon={<Pencil size={20} />}>
            Not right?
          </DoodleButton>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <DoodleButton size="lg" href="/kit#flow" icon={<Doc />}>
            Download PDF (link)
          </DoodleButton>
          <DoodleButton loading>Reading</DoodleButton>
          <DoodleButton variant="secondary" disabled>
            Disabled
          </DoodleButton>
        </div>
      </Section>

      <Section n={4} title="The flow" id="flow">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
          <DoodleCard tone="violet" seed={5}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MonoLabel muted={false} className="text-violet-ink">AI proposes</MonoLabel>
              <Tag tone="violet">pencil · you can fix it</Tag>
            </div>
            <p className="mt-3 font-hand text-[1.7rem] leading-tight text-violet-ink">
              Looks like: <span className="underline decoration-2 underline-offset-4">Leak / water damage</span> · 92% sure
            </p>
            <p className="mt-2 font-hand text-xl leading-snug text-violet-ink">
              Brown ring on the ceiling right under the bathroom — classic slow leak.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <DoodleButton size="md" icon={<Check size={20} />}>
                Yes, that&apos;s it
              </DoodleButton>
              <DoodleButton variant="ghost" icon={<Pencil size={20} />}>
                Not right?
              </DoodleButton>
            </div>
          </DoodleCard>

          <DoodleCard delay={180} seed={9}>
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-4">
              <div className="min-w-0 flex-1 basis-48 space-y-1">
                <MonoLabel>Rules table · sample</MonoLabel>
                <p className="flex items-center gap-2 font-display text-xl font-bold">
                  <Drop className="text-ink" /> Leak / water damage
                </p>
              </div>
              <Stamp tone="amber" size="lg" sub="Hazardous" delay={500} className="mt-1 ml-auto shrink-0">
                Class B
              </Stamp>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <MonoLabel as="dt">Window</MonoLabel>
                <dd className="font-mono text-lg font-bold">30 days</dd>
              </div>
              <div>
                <MonoLabel as="dt">Repair by</MonoLabel>
                <dd className="font-mono text-lg font-bold">2026-11-23</dd>
              </div>
              <div className="col-span-2">
                <MonoLabel as="dt">Countdown</MonoLabel>
                <dd className="font-mono text-2xl font-bold text-red-ink">
                  29<span className="text-sm">d</span> 23<span className="text-sm">h</span> 59
                  <span className="text-sm">m</span> 12<span className="text-sm">s</span>
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Chip lead="Set by code">not the AI</Chip>
              <span className="font-hand text-xl">
                <CircleMark draw delay={900} color="var(--color-ink)">
                  why?
                </CircleMark>
              </span>
            </div>
          </DoodleCard>
        </div>
        <div className="flex items-center gap-3 pl-2 text-ink">
          <Arrow direction="up" size={40} className="ink-boil" draw delay={1100} />
          <p className="font-hand text-xl">the table decides the class — the AI only names the problem</p>
        </div>
      </Section>

      <Section n={5} title="Stamps">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
          <Stamp tone="ink" sub="Non-hazardous" rotate={-4}>
            Class A
          </Stamp>
          <Stamp tone="amber" sub="Hazardous" rotate={-7} seed={8}>
            Class B
          </Stamp>
          <Stamp tone="red" sub="Immediately hazardous" rotate={-5} seed={12}>
            Class C
          </Stamp>
          <Stamp tone="violet" sub="Tentative" rotate={-6} seed={4}>
            AI guess
          </Stamp>
          <Stamp tone="marker" sub="By the rules table" rotate={-8} seed={6}>
            Verified
          </Stamp>
          <Stamp tone="red" size="sm" rotate={-5} seed={2}>
            Day 12
          </Stamp>
        </div>
      </Section>

      <Section n={6} title="Chips & tags">
        <div className="flex flex-wrap items-center gap-3">
          <Chip lead="Verified by code">Rules table v1</Chip>
          <Chip>sha256 · 9f2c…e41a</Chip>
          <Chip lead="Demo">sample building</Chip>
          <Tag>first documented</Tag>
          <Tag tone="violet">AI · 92%</Tag>
          <Tag tone="red">deadline</Tag>
          <Tag tone="amber">Class B</Tag>
          <Tag tone="sky">Class A</Tag>
          <Tag tone="mint">fixed ✓</Tag>
        </div>
      </Section>

      <Section n={7} title="Drawn icons">
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8">
          {ICONS.map(([name, Icon, issue], i) => (
            <li key={name} className="flex flex-col items-center gap-1.5 text-center">
              <Icon size={30} draw delay={i * 60} />
              <span className="font-mono text-[0.6875rem] font-bold">{name}</span>
              {issue && <span className="font-hand text-base leading-none text-muted">{issue}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section n={8} title="Marks">
        <p className="text-xl leading-relaxed">
          Highlighter in <Highlight>marker</Highlight>, <Highlight tone="violet">violet</Highlight>,{" "}
          <Highlight tone="red">red</Highlight>, <Highlight tone="sky">sky</Highlight> and <Highlight tone="mint">mint</Highlight> — it wraps
          across lines when a phrase is long, like <Highlight tone="sky">this deliberately long highlighted phrase</Highlight>.
        </p>
        <p className="font-hand text-2xl">
          Circle the <CircleMark draw>important bit</CircleMark>, then{" "}
          <Underline draw delay={300} color="var(--color-red)">
            underline the deadline
          </Underline>
          .
        </p>
        <SketchBox draw boil padding="1rem 1.25rem" className="max-w-md" seed={14}>
          <p className="font-hand text-xl">A bare SketchBox with a boiling outline (decorative stroke only, never the text).</p>
        </SketchBox>
      </Section>

      <Section n={9} title="Loader & sheet">
        <div className="flex flex-wrap items-center gap-8">
          <DoodleCard tone="marker" appear={false} seed={3}>
            <PencilLoader />
          </DoodleCard>
          <SheetDemo />
        </div>
      </Section>
    </main>
  );
}
