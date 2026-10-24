"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Building, Camera, Chip, Cross, Doc, DoodleButton, DoodleCard, MonoLabel, SketchBox } from "@/components/doodle";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SnapSheet } from "@/components/snap/SnapSheet";
import { clearAll } from "@/lib/store";
import { ISSUE_IDS, type CaseFile as CaseFileT, type Issue, type IssueId } from "@/lib/types";
import { BuildingPanel } from "./BuildingPanel";
import { Timeline } from "./Timeline";
import { useBuilding } from "./useBuilding";

function Menu() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="case-menu"
        onClick={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
        className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-ink/5"
      >
        <span className="sr-only">Menu</span>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M4 7.2c5.4-.4 10.8-.3 16 .1M4.2 12.3c5.2-.2 10.4 0 15.6-.2M4 17.1c5.5.3 10.9.2 16-.1" />
        </svg>
      </button>
      {open && (
        <SketchBox
          id="case-menu"
          seed={33}
          fill="var(--color-paper-2)"
          shadow="var(--color-ink)"
          className="absolute top-12 right-0 z-30 w-[17rem] p-2"
        >
          {confirming ? (
            <div className="space-y-3 p-2">
              <p className="font-display text-lg leading-snug font-bold">Delete everything on this device?</p>
              <p className="text-[0.9375rem] leading-snug text-muted">Your address, every issue, photo and follow-up. This can&apos;t be undone.</p>
              <div className="flex flex-wrap gap-2">
                <DoodleButton variant="danger" onClick={() => void clearAll()}>
                  Delete it all
                </DoodleButton>
                <DoodleButton variant="ghost" onClick={() => setConfirming(false)}>
                  Keep it
                </DoodleButton>
              </div>
            </div>
          ) : (
            <ul>
              <li>
                <Link href="/how-it-works" className="flex min-h-11 items-center gap-2.5 rounded px-3 font-display font-bold hover:bg-ink/5">
                  <Doc size={20} /> How it works
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded px-3 text-left font-display font-bold text-red-ink hover:bg-red-tint/60"
                >
                  <Cross size={20} /> Delete my case
                </button>
              </li>
            </ul>
          )}
        </SketchBox>
      )}
    </div>
  );
}

export function CaseFile({ caseFile, issues, persistent }: { caseFile: CaseFileT; issues: Issue[]; persistent: boolean }) {
  const building = useBuilding(caseFile.address.bbl, caseFile.demo);
  const [snapOpen, setSnapOpen] = useState(false);
  const [snapKey, setSnapKey] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const openIssues = issues.filter((i) => !i.fixedAt);
  const related = ISSUE_IDS.filter((id) => issues.some((i) => i.issue === id)) as IssueId[];
  const yearBuilt = caseFile.yearBuilt ?? building.record?.yearBuilt ?? null;

  return (
    <>
      <SiteHeader>
        {caseFile.demo && <Chip lead="Demo"><span className="max-[420px]:sr-only">building</span></Chip>}
        <Menu />
      </SiteHeader>

      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 pt-4 pb-6 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <div className="space-y-6">
            <DoodleCard seed={3} padding="1rem 1.25rem" appear={false}>
              <div className="flex items-start gap-3">
                <Building size={28} className="mt-0.5 shrink-0" />
                <div className="min-w-0 space-y-1">
                  <MonoLabel as="p">Your case{caseFile.demo ? " · demo" : ""}</MonoLabel>
                  <p className="font-display text-xl leading-tight font-bold">{caseFile.address.label.split(",")[0]}</p>
                  <p className="font-mono text-[0.8125rem] leading-relaxed text-muted">
                    Unit {caseFile.unit} · {caseFile.address.borough}
                    {yearBuilt ? ` · built ${yearBuilt}` : ""} · BBL {caseFile.address.bbl}
                  </p>
                </div>
              </div>
            </DoodleCard>

            {!persistent && (
              <DoodleCard tone="marker" appear={false} padding="0.875rem 1.25rem" seed={8}>
                <p role="status" className="font-hand text-xl leading-snug">
                  This browser may not keep your log after you close it. Private browsing often blocks storage — use a regular window to keep your record.
                </p>
              </DoodleCard>
            )}

            <div className="space-y-2">
              <DoodleButton
                size="xl"
                icon={<Camera size={32} />}
                className="w-full"
                onClick={() => {
                  setSnapKey((k) => k + 1);
                  setSnapOpen(true);
                }}
              >
                Snap a problem
              </DoodleButton>
              <p className="text-center font-hand text-lg text-muted">
                photo → <span className="text-violet-ink">AI proposal</span> → the rule → your log
              </p>
            </div>

            <Timeline issues={issues} flashId={flashId} />

            {openIssues.length > 0 && (
              <DoodleCard tone="marker" seed={19} padding="1.25rem" appear={false} className="space-y-3">
                <p className="font-display text-xl leading-snug font-bold">
                  Ready when you are: a dated notice listing {openIssues.length === 1 ? "your open issue" : `all ${openIssues.length} open issues`}.
                </p>
                <DoodleButton href="/notice" size="lg" icon={<Doc size={24} />} className="w-full sm:w-auto">
                  Make the notice
                </DoodleButton>
                <p className="font-hand text-lg leading-snug text-muted">Print-ready PDF in English or Spanish, plus pre-filled 311 text.</p>
              </DoodleCard>
            )}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <BuildingPanel state={building} related={related} />
          </aside>
        </div>
      </main>

      <SnapSheet
        key={snapKey}
        open={snapOpen}
        onClose={() => setSnapOpen(false)}
        caseFile={{ ...caseFile, yearBuilt }}
        building={building}
        onSaved={(id) => {
          setSnapOpen(false);
          setFlashId(id);
          setTimeout(() => setFlashId((f) => (f === id ? null : f)), 6000);
        }}
      />
    </>
  );
}
