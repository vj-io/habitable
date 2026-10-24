"use client";

import {
  useMemo,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
} from "react";
import { useInView, useSize } from "./hooks";
import { rough } from "./rough";

export type SketchBoxProps = Omit<HTMLAttributes<HTMLElement>, "color"> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> &
  Pick<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled"> & {
    /** Element or component to render (e.g. "section", "button", Next Link). */
    as?: ElementType;
    /** Stroke colour (any CSS colour / var). */
    color?: string;
    strokeWidth?: number;
    seed?: number;
    /** Draw the border on when it scrolls into view. */
    draw?: boolean;
    /** Draw delay in ms. */
    delay?: number;
    /** Tint inside the hand-drawn outline. */
    fill?: string;
    padding?: CSSProperties["padding"];
    /** Second, inner outline (stamps). */
    double?: boolean;
    /** Hand-drawn offset shadow colour. */
    shadow?: string;
    /** Boil the outline (decorative only; off under reduced motion). */
    boil?: boolean;
  };

export function SketchBox({
  as: Tag = "div",
  color = "var(--color-ink)",
  strokeWidth = 2.5,
  seed = 1,
  draw = false,
  delay = 0,
  fill,
  padding,
  double = false,
  shadow,
  boil = false,
  className = "",
  style,
  children,
  ...rest
}: SketchBoxProps) {
  const ref = useRef<HTMLElement>(null);
  const size = useSize(ref);
  const inView = useInView(ref, draw);

  const paths = useMemo(() => {
    if (!size || size.w < 4 || size.h < 4) return null;
    const r = rough(seed);
    const i = strokeWidth / 2 + 1;
    const w = size.w - 2 * i;
    const h = size.h - 2 * i;
    return {
      border: r.rect(i, i, w, h),
      inner: double ? r.rect(i + 4, i + 4, w - 8, h - 8, 2) : null,
      area: fill || shadow ? r.rectFill(i, i, w, h) : null,
    };
  }, [size, seed, strokeWidth, double, fill, shadow]);

  const drawProps = draw
    ? { pathLength: 1, className: "ink-draw", "data-in": inView ? "1" : "0" }
    : {};

  return (
    <Tag ref={ref} className={`relative isolate ${className}`} style={{ padding, ...style }} {...rest}>
      <svg
        aria-hidden="true"
        focusable="false"
        className={`pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible ${boil ? "ink-boil" : ""}`}
        style={{ "--d": `${delay}ms` } as CSSProperties}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths && (
          <>
            {shadow && paths.area && <path className="sk-shadow" d={paths.area} fill={shadow} stroke="none" />}
            {fill && paths.area && <path d={paths.area} fill={fill} stroke="none" />}
            <path d={paths.border} {...drawProps} />
            {paths.inner && <path d={paths.inner} strokeWidth={strokeWidth * 0.7} {...drawProps} />}
          </>
        )}
      </svg>
      {children}
    </Tag>
  );
}
