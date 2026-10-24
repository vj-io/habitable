"use client";

import type { ReactNode } from "react";
import { SketchBox } from "@/components/doodle";

/** Hand-drawn box around a native input; the focus ring goes on the box, not the bare input. */
export function SketchInput({ children, seed = 17, tone = "paper" }: { children: ReactNode; seed?: number; tone?: "paper" | "violet" }) {
  return (
    <SketchBox
      seed={seed}
      strokeWidth={2.2}
      color={tone === "violet" ? "var(--color-violet)" : "var(--color-ink)"}
      fill="var(--color-paper-2)"
      className="flex min-h-13 items-center rounded-[3px] outline-offset-4 outline-violet-ink has-[:focus-visible]:outline-3 [&_input]:outline-none [&_textarea]:outline-none"
    >
      {children}
    </SketchBox>
  );
}

export const inputClass =
  "w-full min-w-0 bg-transparent px-4 py-3 text-[1.0625rem] text-ink placeholder:text-muted/80";

/** Label + hint + sketch input + error, wired together for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-display text-base font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="font-hand text-lg leading-snug text-muted">
          {hint}
        </p>
      )}
      <SketchInput>{children}</SketchInput>
      {error && (
        <p id={`${id}-error`} role="alert" className="font-hand text-lg leading-snug text-red-ink">
          {error}
        </p>
      )}
    </div>
  );
}
