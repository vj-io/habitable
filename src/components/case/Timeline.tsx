"use client";

import Image from "next/image";
import Link from "next/link";
import { Arrow, DoodleCard, Highlight, MonoLabel, Stamp, Tag } from "@/components/doodle";
import { CLASS_TONE, IssueBadge } from "@/components/issue/meta";
import { RULES } from "@/lib/rules";
import { shortLeft, useNow } from "@/components/snap/Countdown";
import { daysSince, formatNY } from "@/lib/countdown";
import type { Issue } from "@/lib/types";

function Entry({ issue, flash, now }: { issue: Issue; flash: boolean; now: Date | null }) {
  const o = issue.outcome;
  const left = issue.repairBy && !issue.fixedAt && now ? shortLeft(issue.repairBy, now) : null;
  const label = issue.issue === "not_covered" ? "General note" : RULES[issue.issue].short;
  return (
    <DoodleCard
      as="article"
      tone={flash ? "mint" : "paper"}
      seed={100 + issue.id.charCodeAt(0)}
      padding="0.875rem"
      draw={false}
      className="transition-transform motion-safe:hover:-translate-y-0.5"
    >
      <Link href={`/issue/${issue.id}`} className="flex gap-3.5 after:absolute after:inset-0 after:content-['']">
        <Image
          src={issue.evidence.photo}
          alt=""
          width={88}
          height={88}
          unoptimized
          className="size-[5.5rem] shrink-0 rounded-[3px] border-2 border-ink object-cover"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex min-w-0 items-center gap-1.5 font-display text-lg leading-tight font-bold">
            <IssueBadge issue={issue.issue} size={18} />
            <span className="min-w-0">{flash ? <Highlight>{label}</Highlight> : label}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {o.status === "classified" ? (
              <Stamp tone={CLASS_TONE[o.hazardClass]} size="sm" rotate={-4} thud={flash} seed={issue.id.charCodeAt(1)} className="shrink-0">
                Class {o.hazardClass}
              </Stamp>
            ) : (
              <Tag className="shrink-0 text-base">note</Tag>
            )}
            <span className="font-mono text-sm font-bold">
              {issue.fixedAt ? (
                <span className="bg-mint-tint px-1 text-mint-ink">Fixed {formatNY(issue.fixedAt, "short")}</span>
              ) : left ? (
                <span className={left.overdue ? "text-red-ink" : ""}>{left.text}</span>
              ) : o.status === "not_applicable" ? (
                <span className="font-normal text-muted">no class</span>
              ) : null}
            </span>
          </span>
          <span className="font-mono text-[0.8125rem] leading-snug text-muted">
            {now ? `Day ${daysSince(issue.createdAt, now)}` : "Day –"} · since {formatNY(issue.createdAt, "short")}
            {issue.followUps.length > 0 && ` · ${issue.followUps.length} follow-up${issue.followUps.length > 1 ? "s" : ""}`}
          </span>
        </span>
      </Link>
    </DoodleCard>
  );
}

export function Timeline({ issues, flashId }: { issues: Issue[]; flashId: string | null }) {
  const now = useNow();
  if (issues.length === 0) {
    return (
      <div className="flex items-start gap-3 pt-1 pl-3">
        <Arrow direction="up" rotate={-20} size={44} draw className="mt-[-6px] shrink-0" />
        <p className="max-w-xs font-hand text-[1.4rem] leading-snug">
          Nothing logged yet. Start with the thing that&apos;s bothering you most.
        </p>
      </div>
    );
  }
  const open = issues.filter((i) => !i.fixedAt).length;
  return (
    <section aria-labelledby="log-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="log-title" className="font-display text-2xl font-extrabold">
          Your log
        </h2>
        <MonoLabel>
          {issues.length} logged · {open} open
        </MonoLabel>
      </div>
      <ol className="space-y-4">
        {issues.map((i) => (
          <li key={i.id}>
            <Entry issue={i} flash={i.id === flashId} now={now} />
          </li>
        ))}
      </ol>
    </section>
  );
}
