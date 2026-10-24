"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Arrow, Camera, Chip, Cross, Doc, DoodleButton, DoodleCard, Drop, Flame, Highlight, MonoLabel, PencilLoader, Tag } from "@/components/doodle";
import { HeatStamp, summaryText } from "@/components/heat/HeatLogCard";
import { Field, SketchInput, inputClass } from "@/components/site/Field";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatNY, nyDay } from "@/lib/countdown";
import { sampleHeatReadings } from "@/lib/demo/heat";
import { EvidenceError, stripImage } from "@/lib/evidence";
import {
  CITY_HEAT_LOG_URL,
  HEAT_CITATION,
  HEAT_LAW_URL,
  HEAT_SOURCE_URL,
  HOT_WATER_CITATION,
  checkHeatReading,
  checkReading,
  formatF,
  fromNyInputValue,
  heatSummary,
  toNyInputValue,
} from "@/lib/heat";
import { MAX_AGE_MS, stationName } from "@/lib/outdoor";
import { deleteHeatReading, saveHeatReading, useCaseData } from "@/lib/store";
import type { HeatKind, HeatReading, OutdoorReading } from "@/lib/types";

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";
const WOBBLE = "14px 4px 12px 5px / 5px 12px 4px 14px";
const KIND_LABEL: Record<HeatKind, string> = { heat: "Heat", hot_water: "Hot water" };
// Plausible ranges, to catch typos (680 for 68.0); not legal limits.
const RANGE: Record<HeatKind | "outdoor", [number, number]> = { heat: [30, 110], hot_water: [40, 212], outdoor: [-40, 120] };

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-4 pb-20 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.12em] underline decoration-2 underline-offset-4 hover:decoration-wavy"
        >
          <Arrow direction="left" size={20} />
          Back to your case file
        </Link>
        {children}
      </main>
    </>
  );
}

export function HeatClient() {
  const { caseFile, heatReadings, ready } = useCaseData();
  if (!ready) {
    return (
      <Shell>
        <PencilLoader caption="opening your heat log…" />
      </Shell>
    );
  }
  if (!caseFile) {
    return (
      <Shell>
        <DoodleCard className="space-y-4">
          <h1 className="font-display text-3xl font-extrabold leading-tight">Set up your case first</h1>
          <p>The heat log belongs to your case file. Add your address, then come back.</p>
          <DoodleButton href="/">Set up my case</DoodleButton>
        </DoodleCard>
      </Shell>
    );
  }
  const below = heatReadings.some((r) => checkHeatReading(r).status === "below_minimum");
  return (
    <Shell>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.02]">
            Heat <Highlight>log</Highlight>
          </h1>
          {caseFile.demo && <Chip lead="Demo">sample building</Chip>}
        </div>
        <p className="font-hand text-xl leading-snug text-muted">
          A photo can&apos;t show a temperature. Write down each reading with the date and time; the rules check it.
        </p>
      </header>

      <ReadingForm />
      <Readings readings={heatReadings} demo={caseFile.demo} />

      {below && (
        <DoodleCard tone="marker" seed={19} padding="1.25rem" appear={false} className="space-y-3">
          <p className="font-display text-xl leading-snug font-bold">Readings below the minimum go into your repair notice.</p>
          <DoodleButton href="/notice" size="lg" icon={<Doc size={24} />} className="w-full sm:w-auto">
            Make the notice
          </DoodleButton>
        </DoodleCard>
      )}

      <Rules />
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Not legal advice</p>
    </Shell>
  );
}

type Outdoor = { state: "loading" } | { state: "ok"; reading: OutdoorReading } | { state: "unavailable" };

/** Latest weather-station reading from our own /api/outdoor (the browser never calls weather.gov). */
function useOutdoor(): Outdoor {
  const [outdoor, setOutdoor] = useState<Outdoor>({ state: "loading" });
  useEffect(() => {
    let live = true;
    fetch("/api/outdoor")
      .then(async (res) => (res.ok ? ((await res.json()) as OutdoorReading) : null))
      .catch(() => null)
      .then((reading) => {
        if (live) setOutdoor(reading && typeof reading.tempF === "number" ? { state: "ok", reading } : { state: "unavailable" });
      });
    return () => {
      live = false;
    };
  }, []);
  return outdoor;
}

const nowValue = () => toNyInputValue(new Date().toISOString());
const num = (v: string) => (v.trim() === "" ? null : Number(v));
const inRange = (n: number, [lo, hi]: [number, number]) => Number.isFinite(n) && n >= lo && n <= hi;

function KindToggle({ kind, onChange }: { kind: HeatKind; onChange: (k: HeatKind) => void }) {
  return (
    <div role="group" aria-label="What are you measuring?" className="inline-flex overflow-hidden border-2 border-ink bg-paper-2" style={{ borderRadius: WOBBLE }}>
      {(["heat", "hot_water"] as const).map((k, i) => (
        <button
          key={k}
          type="button"
          aria-pressed={kind === k}
          onClick={() => onChange(k)}
          className={`inline-flex min-h-12 cursor-pointer items-center gap-2 px-4 font-display font-bold ${i > 0 ? "border-l-2 border-ink" : ""} ${kind === k ? "bg-marker text-on-marker" : ""}`}
        >
          {k === "heat" ? <Flame size={20} /> : <Drop size={20} />} {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

function ReadingForm() {
  const outdoor = useOutdoor();
  const [kind, setKind] = useState<HeatKind>("heat");
  const [when, setWhen] = useState(nowValue);
  const [indoor, setIndoor] = useState("");
  const [outdoorMode, setOutdoorMode] = useState<"station" | "typed">("station");
  const [outdoorTyped, setOutdoorTyped] = useState("");
  const [note, setNote] = useState("");
  const [complaint311, setComplaint311] = useState("");
  const [witness, setWitness] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ when?: string; indoor?: string; outdoor?: string; photo?: string; save?: string }>({});
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  const at = fromNyInputValue(when);
  const station = outdoor.state === "ok" ? outdoor.reading : null;
  // A station reading only describes a moment near its own observation time.
  const stationFits = !!station && !!at && Math.abs(Date.parse(at) - Date.parse(station.observedAt)) <= MAX_AGE_MS;
  const useStation = kind === "heat" && outdoorMode === "station" && stationFits;
  const outdoorF = kind !== "heat" ? null : useStation && station ? station.tempF : num(outdoorTyped);
  const indoorF = num(indoor);
  const preview = at && indoorF !== null && inRange(indoorF, RANGE[kind]) ? checkReading({ at, kind, indoorF, outdoorF }) : null;

  async function onPhoto(file: File) {
    setErrors((e) => ({ ...e, photo: undefined }));
    try {
      setPhoto(await stripImage(file));
    } catch (e) {
      setErrors((x) => ({ ...x, photo: e instanceof EvidenceError ? e.message : "That photo couldn't be read. Try a JPEG or PNG." }));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    const next: typeof errors = {};
    if (!at) next.when = "Pick the date and time of the reading.";
    else if (Date.parse(at) > Date.now() + 5 * 60_000) next.when = "That time is in the future.";
    const [lo, hi] = RANGE[kind];
    if (indoorF === null || !inRange(indoorF, RANGE[kind])) next.indoor = `Type the temperature in °F, between ${lo} and ${hi}.`;
    if (kind === "heat" && !useStation && outdoorF !== null && !inRange(outdoorF, RANGE.outdoor)) {
      next.outdoor = `Type the outdoor temperature in °F (${RANGE.outdoor[0]} to ${RANGE.outdoor[1]}), or leave it blank.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !at || indoorF === null) return;

    const reading: HeatReading = {
      id: crypto.randomUUID(),
      at,
      kind,
      indoorF,
      outdoorF,
      outdoorSource: outdoorF === null ? null : useStation ? "nws" : "typed",
      ...(useStation && station ? { outdoorStation: station.station, outdoorObservedAt: station.observedAt } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(complaint311.trim() ? { complaint311: complaint311.trim() } : {}),
      ...(witness.trim() ? { witness: witness.trim() } : {}),
      ...(photo ? { photo } : {}),
      createdAt: new Date().toISOString(),
    };
    setBusy(true);
    try {
      await saveHeatReading(reading);
      setIndoor("");
      setOutdoorTyped("");
      setOutdoorMode("station");
      setNote("");
      setComplaint311("");
      setWitness("");
      setPhoto(null);
      setWhen(nowValue());
      setSaved(`Saved: ${formatF(indoorF)} at ${formatNY(at, "datetime")}. It's in your readings below.`);
    } catch {
      // Keep what they typed; a failed write (storage full or blocked) must not lose it.
      setErrors({ save: "Couldn't save to this device. Check that your browser allows site storage, then try again." });
    }
    setBusy(false);
  }

  const describe = (id: string, hint: boolean, error?: string) =>
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <DoodleCard as="section" seed={5} appear={false} aria-labelledby="log-reading-title" className="space-y-5">
      <h2 id="log-reading-title" className="font-display text-2xl font-extrabold">
        Log a reading
      </h2>
      <form onSubmit={submit} noValidate className="space-y-5">
        <KindToggle kind={kind} onChange={setKind} />

        <Field id="heat-when" label="When (New York time)" error={errors.when}>
          <input
            id="heat-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-invalid={!!errors.when}
            aria-describedby={describe("heat-when", false, errors.when)}
            className={inputClass}
          />
        </Field>

        <Field
          id="heat-indoor"
          label={kind === "heat" ? "Temperature inside (°F)" : "Water temperature at the tap (°F)"}
          hint={kind === "heat" ? "Hold the thermometer in the middle of the room, away from windows." : "Let the hot tap run for a few minutes first."}
          error={errors.indoor}
        >
          <input
            id="heat-indoor"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={indoor}
            onChange={(e) => setIndoor(e.target.value)}
            aria-invalid={!!errors.indoor}
            aria-describedby={describe("heat-indoor", true, errors.indoor)}
            className={`${inputClass} font-mono text-2xl`}
          />
        </Field>

        {kind === "heat" &&
          (useStation && station ? (
            <div className="space-y-1.5">
              <p className="font-display text-base font-bold">Temperature outside</p>
              <p className="leading-snug">
                <b className="font-mono text-xl">{formatF(station.tempF)}</b>{" "}
                <span className="text-muted">
                  from {stationName(station.station)} weather station ({station.station}), observed {formatNY(station.observedAt, "datetime")}
                </span>
              </p>
              <button type="button" onClick={() => setOutdoorMode("typed")} className={`${linkClass} min-h-11 cursor-pointer font-display font-bold`}>
                Type it instead
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Field
                id="heat-outdoor"
                label={
                  <>
                    Temperature outside (°F) <span className="font-normal text-muted">· optional</span>
                  </>
                }
                hint={
                  outdoor.state === "loading"
                    ? "Checking the Central Park weather station…"
                    : station && !stationFits
                      ? `The weather station's latest reading is from ${formatNY(station.observedAt, "datetime")}. For another time, type it or leave it blank.`
                      : outdoor.state === "unavailable"
                        ? "The weather station isn't answering right now. Type the outdoor temperature, or leave it blank."
                        : "Type the outdoor temperature, or leave it blank."
                }
                error={errors.outdoor}
              >
                <input
                  id="heat-outdoor"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={outdoorTyped}
                  onChange={(e) => {
                    setOutdoorTyped(e.target.value);
                    setOutdoorMode("typed");
                  }}
                  aria-invalid={!!errors.outdoor}
                  aria-describedby={describe("heat-outdoor", true, errors.outdoor)}
                  className={`${inputClass} font-mono text-xl`}
                />
              </Field>
              {stationFits && station && (
                <button type="button" onClick={() => setOutdoorMode("station")} className={`${linkClass} min-h-11 cursor-pointer font-display font-bold`}>
                  Use the weather station ({formatF(station.tempF)})
                </button>
              )}
            </div>
          ))}

        {preview && (
          <div aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t-2 border-dashed border-ink/20 pt-4">
            <MonoLabel>This reading</MonoLabel>
            <HeatStamp check={preview} />
            <p className="basis-full text-[0.9375rem] leading-snug text-muted">{preview.explanation}</p>
          </div>
        )}

        <details className="group">
          <summary className="min-h-11 cursor-pointer py-2 font-display font-bold">Add a note, 311 number, witness or photo</summary>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="heat-note" className="block font-display text-base font-bold">
                Note
              </label>
              <SketchInput>
                <textarea
                  id="heat-note"
                  rows={2}
                  maxLength={280}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Radiator cold? Told the super?"
                  className={`${inputClass} resize-none`}
                />
              </SketchInput>
            </div>
            <Field id="heat-311" label="311 complaint number" hint="If you reported it, the service request number 311 gave you.">
              <input
                id="heat-311"
                type="text"
                maxLength={40}
                value={complaint311}
                onChange={(e) => setComplaint311(e.target.value)}
                aria-describedby="heat-311-hint"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field id="heat-witness" label="Witness" hint="Someone who saw the reading with you.">
              <input
                id="heat-witness"
                type="text"
                maxLength={120}
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
                aria-describedby="heat-witness-hint"
                className={inputClass}
              />
            </Field>
            <div className="space-y-2">
              {photo && (
                <div className="flex items-center gap-3">
                  <Image src={photo} alt="Thermometer photo to add" width={72} height={72} unoptimized className="size-18 rounded-[3px] border-2 border-ink object-cover" />
                  <DoodleButton variant="ghost" icon={<Cross size={18} />} onClick={() => setPhoto(null)}>
                    Remove photo
                  </DoodleButton>
                </div>
              )}
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-display font-bold underline decoration-2 underline-offset-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-violet-ink">
                <Camera size={20} /> {photo ? "Change thermometer photo" : "Add a thermometer photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void onPhoto(f);
                  }}
                />
              </label>
              {errors.photo && (
                <p role="alert" className="font-hand text-lg text-red-ink">
                  {errors.photo}
                </p>
              )}
            </div>
          </div>
        </details>

        {errors.save && (
          <p role="alert" className="font-hand text-lg text-red-ink">
            {errors.save}
          </p>
        )}
        <DoodleButton type="submit" size="lg" loading={busy} icon={<Flame size={22} />} className="w-full sm:w-auto">
          Save reading
        </DoodleButton>
        <p role="status" className="font-hand text-lg leading-snug text-mint-ink">
          {saved}
        </p>
      </form>
    </DoodleCard>
  );
}

function outdoorText(r: HeatReading): string {
  if (r.kind !== "heat") return "";
  if (r.outdoorF === null) return " · outside not recorded";
  const source = r.outdoorSource === "nws" && r.outdoorStation ? `${stationName(r.outdoorStation)} weather station` : "typed";
  return ` · ${formatF(r.outdoorF)} outside (${source})`;
}

function ReadingRow({ reading: r }: { reading: HeatReading }) {
  const [confirming, setConfirming] = useState(false);
  const check = checkHeatReading(r);
  const when = formatNY(r.at, "datetime");
  const extra = [r.complaint311 && `311 #${r.complaint311}`, r.witness && `Witness: ${r.witness}`].filter(Boolean).join(" · ");
  return (
    <DoodleCard as="article" appear={false} draw={false} padding="0.875rem 1rem" seed={90 + r.id.charCodeAt(0)} aria-label={`${KIND_LABEL[r.kind]} reading, ${when}`} className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className="flex items-center gap-1.5 font-display text-lg leading-tight font-bold">
          {r.kind === "heat" ? <Flame size={20} className="text-red-ink" /> : <Drop size={20} className="text-sky-ink" />}
          {when.split(", ").at(-1)} · {KIND_LABEL[r.kind]}
        </p>
        {r.demo && <Tag tone="marker">DEMO</Tag>}
      </div>
      <p className="font-mono text-sm leading-relaxed">
        <b>{formatF(r.indoorF)}</b> {r.kind === "heat" ? "inside" : "at the tap"}
        {outdoorText(r)}
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <HeatStamp check={check} />
      </div>
      <p className="text-sm leading-snug text-muted">{check.explanation}</p>
      {r.note && <p className="font-hand text-xl leading-snug">{r.note}</p>}
      {extra && <p className="font-mono text-xs text-muted">{extra}</p>}
      {r.photo && (
        <Image src={r.photo} alt={`Thermometer photo, ${when}`} width={96} height={96} unoptimized className="size-24 rounded-[3px] border-2 border-ink object-cover" />
      )}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <p role="alert" className="font-display font-bold">
            Delete this reading?
          </p>
          <DoodleButton variant="danger" onClick={() => void deleteHeatReading(r.id)}>
            Yes, delete it
          </DoodleButton>
          <DoodleButton variant="ghost" onClick={() => setConfirming(false)}>
            Keep it
          </DoodleButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete the ${when} reading`}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-display text-sm font-bold text-red-ink underline decoration-2 underline-offset-4"
        >
          <Cross size={16} /> Delete
        </button>
      )}
    </DoodleCard>
  );
}

function Readings({ readings, demo }: { readings: HeatReading[]; demo: boolean }) {
  const [adding, setAdding] = useState(false);
  // Newest first, grouped by New York calendar day.
  const days = new Map<string, HeatReading[]>();
  for (const r of readings) {
    const key = nyDay(new Date(r.at));
    days.set(key, [...(days.get(key) ?? []), r]);
  }

  async function addSamples() {
    setAdding(true);
    for (const r of sampleHeatReadings()) await saveHeatReading(r);
    setAdding(false);
  }

  return (
    <section aria-labelledby="readings-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="readings-title" className="font-display text-2xl font-extrabold">
          Your readings
        </h2>
        {readings.length > 0 && <MonoLabel as="p">{summaryText(heatSummary(readings))}</MonoLabel>}
      </div>
      {readings.length === 0 ? (
        <DoodleCard appear={false} seed={13} className="space-y-3">
          <p className="font-hand text-xl leading-snug">No readings yet. Log one above each time it&apos;s cold: morning, evening and night.</p>
          {demo && (
            <>
              <DoodleButton variant="secondary" loading={adding} onClick={() => void addSamples()}>
                Add sample readings
              </DoodleButton>
              <p className="text-sm text-muted">Five January readings for the demo building, labelled DEMO.</p>
            </>
          )}
        </DoodleCard>
      ) : (
        [...days.values()].map((group) => (
          <section key={group[0].id} aria-label={formatNY(group[0].at, "date")} className="space-y-2">
            <MonoLabel as="h3">{formatNY(group[0].at, "date")}</MonoLabel>
            <ol className="space-y-3">
              {group.map((r) => (
                <li key={r.id}>
                  <ReadingRow reading={r} />
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </section>
  );
}

function Rules() {
  return (
    <DoodleCard as="section" seed={31} padding="1.25rem" appear={false} aria-labelledby="heat-rules-title" className="space-y-3">
      <MonoLabel as="h2">
        <span id="heat-rules-title">The rules · heat season Oct 1 – May 31</span>
      </MonoLabel>
      <ul className="space-y-1.5 leading-snug">
        <li>
          <b>6 AM – 10 PM:</b> at least 68°F inside, when it&apos;s below 55°F outside.
        </li>
        <li>
          <b>10 PM – 6 AM:</b> at least 62°F inside, whatever the weather.
        </li>
        <li>
          <b>Hot water:</b> year-round, at least 120°F at the tap.
        </li>
      </ul>
      <p className="text-[0.9375rem] leading-snug">
        HPD can only write a daytime heat violation when its inspector measures below 55°F outside, so the outdoor temperature matters for daytime readings.
      </p>
      <p className="font-mono text-xs leading-relaxed text-muted">
        {HEAT_CITATION} · {HOT_WATER_CITATION}
      </p>
      <ul className="flex flex-col">
        <li>
          <a href={HEAT_SOURCE_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
            HPD: heat and hot water ↗
          </a>
        </li>
        <li>
          <a href={CITY_HEAT_LOG_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
            The city&apos;s printable heat log (PDF) ↗
          </a>
        </li>
        <li>
          <a href={HEAT_LAW_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
            Local Law 86 of 2017 (PDF) ↗
          </a>
        </li>
      </ul>
    </DoodleCard>
  );
}
