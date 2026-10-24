"use client";

import { DoodleButton, DoodleCard, Flame, MonoLabel, Stamp, Tag } from "@/components/doodle";
import { formatNY } from "@/lib/countdown";
import { checkHeatReading, formatF, heatSummary, type HeatCheck } from "@/lib/heat";
import { useCaseData } from "@/lib/store";

/** The rule result on a reading: red stamp below the minimum, mint stamp when it meets it, a quiet tag otherwise. */
export function HeatStamp({ check }: { check: HeatCheck }) {
  if (check.status === "below_minimum" && check.requiredF !== null) {
    return (
      <Stamp tone="red" size="sm" rotate={-3} thud={false} className="shrink-0">
        Below legal minimum {formatF(check.requiredF)}
      </Stamp>
    );
  }
  if (check.status === "ok") {
    return (
      <Stamp tone="mint" size="sm" rotate={-3} thud={false} className="shrink-0">
        Meets the minimum
      </Stamp>
    );
  }
  if (check.status === "needs_outdoor") return <Tag tone="amber">Needs the outdoor temperature</Tag>;
  return <Tag className="text-muted">Not required now</Tag>;
}

/** "6 of 9 readings below the minimum since Jan 3". */
export function summaryText(s: ReturnType<typeof heatSummary>): string {
  return `${s.below} of ${s.total} ${s.total === 1 ? "reading" : "readings"} below the minimum${s.since ? ` since ${formatNY(s.since, "short")}` : ""}`;
}

/** Case-file entry point to the heat log, with the latest reading. Reads the log itself so CaseFile only places it. */
export function HeatLogCard() {
  const { heatReadings, ready } = useCaseData();
  if (!ready) return null;
  const latest = heatReadings[0];
  return (
    <DoodleCard as="section" seed={27} padding="1.25rem" appear={false} aria-labelledby="heat-card-title" className="space-y-3">
      <div className="flex items-start gap-3">
        <Flame size={28} className="mt-0.5 shrink-0 text-red-ink" />
        <div className="min-w-0 space-y-1">
          <h2 id="heat-card-title" className="font-display text-xl leading-snug font-bold">
            {latest ? "Your heat log" : "Heat or hot water problem? Keep a heat log"}
          </h2>
          {latest ? (
            <MonoLabel as="p">{summaryText(heatSummary(heatReadings))}</MonoLabel>
          ) : (
            <p className="font-hand text-lg leading-snug text-muted">
              A photo can&apos;t show a temperature. Log it with the date and time, and the rules check each reading.
            </p>
          )}
        </div>
      </div>
      {latest && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-mono text-sm">
            Latest: <b>{formatNY(latest.at, "datetime")}</b> · {formatF(latest.indoorF)} {latest.kind === "hot_water" ? "at the tap" : "inside"}
          </p>
          <HeatStamp check={checkHeatReading(latest)} />
        </div>
      )}
      <DoodleButton href="/heat" variant="secondary" icon={<Flame size={20} />} className="w-full sm:w-auto">
        {latest ? "Open the heat log" : "Start a heat log"}
      </DoodleButton>
    </DoodleCard>
  );
}
