"use client";

import Link from "next/link";
import { useState } from "react";
import { Arrow, Building, Camera, Doc, DoodleButton, DoodleCard, Highlight, MonoLabel, Stamp } from "@/components/doodle";
import { SiteHeader } from "@/components/site/SiteHeader";
import { readBackupFile, restoreCase } from "@/lib/backup";
import { DEMO_ADDRESS, DEMO_UNIT, DEMO_YEAR_BUILT } from "@/lib/demo/building";
import { saveCase } from "@/lib/store";
import { AddressSetup } from "./AddressSetup";

const STEPS = [
  { n: 1, label: "Snap the problem", art: <Camera size={34} draw delay={200} /> },
  {
    n: 2,
    label: "The code classifies it",
    art: (
      <Stamp tone="amber" size="sm" rotate={-6} delay={700} seed={8}>
        Class B
      </Stamp>
    ),
  },
  { n: 3, label: "Send the notice", art: <Doc size={34} draw delay={1100} /> },
];

function StepStrip() {
  return (
    <ol className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-x-1" aria-label="How Habitable works">
      {STEPS.map((s, i) => [
        <li key={s.n} className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-14 place-items-center">{s.art}</span>
          <span className="font-hand text-[1.125rem] leading-tight">
            <span className="font-mono text-sm font-bold">{s.n}</span> {s.label}
          </span>
        </li>,
        i < 2 && (
          <li key={`arrow-${s.n}`} aria-hidden="true" className="pt-4 text-ink/70">
            <Arrow size={26} rotate={-8} draw delay={400 + i * 400} />
          </li>
        ),
      ])}
    </ol>
  );
}

export function Welcome() {
  const [demoBusy, setDemoBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // No case exists on this screen, so there is nothing to replace and no need to ask first.
  async function restoreFrom(file: File) {
    const result = await readBackupFile(file);
    if (!result.ok) return setRestoreError(result.error);
    try {
      await restoreCase(result.backup);
    } catch {
      setRestoreError("Couldn't save the backup to this device. Check that your browser allows site storage, then try again.");
    }
  }

  async function startDemo() {
    setDemoBusy(true);
    await saveCase({
      version: 1,
      address: DEMO_ADDRESS,
      unit: DEMO_UNIT,
      yearBuilt: DEMO_YEAR_BUILT,
      childUnder6: null,
      demo: true,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto grid w-full max-w-[1100px] flex-1 gap-8 px-4 pt-5 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14 lg:pt-14">
        <section className="space-y-6">
          <MonoLabel as="p">For NYC renters · free · no account</MonoLabel>
          <h1 className="font-display text-[2.75rem] leading-[1.02] font-extrabold sm:text-6xl">
            Your repair problem, <Highlight delay={300}>on the record</Highlight>.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink/85">
            Photograph what&apos;s broken. Habitable dates it, checks what NYC&apos;s housing code says about it, and builds a dated
            repair notice with the evidence attached.
          </p>
          <div className="max-w-md">
            <StepStrip />
          </div>
          <DoodleButton variant="ghost" icon={<Arrow size={20} />} className="lg:hidden" loading={demoBusy} onClick={() => void startDemo()}>
            Just looking? Try the demo building
          </DoodleButton>
          <p className="max-w-md font-hand text-xl leading-snug text-violet-ink">
            The AI only names the problem. A cited rules table — never the AI — sets the hazard class and the correction window.
          </p>
        </section>

        <div className="space-y-5">
          <DoodleCard seed={12} padding="1.5rem 1.25rem" className="space-y-1">
            <h2 className="font-display text-2xl font-extrabold">Start your case</h2>
            <p className="pb-3 text-muted">Takes about 20 seconds. Saved on this device only.</p>
            <AddressSetup />
          </DoodleCard>

          <div className="flex items-center gap-3 px-2" aria-hidden="true">
            <span className="h-0.5 flex-1 bg-ink/15" />
            <span className="font-hand text-lg text-muted">or just look around</span>
            <span className="h-0.5 flex-1 bg-ink/15" />
          </div>

          <div className="space-y-2 px-1">
            <DoodleButton variant="secondary" size="lg" icon={<Building size={24} />} className="w-full" loading={demoBusy} onClick={() => void startDemo()}>
              Try the demo building
            </DoodleButton>
            <p className="text-center font-hand text-lg leading-snug text-muted">
              A real Harlem building with a public HPD record, sample photos, everything labelled DEMO.
            </p>
            <p className="text-center text-[0.9375rem] text-muted">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-violet-ink">
                Have a backup file? <span className="font-bold text-ink underline decoration-2 underline-offset-4">Restore it</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void restoreFrom(f);
                  }}
                />
              </label>
            </p>
            {restoreError && (
              <p role="alert" className="text-center font-hand text-lg leading-snug text-red-ink">
                {restoreError}
              </p>
            )}
          </div>

          <p className="px-1 text-center text-[0.9375rem] leading-relaxed text-muted">
            Not legal advice — Habitable documents and cites; it doesn&apos;t represent you.{" "}
            <Link href="/how-it-works" className="inline-flex min-h-11 items-center font-bold text-ink underline decoration-2 underline-offset-4">
              How it works
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
