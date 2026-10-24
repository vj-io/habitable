"use client";

import { Check, DoodleButton, DoodleCard, MonoLabel, Pencil, SketchBox, Tag, rough } from "@/components/doodle";
import { IssueIcon, issueName, pct } from "@/components/issue/meta";
import { RULES } from "@/lib/rules";
import { ISSUE_IDS, type Proposal, type ProposalIssue } from "@/lib/types";

const METER_BOX = rough(31).rect(2, 2, 196, 18, 3);

/** Hand-drawn confidence bar in violet pencil. */
function ConfidenceMeter({ value }: { value: number }) {
  const w = Math.max(4, Math.round(192 * value));
  const fill = rough(32).rectFill(4, 4, w, 14);
  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 200 22" className="h-5.5 w-full max-w-[200px] overflow-visible" aria-hidden="true" fill="none" strokeLinecap="round">
        <path d={fill} fill="var(--color-violet)" opacity="0.55" />
        <path d={METER_BOX} stroke="var(--color-violet)" strokeWidth="2" />
      </svg>
      <span className="font-mono text-lg font-bold text-violet-ink">{pct(value)}</span>
    </span>
  );
}

/** The AI's proposal, in violet pencil: tentative and correctable. */
export function ProposalCard({
  proposal,
  onAccept,
  onCorrect,
}: {
  proposal: Proposal;
  onAccept: () => void;
  onCorrect: () => void;
}) {
  const unsure = proposal.confidence < 0.7;
  return (
    <DoodleCard tone="violet" seed={5} padding="1.25rem" aria-label="AI proposal">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonoLabel muted={false} className="text-violet-ink">
          AI proposes
        </MonoLabel>
        <Tag tone="violet">pencil · you can fix it</Tag>
      </div>
      <p className="mt-3 font-hand text-xl leading-tight text-violet-ink">Looks like</p>
      <p className="mt-0.5 flex items-center gap-2.5 font-hand text-[2rem] leading-tight text-violet-ink">
        <IssueIcon issue={proposal.issue} size={32} />
        <span className="underline decoration-2 underline-offset-[6px]">{issueName(proposal.issue)}</span>
      </p>
      <div className="mt-3 space-y-1">
        <MonoLabel as="p" muted={false} className="text-violet-ink">
          How sure
        </MonoLabel>
        <ConfidenceMeter value={proposal.confidence} />
      </div>
      <p className="mt-3 font-hand text-xl leading-snug text-violet-ink">{proposal.rationale}</p>
      {unsure && (
        <p className="mt-2 font-hand text-xl leading-snug text-ink">Still not sure about this one. Check it, or pick it yourself.</p>
      )}
      <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.12em] text-violet-ink uppercase">
        AI proposal · not a legal finding{proposal.source === "demo" ? " · saved sample answer" : ""}
      </p>
      <div className="mt-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
        <DoodleButton size="lg" icon={<Check size={22} />} onClick={onAccept}>
          Yes, that&apos;s it
        </DoodleButton>
        <DoodleButton variant="ghost" icon={<Pencil size={20} />} onClick={onCorrect}>
          Not right? Pick it myself
        </DoodleButton>
      </div>
    </DoodleCard>
  );
}

/** Six issues plus "something else". The human's pick goes through the same rules. */
export function IssuePicker({ current, onPick }: { current?: ProposalIssue; onPick: (issue: ProposalIssue) => void }) {
  const options: ProposalIssue[] = [...ISSUE_IDS, "not_covered"];
  return (
    <ul className="grid grid-cols-2 gap-3">
      {options.map((id, i) => (
        <li key={id} className={id === "not_covered" ? "col-span-2" : ""}>
          <SketchBox
            as="button"
            type="button"
            seed={40 + i}
            strokeWidth={2.2}
            fill={id === current ? "var(--color-violet-tint)" : "var(--color-paper-2)"}
            color={id === current ? "var(--color-violet)" : "var(--color-ink)"}
            onClick={() => onPick(id)}
            aria-pressed={id === current}
            className="doodle-btn flex min-h-16 w-full cursor-pointer items-center gap-2.5 px-3.5 py-3 text-left font-display text-base leading-tight font-bold"
          >
            <IssueIcon issue={id} size={26} />
            <span>{id === "not_covered" ? "Something else" : RULES[id].label}</span>
          </SketchBox>
        </li>
      ))}
    </ul>
  );
}
