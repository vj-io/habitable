import type { ReactNode } from "react";

/** Black chip, paper mono uppercase text, optional bold accent lead segment. */
export function Chip({ children, lead, className = "" }: { children?: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-2 rounded-[4px] bg-ink px-3 py-1.5 font-mono text-[0.75rem] font-medium uppercase leading-[1.45] tracking-[0.08em] text-paper ${className}`}
    >
      {lead && <b className="font-bold text-chip-lead">{lead}</b>}
      {children}
    </span>
  );
}

export type TagTone = "ink" | "violet" | "red" | "amber" | "mint" | "sky" | "marker";

const TAG_TONES: Record<TagTone, string> = {
  ink: "text-ink",
  violet: "text-violet-ink bg-violet-tint/60",
  red: "text-red-ink bg-red-tint/60",
  amber: "text-amber-ink bg-amber-tint/60",
  mint: "text-mint-ink bg-mint-tint/70",
  sky: "text-sky-ink bg-sky-tint/70",
  marker: "text-ink bg-marker-tint",
};

/** Outlined handwritten label with a wobbly hand-drawn edge. */
export function Tag({ children, tone = "ink", className = "" }: { children: ReactNode; tone?: TagTone; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border-2 border-current px-2.5 py-0.5 font-hand text-[1.0625rem] leading-tight ${TAG_TONES[tone]} ${className}`}
      style={{ borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px" }}
    >
      {children}
    </span>
  );
}
