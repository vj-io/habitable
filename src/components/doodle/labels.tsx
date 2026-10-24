import type { JSX, ReactNode } from "react";
import { rough } from "./rough";

/** Small uppercase letter-spaced mono label, muted by default. */
export function MonoLabel({
  children,
  as: Tag = "span",
  muted = true,
  className = "",
}: {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  /** false to set your own text colour via className */
  muted?: boolean;
  className?: string;
}) {
  return (
    <Tag className={`font-mono text-[0.75rem] font-medium uppercase leading-snug tracking-[0.14em] ${muted ? "text-muted" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** Circled step number with a mono label, like "② THE PROBLEM". */
export function NumberCircle({
  n,
  children,
  as: Tag = "div",
  className = "",
}: {
  n: number;
  children?: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}) {
  const d = rough(n * 7 + 3).circle(20, 20, 16.5, 1.1);
  return (
    <Tag className={`flex items-center gap-3 ${className}`}>
      <span className="relative grid size-10 shrink-0 place-items-center font-mono text-lg font-bold text-ink">
        <svg aria-hidden="true" viewBox="0 0 40 40" className="absolute inset-0 h-full w-full overflow-visible" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d={d} />
        </svg>
        {n}
      </span>
      {children && <MonoLabel>{children}</MonoLabel>}
    </Tag>
  );
}
