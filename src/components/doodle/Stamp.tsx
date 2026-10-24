"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInView } from "./hooks";
import { SketchBox } from "./SketchBox";

export type StampTone = "red" | "amber" | "ink" | "violet" | "lime";

const TONES: Record<StampTone, { stroke: string; text: string; fill?: string }> = {
  red: { stroke: "var(--color-red)", text: "var(--color-red-ink)" },
  amber: { stroke: "var(--color-amber)", text: "var(--color-amber-ink)" },
  ink: { stroke: "var(--color-ink)", text: "var(--color-ink)" },
  violet: { stroke: "var(--color-violet)", text: "var(--color-violet-ink)" },
  lime: { stroke: "var(--color-ink)", text: "var(--color-ink)", fill: "var(--color-lime)" },
};

const SIZES = {
  sm: { label: "text-base", sub: "text-[10px]", pad: "px-2.5 py-1.5", sw: 2.5 },
  md: { label: "text-2xl", sub: "text-[11px]", pad: "px-4 py-2.5", sw: 3 },
  lg: { label: "text-[2.5rem]", sub: "text-xs", pad: "px-5 py-3", sw: 3.5 },
};

/** Rubber stamp: double rough border, inked texture, slight tilt, thuds down when seen. */
export function Stamp({
  children,
  sub,
  tone = "red",
  size = "md",
  rotate = -6,
  thud = true,
  delay = 0,
  seed = 3,
  className = "",
}: {
  /** Big uppercase word(s), e.g. "Class B". */
  children: ReactNode;
  /** Small mono line under it, e.g. "Hazardous". */
  sub?: ReactNode;
  tone?: StampTone;
  size?: keyof typeof SIZES;
  /** Degrees; -4 to -8 looks hand-stamped. */
  rotate?: number;
  thud?: boolean;
  /** ms after entering the viewport */
  delay?: number;
  seed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, thud);
  const t = TONES[tone];
  const s = SIZES[size];
  return (
    <span
      ref={ref}
      className={`stamp ${className}`}
      data-thud={thud ? "" : undefined}
      data-in={inView ? "1" : "0"}
      style={{ "--rot": `${rotate}deg`, "--d": `${delay}ms` } as CSSProperties}
    >
      <SketchBox
        as="span"
        double
        seed={seed}
        color={t.stroke}
        fill={t.fill}
        strokeWidth={s.sw}
        className={`stamp-ink inline-flex flex-col items-center text-center leading-none ${s.pad}`}
        style={{ color: t.text }}
      >
        <span className={`font-display font-extrabold uppercase leading-[0.95] tracking-[-0.02em] ${s.label}`}>
          {children}
        </span>
        {sub && (
          <span className={`mt-1 font-mono font-bold uppercase tracking-[0.14em] ${s.sub}`}>{sub}</span>
        )}
      </SketchBox>
    </span>
  );
}
