"use client";

import Link from "next/link";
import { Doc, DoodleButton, DoodleCard, MonoLabel } from "@/components/doodle";
import { useNow } from "@/components/snap/Countdown";
import { formatNY } from "@/lib/countdown";
import { heatSummary } from "@/lib/heat";
import { nextStep } from "@/lib/next-step";
import type { CaseFile, HeatReading, Issue } from "@/lib/types";

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy inline-flex min-h-11 items-center font-bold";

/** "What you can do next": one short suggestion that follows the renter's place on the ladder. Details live on /next-steps. */
export function NextStepsCard({ caseFile, issues, heatReadings }: { caseFile: CaseFile; issues: Issue[]; heatReadings: HeatReading[] }) {
  const heatBelow = heatSummary(heatReadings).below;
  const step = nextStep(caseFile, issues, useNow(), heatBelow);
  // nextStep counts a heat log with readings below the minimum as one open item; name it as what it is.
  const listing = (open: number) => {
    const n = open - (heatBelow > 0 ? 1 : 0);
    const items = n === 0 ? "" : n === 1 ? "your open issue" : `all ${n} open issues`;
    return heatBelow > 0 ? (items ? `${items} and your heat log` : "your heat log") : items;
  };
  const tone = step.kind === "notice" || step.kind === "file" ? "marker" : "paper";
  return (
    <DoodleCard as="section" tone={tone} seed={19} padding="1.25rem" appear={false} aria-labelledby="next-title" className="space-y-3">
      <MonoLabel as="h2">
        <span id="next-title">What you can do next</span>
      </MonoLabel>

      {step.kind === "photo" && (
        <p className="font-display text-xl leading-snug font-bold">Start with a photo of the problem. Habitable dates it and starts your record.</p>
      )}

      {step.kind === "fixed" && (
        <p className="font-display text-xl leading-snug font-bold">Everything you logged is marked fixed. If something comes back, snap it again.</p>
      )}

      {step.kind === "notice" && (
        <>
          <p className="font-display text-xl leading-snug font-bold">
            Tell your landlord in writing: a dated notice listing {listing(step.open)}.
          </p>
          <DoodleButton href="/notice" size="lg" icon={<Doc size={24} />} className="w-full sm:w-auto">
            Make the notice
          </DoodleButton>
          <p className="font-hand text-lg leading-snug text-muted">
            Print-ready PDF in English or Spanish, plus pre-filled 311 text.
            {step.overdue > 0 && " The date you'd ask for has already passed on at least one problem."}
          </p>
        </>
      )}

      {step.kind === "waiting" && (
        <p className="font-display text-xl leading-snug font-bold">
          You made your notice on {formatNY(step.noticeMadeAt, "date")}. Give it until the repair-by dates. If something is still broken, add a follow-up photo.
        </p>
      )}

      {step.kind === "file" && (
        <>
          <p className="font-display text-xl leading-snug font-bold">
            The repair-by date has passed on {step.overdue === 1 ? "one problem" : `${step.overdue} problems`}. You can file with 311 to ask for an HPD inspection.
          </p>
          <p>
            <a href="https://portal.311.nyc.gov/" target="_blank" rel="noopener noreferrer" className={linkClass}>
              File with 311 ↗
            </a>
          </p>
          <p className="font-hand text-lg leading-snug text-muted">If repairs still don&apos;t happen, an HP Action in Housing Court can order them.</p>
        </>
      )}

      <p>
        <Link href="/next-steps" className={linkClass}>
          Next steps and your rights →
        </Link>
      </p>
    </DoodleCard>
  );
}
