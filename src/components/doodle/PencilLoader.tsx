import { rough } from "./rough";

// Three handwriting lines at x 8..120, y 14/32/50: the pencil keyframes in globals.css follow them.
const LINES = rough(21).scribble(8, 14, 112, 3, 18);

/** "Reading the photo…" — a pencil writing lines that draw and redraw. Static under reduced motion. */
export function PencilLoader({ caption = "reading the photo…", className = "" }: { caption?: string; className?: string }) {
  return (
    <div role="status" className={`inline-flex flex-col items-start gap-2 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 150 66" width="150" height="66" fill="none" strokeLinecap="round" strokeLinejoin="round" className="overflow-visible">
        {LINES.map((d, i) => (
          <path key={i} d={d} pathLength={1} className={`pl-line-${i + 1}`} stroke="var(--color-violet)" strokeWidth="2.5" />
        ))}
        {/* pencil, tip at the start of line 1; rests at the end of line 3 when motion is reduced */}
        <g className="pl-pencil">
          <g transform="translate(8 14) rotate(-40)" stroke="var(--color-ink)" strokeWidth="2.2">
            <path d="M0 0 L4 -3 L26 -3 L26 3 L4 3 Z" fill="var(--color-marker)" />
            <path d="M0 0 L4 -3 M0 0 L4 3" />
            <path d="M21 -3 V3" />
          </g>
        </g>
      </svg>
      <span className="font-hand text-xl leading-tight text-violet-ink">{caption}</span>
    </div>
  );
}
