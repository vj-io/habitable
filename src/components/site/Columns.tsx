"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { useSize } from "@/components/doodle/hooks";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** True from Tailwind's lg breakpoint (64rem) up. False on the server and until hydration. */
export function useLg() {
  return useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 64rem)").matches, () => false);
}

const viewportHeight = () => window.innerHeight;

/**
 * The page body in two columns from lg up, inside the same 1100px column as the header so the left edge stays on the
 * wordmark. Below lg it is one column in source order: left, right, more. From lg, `more` sits under `left` (so the
 * right column can be as tall as both), and `sticky` pins the right column while the left one scrolls, but only when it
 * fits the viewport: a taller column pinned at the top would hide its own end.
 * The main column caps its children at max-w-2xl (one column on phones and tablets); the grid lifts that cap at lg.
 */
export function Columns({
  left,
  right,
  more,
  cols = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]",
  sticky = false,
}: {
  left: ReactNode;
  right: ReactNode;
  more?: ReactNode;
  /** Literal Tailwind classes (so the scanner sees them): the lg column template. */
  cols?: string;
  sticky?: boolean;
}) {
  const rightRef = useRef<HTMLDivElement>(null);
  const size = useSize(rightRef);
  const vh = useSyncExternalStore(subscribe, viewportHeight, () => 0);
  const fits = size !== null && size.h + 32 <= vh;
  return (
    <div className={`space-y-6 lg:grid lg:max-w-none! lg:gap-x-10 lg:gap-y-6 lg:space-y-0 ${cols} ${more ? "lg:grid-rows-[auto_1fr]" : ""}`}>
      <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">{left}</div>
      <div
        ref={rightRef}
        className={`min-w-0 space-y-6 lg:col-start-2 lg:row-start-1 lg:self-start ${more ? "lg:row-span-2" : ""} ${sticky && fits ? "lg:sticky lg:top-4" : ""}`}
      >
        {right}
      </div>
      {more && <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">{more}</div>}
    </div>
  );
}
