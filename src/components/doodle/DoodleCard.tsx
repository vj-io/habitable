import type { CSSProperties, JSX, ReactNode } from "react";
import { SketchBox } from "./SketchBox";

export type CardTone = "paper" | "marker" | "mint" | "sky" | "pink" | "violet" | "red" | "amber";

const TONES: Record<CardTone, { fill: string; stroke: string }> = {
  paper: { fill: "var(--color-paper-2)", stroke: "var(--color-ink)" },
  marker: { fill: "var(--color-marker-tint)", stroke: "var(--color-ink)" },
  mint: { fill: "var(--color-mint-tint)", stroke: "var(--color-mint)" },
  sky: { fill: "var(--color-sky-tint)", stroke: "var(--color-sky)" },
  pink: { fill: "var(--color-pink-tint)", stroke: "var(--color-pink)" },
  violet: { fill: "var(--color-violet-tint)", stroke: "var(--color-violet)" },
  red: { fill: "var(--color-red-tint)", stroke: "var(--color-red)" },
  amber: { fill: "var(--color-amber-tint)", stroke: "var(--color-amber)" },
};

/** Paper card with a hand-drawn border that draws itself; springs in on mount. */
export function DoodleCard({
  children,
  tone = "paper",
  appear = true,
  draw = true,
  delay = 0,
  seed = 11,
  as = "div",
  padding,
  className = "",
  style,
  ...rest
}: {
  children: ReactNode;
  tone?: CardTone;
  /** Spring-in entrance on mount. */
  appear?: boolean;
  /** Border draws itself when seen. */
  draw?: boolean;
  /** ms */
  delay?: number;
  seed?: number;
  // intrinsic tags only: this is a server component handing `as` to a client one
  as?: keyof JSX.IntrinsicElements;
  padding?: CSSProperties["padding"];
  className?: string;
  style?: CSSProperties;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const t = TONES[tone];
  return (
    <SketchBox
      as={as}
      seed={seed}
      color={t.stroke}
      fill={t.fill}
      draw={draw}
      delay={delay + 120}
      padding={padding}
      className={`${padding === undefined ? "p-5" : ""} ${appear ? "spring-in" : ""} ${className}`}
      style={{ "--spring-d": `${delay}ms`, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </SketchBox>
  );
}
