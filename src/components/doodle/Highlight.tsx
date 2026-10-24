"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInView } from "./hooks";

export type HighlightTone = "marker" | "violet" | "red" | "mint" | "sky";

/** Highlighter marker behind inline text; swipes in left to right when it scrolls into view. */
export function Highlight({
  children,
  tone = "marker",
  animate = true,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  tone?: HighlightTone;
  animate?: boolean;
  /** ms after entering the viewport */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, animate);
  return (
    <mark
      ref={ref}
      className={`hl ${tone === "marker" ? "" : `hl-${tone}`} ${className}`}
      data-anim={animate ? "" : undefined}
      data-in={inView ? "1" : "0"}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </mark>
  );
}
