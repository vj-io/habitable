"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Cross } from "./icons";
import { rough } from "./rough";

const EDGE = rough(5).line(0, 2, 400, 2, 3);
const GRAB = rough(9).line(182, 16, 218, 16, 1.2);

/** Bottom sheet on a native modal <dialog>: focus trap, Escape and backdrop tap close it. */
export function DoodleSheet({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="doodle-sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full flex-col bg-paper-2">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 24"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 -top-0.5 h-6 w-full overflow-visible"
          fill="none"
          stroke="var(--color-ink)"
          strokeLinecap="round"
        >
          <path d={EDGE} strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <path d={GRAB} strokeWidth="5" vectorEffect="non-scaling-stroke" stroke="var(--color-muted)" />
        </svg>
        <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-2">
          <h2 id={titleId} className="font-display text-2xl font-extrabold leading-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-ink/5"
          >
            <Cross size={22} />
          </button>
        </header>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${className}`}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
