"use client";

import { useSyncExternalStore } from "react";
import { remaining } from "@/lib/countdown";

// One shared 1-second clock for every countdown on the page; it stops while the tab is hidden.
let nowMs = 0;
const subs = new Set<() => void>();
let timer: number | undefined;

function tick() {
  nowMs = Date.now();
  subs.forEach((fn) => fn());
}
function start() {
  if (timer !== undefined || document.hidden) return;
  tick();
  timer = window.setInterval(tick, 1000);
}
function stop() {
  window.clearInterval(timer);
  timer = undefined;
}
function onVisibility() {
  if (document.hidden) stop();
  else start();
}
function subscribe(fn: () => void) {
  subs.add(fn);
  if (subs.size === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    start();
  }
  return () => {
    subs.delete(fn);
    if (subs.size === 0) {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

/** Current time, ticking each second in the browser; null during server render and hydration. */
export function useNow(): Date | null {
  const ms = useSyncExternalStore(subscribe, () => nowMs, () => 0);
  return ms ? new Date(ms) : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Big mono d h m s to the repair-by instant. The digits are hidden from screen readers; a summary is spoken instead. */
export function Countdown({ repairBy, className = "" }: { repairBy: string; className?: string }) {
  const now = useNow();
  const r = now ? remaining(repairBy, now) : null;
  const units: [string, string][] = r
    ? [
        [String(r.days), "d"],
        [pad(r.hours), "h"],
        [pad(r.minutes), "m"],
        [pad(r.seconds), "s"],
      ]
    : [
        ["–", "d"],
        ["––", "h"],
        ["––", "m"],
        ["––", "s"],
      ];
  return (
    <div className={className}>
      <p aria-hidden="true" className={`flex flex-wrap items-baseline gap-x-2 font-mono font-bold tabular-nums ${r?.overdue ? "text-red-ink" : "text-ink"}`}>
        {r?.overdue && <span className="mr-1 self-center font-mono text-sm uppercase tracking-[0.14em]">Overdue by</span>}
        {units.map(([v, u]) => (
          <span key={u} className="whitespace-nowrap">
            <span className="text-[2rem] leading-none sm:text-[2.4rem]">{v}</span>
            <span className="ml-0.5 text-base text-muted">{u}</span>
          </span>
        ))}
      </p>
      <p className="sr-only" aria-live="polite">
        {r && (r.overdue ? `Overdue by ${r.days} days and ${r.hours} hours.` : `${r.days} days and ${r.hours} hours left.`)}
      </p>
    </div>
  );
}

/** Compact "29d 4h left" for timeline cards. */
export function shortLeft(repairBy: string, now: Date) {
  const r = remaining(repairBy, now);
  const text = r.days > 0 ? `${r.days}d ${r.hours}h` : `${r.hours}h ${r.minutes}m`;
  return { text: r.overdue ? `${text} overdue` : `${text} left`, overdue: r.overdue };
}
