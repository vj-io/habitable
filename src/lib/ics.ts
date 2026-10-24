// An RFC 5545 calendar file with one reminder for an issue's repair-by date. Pure; safe on server and client.
//
// All-day, not timed: the repair-by date is a day on the New York calendar ("by Nov 14"), and an all-day event
// shows that same day on a phone in any time zone with no VTIMEZONE block. A timed event would be pinned to one
// instant and slide to another day for someone travelling. The exact time goes in the description.
import { formatNY, nyDay } from "./countdown";
import { RULES } from "./rules";
import type { CaseFile, Issue } from "./types";

const encoder = new TextEncoder();

/** RFC 5545 §3.3.11 TEXT: escape backslash, semicolon and comma; line breaks become \n. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds one content line at 75 octets (§3.1), never inside a multi-byte character; continuations start with a space. */
export function foldLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let octets = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (octets + n > 75) {
      out.push(cur);
      cur = " ";
      octets = 1;
    }
    cur += ch;
    octets += n;
  }
  out.push(cur);
  return out;
}

/** 20261025T120000Z */
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
/** 2026-11-14 -> 20261114 */
const dateValue = (ymd: string) => ymd.replace(/-/g, "");
function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * The reminder for a classified, not-yet-fixed issue, or null when the issue has no repair-by date.
 * The alarm is -PT15H from the start of the all-day event: 9:00 AM the morning before.
 */
export function repairByIcs(c: CaseFile, issue: Issue, now: Date): string | null {
  const o = issue.outcome;
  if (o.status !== "classified" || !issue.repairBy) return null;
  const rule = RULES[o.issue];
  const street = c.address.label.split(",")[0];
  const day = nyDay(new Date(issue.repairBy));
  const windowText = o.window.text.startsWith("No time") ? "no time to correct" : `${o.window.text} correction window`;
  const description = [
    `Requested repair-by: ${formatNY(issue.repairBy, "datetime")} (New York time)`,
    `Class ${o.hazardClass} · ${o.classLabel} · ${windowText}`,
    o.citation,
    `First documented ${formatNY(issue.createdAt, "datetime")}`,
    "Logged in Habitable. Not legal advice.",
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Habitable//Case tools//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:repair-by-${issue.id.replace(/[^A-Za-z0-9_-]/g, "")}@habitable.app`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;VALUE=DATE:${dateValue(day)}`,
    `DTEND;VALUE=DATE:${dateValue(nextDay(day))}`,
    `SUMMARY:${escapeText(`Repair-by date: ${rule.short} — ${street} ${c.unit}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`Repair-by date tomorrow: ${rule.short}`)}`,
    "TRIGGER:-PT15H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.flatMap(foldLine).join("\r\n") + "\r\n";
}

/** habitable-repair-by-<problem>-<yyyy-mm-dd>.ics, the date on the New York calendar. */
export function repairByFileName(issue: Issue): string {
  const day = issue.repairBy ? nyDay(new Date(issue.repairBy)) : "undated";
  return `habitable-repair-by-${issue.issue.replace(/_/g, "-")}-${day}.ics`;
}
