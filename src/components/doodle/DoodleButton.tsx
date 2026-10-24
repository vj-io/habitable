"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SketchBox } from "./SketchBox";

export type DoodleButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type DoodleButtonSize = "md" | "lg" | "xl";

const VARIANTS: Record<Exclude<DoodleButtonVariant, "ghost">, { fill: string; stroke: string; text: string }> = {
  primary: { fill: "var(--color-marker)", stroke: "var(--color-ink)", text: "text-on-marker" },
  secondary: { fill: "var(--color-paper-2)", stroke: "var(--color-ink)", text: "text-ink" },
  danger: { fill: "var(--color-red-tint)", stroke: "var(--color-red)", text: "text-red-ink" },
};

const SIZES: Record<DoodleButtonSize, string> = {
  md: "min-h-11 px-5 text-base gap-2",
  lg: "min-h-13 px-6 text-lg gap-2.5",
  xl: "min-h-20 px-7 text-[1.5rem] font-extrabold gap-3",
};

export type DoodleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  variant?: DoodleButtonVariant;
  size?: DoodleButtonSize;
  /** Leading icon (e.g. <Camera />). */
  icon?: ReactNode;
  loading?: boolean;
  /** Renders a Next <Link> instead of a <button>. */
  href?: string;
  seed?: number;
};

/** Small looping scribble shown while loading (animates stroke, not transform, so the target holds still). */
function Scribble() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path pathLength={1} className="scribble-loop" d="M3 15c2-5 4-7 5-5s-1 6 1 6 3-8 5-8 1 7 3 7 2-4 4-5" />
    </svg>
  );
}

export function DoodleButton({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  href,
  seed = 7,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}: DoodleButtonProps) {
  const off = disabled || loading;
  const base = `doodle-btn inline-flex select-none items-center justify-center font-display font-bold leading-tight tracking-[-0.01em] ${SIZES[size]} ${off ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`;
  const content = (
    <>
      {loading ? <Scribble /> : icon}
      <span>{children}</span>
    </>
  );
  // A disabled link has no href to follow, so it renders as a disabled button.
  const asLink = href && !off;
  const shared = { "aria-busy": loading || undefined, ...rest };

  if (variant === "ghost") {
    const cls = `${base} text-ink underline decoration-2 underline-offset-[5px] decoration-ink/30 hover:decoration-wavy hover:decoration-ink ${className}`;
    return asLink ? (
      <Link href={href} className={cls} {...(shared as object)}>
        {content}
      </Link>
    ) : (
      <button type={type} disabled={off} className={cls} {...shared}>
        {content}
      </button>
    );
  }

  const v = VARIANTS[variant];
  return (
    <SketchBox
      as={asLink ? Link : "button"}
      {...(asLink ? { href } : { type, disabled: off })}
      {...shared}
      seed={seed}
      color={v.stroke}
      fill={v.fill}
      shadow="var(--color-shadow)"
      strokeWidth={size === "xl" ? 3 : 2.5}
      className={`${base} ${v.text} ${className}`}
    >
      {content}
    </SketchBox>
  );
}
