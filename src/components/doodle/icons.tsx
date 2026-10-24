// Hand-drawn line icons: 24x24, stroke currentColor, round caps. Server-safe.
// `draw` makes the strokes draw themselves on mount (skipped under reduced motion).
import type { CSSProperties, ReactNode, SVGProps } from "react";
import { rough } from "./rough";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
  strokeWidth?: number;
  draw?: boolean;
  /** draw delay in ms */
  delay?: number;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  label?: string;
};

function Svg({ size = 24, strokeWidth = 2.5, draw, delay = 0, label, style, paths, ...rest }: IconProps & { paths: string[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0, "--d": `${delay}ms`, ...style } as CSSProperties}
      {...rest}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={draw ? 1 : undefined} className={draw ? "ink-draw" : undefined} />
      ))}
    </svg>
  );
}

const icon = (name: string, paths: string[]) => {
  const C = (p: IconProps) => <Svg {...p} paths={paths} />;
  C.displayName = name;
  return C;
};

export const Check = icon("Check", ["M3.8 12.6c1.7 1.5 3.3 3.3 5 5.6 3-5.6 6.8-10 11.6-13.2"]);
export const Cross = icon("Cross", ["M5.2 5.4c4.6 4.1 9.1 8.5 13.5 13.3", "M18.9 5c-4.9 4.4-9.4 8.9-13.6 13.7"]);
export const Camera = icon("Camera", [
  "M3.2 8.6c0-1 .7-1.7 1.6-1.7h2.7l1.5-2.4h6.1l1.6 2.4h2.6c1 0 1.7.7 1.7 1.7v9c.1 1-.6 1.8-1.6 1.8H4.9c-1 0-1.7-.7-1.7-1.7z",
  "M12 9.3c2.1-.1 3.8 1.6 3.8 3.7s-1.7 3.8-3.8 3.8-3.7-1.7-3.7-3.8c0-2 1.6-3.6 3.6-3.7",
]);
export const Spark = icon("Spark", [
  "M12 2.8v4.6",
  "M12.2 16.6 12 21.2",
  "M2.8 12.1h4.6",
  "M16.6 11.9h4.6",
  "M5.6 5.7l3 3",
  "M15.4 15.4l3 3.1",
  "M18.4 5.6l-3 3",
  "M8.6 15.5l-3.1 3",
]);
export const Pencil = icon("Pencil", [
  "M4 20.2l1-4.6L15.6 5a1.9 1.9 0 0 1 2.7 0l.9.9a1.9 1.9 0 0 1 0 2.7L8.6 19.2z",
  "M13.7 6.9l3.5 3.5",
  "M4.2 20l4.2-.9",
]);
export const Clock = icon("Clock", [
  "M12 3.2c4.9-.1 8.9 3.8 8.8 8.8 0 4.9-3.9 8.8-8.8 8.8S3.2 16.9 3.2 12c0-4.7 3.8-8.6 8.4-8.8",
  "M12 7.4v4.8l3.2 2",
]);
export const Building = icon("Building", [
  "M5.2 21V4.2h8.6V21",
  "M13.8 9.2h5V21",
  "M3 21.1h18",
  "M8 7.6h3",
  "M8 11.2h3",
  "M8 14.8h3",
  "M16.2 13h.1",
  "M16.2 16.5h.1",
]);
export const Doc = icon("Doc", [
  "M6 3.1h8.2l4 4V21H6z",
  "M14 3.3v4h4",
  "M8.8 11.8h6.4",
  "M8.8 15.4h6.4",
  "M8.8 8.2h2.8",
]);
export const Shield = icon("Shield", ["M12 2.9l7.6 3v5.6c0 4.6-3.2 8.2-7.6 9.6-4.4-1.4-7.6-5-7.6-9.6V5.9z", "M8.7 12l2.3 2.4 4.4-4.7"]);
export const Drop = icon("Drop", ["M12 3.2c3 4 6.2 7.6 6.2 11.2a6.2 6.2 0 0 1-12.4 0c0-3.5 3.1-7.2 6.2-11.2z", "M9.2 15.2c.1 1.4 1 2.4 2.3 2.7"]);
export const Bug = icon("Bug", [
  "M8 11c0-2.3 1.8-4 4-4s4 1.7 4 4v3.6c0 2.3-1.8 4.2-4 4.2s-4-1.9-4-4.2z",
  "M12 11v7.6",
  "M9.6 7.6 8.2 5.2",
  "M14.4 7.6l1.4-2.4",
  "M8 12.4H4.4",
  "M16 12.4h3.6",
  "M8.2 16 5 17.6",
  "M15.8 16l3.2 1.6",
  "M8.3 9.6 5.2 8.2",
  "M15.7 9.6l3.1-1.4",
]);
export const Flame = icon("Flame", [
  "M12 21.2c-3.9 0-6.6-2.7-6.6-6.3 0-3.4 2.4-5.3 3.8-8.4.8 1.6 1.7 2.7 3 3.2.2-2.9 1.4-5.3 3.4-6.7-.4 3 1.5 4.9 2.5 7 .6 1.3.9 2.8.9 4 0 4.2-3 7.2-7 7.2z",
  "M12 18.4c-1.4 0-2.4-1-2.4-2.4 0-1.3 1-2.1 1.6-3.3.9 1.1 3.2 2 3.2 3.6 0 1.2-1 2.1-2.4 2.1z",
]);
export const Lock = icon("Lock", ["M5.4 11.1h13.2v9.6H5.4z", "M8 11V8.1C8 5.8 9.8 4 12 4s4 1.8 4 4.1V11", "M12 14.6v2.6"]);
export const Brush = icon("Brush", [
  "M20.2 3.8l-7.4 7.4",
  "M11 10.2l2.8 2.8",
  "M10.4 11.6c-2.4-.4-4.3 1-4.6 3.4-.2 1.7-.9 3-2.5 3.7 3.6 1.2 7.7.2 8.7-2.6.5-1.6.1-3.4-1.6-4.5z",
]);
export const Spore = icon("Spore", [
  "M8.6 6.2c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3z",
  "M15.8 5.4c1.2 0 2.2 1 2.2 2.2s-1 2.2-2.2 2.2-2.2-1-2.2-2.2 1-2.2 2.2-2.2z",
  "M14.2 12.4c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5z",
  "M5.6 16.4h.1",
  "M9 19.6h.1",
  "M20 12.4h.1",
  "M19.6 19.4h.1",
]);

const ROT = { right: 0, down: 90, left: 180, up: -90 } as const;

/** Curved hand-drawn arrow. `direction` picks a quarter turn; `rotate` adds any angle. */
export function Arrow({
  direction = "right",
  rotate = 0,
  style,
  ...p
}: IconProps & { direction?: keyof typeof ROT; rotate?: number }) {
  return (
    <Svg
      {...p}
      style={{ transform: `rotate(${ROT[direction] + rotate}deg)`, ...style }}
      paths={["M3.4 16.2C7 9.4 12.6 7.6 19.8 10.4", "M15.2 6.4l4.8 4.1-5 3.6"]}
    />
  );
}

type WrapProps = {
  children: ReactNode;
  color?: string;
  strokeWidth?: number;
  draw?: boolean;
  delay?: number;
  /** boil the ink (decorative, off under reduced motion) */
  boil?: boolean;
  seed?: number;
  className?: string;
};

/** Hand-drawn oval around inline content, like a quick "why?" circle. */
export function CircleMark({ children, color = "currentColor", strokeWidth = 2.5, draw, delay = 0, boil, seed = 4, className = "" }: WrapProps) {
  const d = rough(seed).ellipse(50, 25, 46, 22, 1.1);
  return (
    <span className={`relative inline-block px-[0.45em] ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute -inset-x-[0.1em] -inset-y-[0.3em] h-[calc(100%+0.6em)] w-[calc(100%+0.2em)] overflow-visible ${boil ? "ink-boil" : ""}`}
        style={{ "--d": `${delay}ms` } as CSSProperties}
        fill="none"
        stroke={color}
        strokeLinecap="round"
      >
        <path d={d} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" pathLength={draw ? 1 : undefined} className={draw ? "ink-draw" : undefined} />
      </svg>
    </span>
  );
}

/** Scribbled underline beneath inline content. */
export function Underline({ children, color = "currentColor", strokeWidth = 2.5, draw, delay = 0, boil, seed = 2, className = "" }: WrapProps) {
  const d = rough(seed).underline(1, 3, 98);
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute inset-x-0 -bottom-[0.3em] h-[0.45em] w-full overflow-visible ${boil ? "ink-boil" : ""}`}
        style={{ "--d": `${delay}ms` } as CSSProperties}
        fill="none"
        stroke={color}
        strokeLinecap="round"
      >
        <path d={d} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" pathLength={draw ? 1 : undefined} className={draw ? "ink-draw" : undefined} />
      </svg>
    </span>
  );
}
