"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  Camera,
  Check,
  Chip,
  DoodleButton,
  DoodleCard,
  DoodleSheet,
  Doc,
  MonoLabel,
  Pencil,
  PencilLoader,
  SketchBox,
  rough,
} from "@/components/doodle";
import { BuildingSnippet } from "@/components/case/BuildingPanel";
import type { BuildingState } from "@/components/case/useBuilding";
import { IssueIcon, issueName, pct } from "@/components/issue/meta";
import { SketchInput, inputClass } from "@/components/site/Field";
import { formatNY, repairByDate } from "@/lib/countdown";
import { DEMO_SAMPLES } from "@/lib/demo/samples";
import { EvidenceError, readEvidence, shortHash, type EvidenceRead } from "@/lib/evidence";
import { derivedFacts, evaluate, issueLabel } from "@/lib/rules";
import { saveCase, saveIssue } from "@/lib/store";
import type { CaseFile, ClassifyResponse, Facts, Issue, Proposal, ProposalIssue, ReceiptResponse } from "@/lib/types";
import { IssuePicker, ProposalCard } from "./ProposalCard";
import { NotApplicableCard, RuleCard, windowPhrase } from "./RuleCard";

const UNAVAILABLE = "The AI couldn't read this photo right now.";

const EVIDENCE_MESSAGES: Record<EvidenceError["code"], string> = {
  not_image: "That file isn't a photo. Try a JPEG or PNG, or take a new one.",
  too_large: "That photo is over 20 MB. Try a smaller one, or take a new photo.",
  unreadable: "This browser can't read that photo (iPhone HEIC files sometimes do this). Try a JPEG or PNG.",
};

async function classify(body: Record<string, unknown>): Promise<ClassifyResponse> {
  try {
    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      const j = (await res.json().catch(() => null)) as { reason?: string } | null;
      return { status: "unavailable", reason: j?.reason ?? "Too many photos in a short time — try again in a few minutes." };
    }
    if (!res.ok) return { status: "unavailable", reason: UNAVAILABLE };
    return (await res.json()) as ClassifyResponse;
  } catch {
    return { status: "unavailable", reason: UNAVAILABLE };
  }
}

function postReceipt(sha256: string): Promise<ReceiptResponse | null> {
  return fetch("/api/receipt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sha256 }) })
    .then((r) => (r.ok ? (r.json() as Promise<ReceiptResponse>) : null))
    .catch(() => null);
}

const STEPS = ["Photo", "AI proposal", "Rule", "Log"] as const;
const STEP_LINE = rough(77).line(12, 6, 288, 6, 2);

/** Photo → AI proposal → Rule → Log, joined by one pencil line. */
function StepLine({ at }: { at: number }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-[12.5%] top-[9px] h-3 w-3/4 overflow-visible" fill="none">
        <path d={STEP_LINE} stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
      </svg>
      <ol className="relative grid grid-cols-4">
        {STEPS.map((s, i) => {
          const state = i < at ? "done" : i === at ? "now" : "next";
          return (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center" aria-current={state === "now" ? "step" : undefined}>
              <span
                className={`grid size-7 place-items-center rounded-full border-[2.5px] ${
                  state === "next" ? "border-ink/30 bg-paper-2" : state === "now" ? (i === 1 ? "border-violet bg-violet-tint" : "border-ink bg-lime") : "border-ink bg-ink text-paper"
                }`}
              >
                {state === "done" && <Check size={15} strokeWidth={3} />}
              </span>
              <span
                className={`font-mono text-[0.6875rem] leading-tight font-bold tracking-[0.08em] uppercase ${
                  state === "next" ? "text-muted" : i === 1 ? "text-violet-ink" : "text-ink"
                }`}
              >
                {s}
                <span className="sr-only">{state === "done" ? " (done)" : state === "now" ? " (current step)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EvidenceTicks({ ev, receipt, waiting }: { ev: EvidenceRead; receipt: ReceiptResponse | null; waiting: boolean }) {
  const row = "flex items-start gap-1.5 leading-snug";
  return (
    <ul className="space-y-1 text-[0.875rem]">
      <li className={row}>
        <Check size={18} className="mt-0.5" /> <span>Fingerprint <span className="font-mono text-sm">{shortHash(ev.sha256)}</span></span>
      </li>
      <li className={row}>
        <Check size={18} className="mt-0.5" />
        <span>
          {ev.capturedAt ? (
            <>Taken {formatNY(ev.capturedAt, "datetime")} · from the photo</>
          ) : (
            <>No capture time in the photo — using the time you added it</>
          )}
        </span>
      </li>
      <li className={row}>
        {receipt ? <Check size={18} className="mt-0.5" /> : <span className="inline-block w-[18px] text-center text-muted">…</span>}
        <span>
          {receipt ? (
            <>
              Received by Habitable&apos;s server · <span className="font-mono text-sm">{receipt.receipt}</span>
            </>
          ) : waiting ? (
            "Sending the fingerprint for a receipt…"
          ) : (
            "No server receipt (the receipt service didn't answer)"
          )}
        </span>
      </li>
      <li className={row}>
        <Check size={18} className="mt-0.5" /> <span>Location data removed from the stored copy</span>
      </li>
    </ul>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  caseFile: CaseFile;
  building: BuildingState;
  onSaved: (id: string) => void;
};

export function SnapSheet({ open, onClose, caseFile, building, onSaved }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<Promise<ReceiptResponse | null> | null>(null);

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ev, setEv] = useState<EvidenceRead | null>(null);
  const [sampleId, setSampleId] = useState<string | undefined>();
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [receiptDone, setReceiptDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clarify, setClarify] = useState<{ question: string; options: string[] } | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<ProposalIssue | null>(null);
  const [answers, setAnswers] = useState<Facts>({});
  const [saving, setSaving] = useState(false);

  const apply = (r: ClassifyResponse) => {
    if (r.status === "unavailable") {
      setUnavailable(r.reason);
      setPicking(true);
      return;
    }
    setProposal(r.proposal);
    setClarify(r.clarifyingQuestion);
  };

  const body = (extra: Record<string, unknown> = {}) => ({
    image: ev?.aiImage,
    note: note.trim() || undefined,
    sampleId,
    ...extra,
  });

  async function takeFile(file: File, sample?: string) {
    setError(null);
    setBusy(true);
    let read: EvidenceRead;
    try {
      read = await readEvidence(file);
    } catch (e) {
      setBusy(false);
      setError(e instanceof EvidenceError ? EVIDENCE_MESSAGES[e.code] : EVIDENCE_MESSAGES.unreadable);
      return;
    }
    setEv(read);
    setSampleId(sample);
    receiptRef.current = postReceipt(read.sha256).then((r) => {
      setReceipt(r);
      setReceiptDone(true);
      return r;
    });
    apply(await classify({ image: read.aiImage, note: note.trim() || undefined, sampleId: sample }));
    setBusy(false);
  }

  async function pickSample(id: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(DEMO_SAMPLES[id].file);
      if (!res.ok) throw new Error("sample missing");
      const blob = await res.blob();
      await takeFile(new File([blob], `${id}.jpg`, { type: "image/jpeg" }), id);
    } catch {
      setBusy(false);
      setError("That sample didn't load. Try another one.");
    }
  }

  async function answerClarify(option: string) {
    if (!clarify) return;
    const question = clarify.question;
    setClarify(null);
    setBusy(true);
    apply(await classify(body({ answer: { question, answer: option } })));
    setBusy(false);
  }

  function choose(issue: ProposalIssue) {
    setChosen(issue);
    setAnswers({});
    setPicking(false);
  }

  function answerFact(factId: string, value: string) {
    setAnswers((a) => ({ ...a, [factId]: value }));
    if (factId === "childUnder6") void saveCase({ ...caseFile, childUnder6: value === "yes" });
  }

  // ---- the rules: pure code over the chosen issue and the facts ----
  const now = ev ? new Date(ev.addedAt) : null;
  const known: Facts = {
    ...(now ? derivedFacts({ now, yearBuilt: caseFile.yearBuilt }) : {}),
    ...(chosen === "peeling_paint" && caseFile.childUnder6 !== null ? { childUnder6: caseFile.childUnder6 ? "yes" : "no" } : {}),
    ...answers,
  };
  const outcome = chosen && now ? evaluate(chosen, known, { now, yearBuilt: caseFile.yearBuilt }) : null;
  const repairBy = ev && outcome?.status === "classified" ? repairByDate(ev.addedAt, outcome.window) : null;

  async function save() {
    if (!ev || !chosen || !outcome || outcome.status === "needs_facts") return;
    setSaving(true);
    const rc = await receiptRef.current;
    const issue: Issue = {
      id: crypto.randomUUID(),
      createdAt: ev.addedAt,
      note: note.trim(),
      evidence: {
        sha256: ev.sha256,
        capturedAt: ev.capturedAt,
        captureSource: ev.captureSource,
        addedAt: ev.addedAt,
        receivedAt: rc?.receivedAt ?? null,
        receipt: rc?.receipt ?? null,
        photo: ev.photo,
        width: ev.width,
        height: ev.height,
      },
      proposal: proposal ?? {
        issue: chosen,
        confidence: 1,
        rationale: "Picked by the renter while the AI was unavailable.",
        source: "manual",
      },
      issue: chosen,
      facts: known,
      outcome,
      repairBy,
      followUps: [],
      fixedAt: null,
      ...(sampleId ? { demoSampleId: sampleId } : {}),
    };
    try {
      await saveIssue(issue);
      onSaved(issue.id);
    } catch {
      setSaving(false);
      setError("Couldn't save to this device. Check that your browser allows site storage, then try again.");
    }
  }

  // ---- what to show ----
  const step = !ev ? 0 : !chosen || picking ? 1 : saving ? 3 : 2;
  const live = busy
    ? "Reading the photo."
    : clarify
      ? `The AI has a question: ${clarify.question}`
      : picking && unavailable
        ? `${unavailable} Pick what it is.`
        : !chosen && proposal
          ? `AI proposal: ${issueName(proposal.issue)}, ${pct(proposal.confidence)} sure.`
          : outcome?.status === "needs_facts"
            ? `The rule needs a fact: ${outcome.questions[0].prompt}`
            : outcome?.status === "classified"
              ? `Rules table: Class ${outcome.hazardClass}, ${outcome.classLabel}. ${windowPhrase(outcome.window)}.`
              : outcome?.status === "not_applicable"
                ? `No class: ${outcome.reason}`
                : "";

  const corrected = proposal && chosen && proposal.issue !== chosen;

  return (
    <DoodleSheet open={open} onClose={onClose} title="Snap a problem">
      <div className="space-y-6 pt-2 pb-6">
        <StepLine at={step} />
        <p className="sr-only" aria-live="polite">
          {live}
        </p>

        {error && (
          <DoodleCard tone="red" appear={false} padding="0.875rem 1rem" className="font-hand text-xl leading-snug text-red-ink">
            <p role="alert">{error}</p>
          </DoodleCard>
        )}

        {!ev && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="snap-note" className="block font-display text-base font-bold">
                One line about it <span className="font-normal text-muted">(optional)</span>
              </label>
              <SketchInput>
                <input
                  id="snap-note"
                  value={note}
                  maxLength={280}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ceiling dripping since Tuesday"
                  className={inputClass}
                  autoComplete="off"
                />
              </SketchInput>
            </div>

            <div className="space-y-3">
              <DoodleButton size="xl" icon={<Camera size={30} />} className="w-full" loading={busy} onClick={() => cameraRef.current?.click()}>
                {busy ? "Reading…" : "Take a photo"}
              </DoodleButton>
              <DoodleButton variant="secondary" size="lg" className="w-full" disabled={busy} onClick={() => libraryRef.current?.click()}>
                Choose from library
              </DoodleButton>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void takeFile(f);
                }}
              />
              <input
                ref={libraryRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void takeFile(f);
                }}
              />
              <p className="font-hand text-lg leading-snug text-muted">
                The photo stays on this phone. Only a smaller copy goes to the AI, and only its fingerprint goes to our receipt service.
              </p>
            </div>

            {caseFile.demo && (
              <section aria-labelledby="samples-title" className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip lead="Demo">sample</Chip>
                  <h3 id="samples-title" className="font-display text-lg font-bold">
                    Sample scenes — illustrated
                  </h3>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(DEMO_SAMPLES).map(([id, s], i) => {
                    const tricky = id === "ambiguous-stain";
                    return (
                      <li key={id} className={tricky ? "col-span-2 sm:col-span-3" : ""}>
                        <SketchBox
                          as="button"
                          type="button"
                          seed={90 + i}
                          strokeWidth={2.2}
                          fill={tricky ? "var(--color-violet-tint)" : "var(--color-paper-2)"}
                          color={tricky ? "var(--color-violet)" : "var(--color-ink)"}
                          disabled={busy}
                          onClick={() => void pickSample(id)}
                          className={`doodle-btn flex w-full cursor-pointer gap-2 p-2 text-left disabled:cursor-wait disabled:opacity-60 ${tricky ? "flex-row items-center" : "flex-col"}`}
                        >
                          <Image
                            src={s.file}
                            alt=""
                            width={240}
                            height={180}
                            loading="eager"
                            sizes="(min-width: 640px) 190px, 45vw"
                            className={`aspect-[4/3] rounded-[2px] object-cover ${tricky ? "w-[42%] shrink-0" : "w-full"}`}
                          />
                          <span className="px-0.5 pb-0.5 font-hand text-[1.0625rem] leading-tight">
                            {s.label}
                            {tricky && <span className="mt-1 block text-violet-ink">The tricky one — the AI will ask you a question first.</span>}
                          </span>
                        </SketchBox>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}

        {ev && (
          <div className={busy ? "flex flex-col items-center gap-4" : "flex gap-4"}>
            <SketchBox seed={51} strokeWidth={2.2} fill="#fff" padding="5px" className="shrink-0 rotate-[-2deg] self-start data-[big]:self-center" data-big={busy || undefined}>
              <Image
                src={ev.photo}
                alt="Your photo"
                width={ev.width}
                height={ev.height}
                unoptimized
                className={`${busy ? "w-64 max-h-64" : "w-24 max-h-32 sm:w-28"} h-auto object-cover`}
              />
            </SketchBox>
            <div className={`min-w-0 space-y-2 ${busy ? "w-full" : "flex-1"}`}>
              <MonoLabel as="p">Evidence · on this device</MonoLabel>
              <EvidenceTicks ev={ev} receipt={receipt} waiting={!receiptDone} />
            </div>
          </div>
        )}

        {ev && busy && (
          <DoodleCard tone="violet" appear={false} padding="1rem 1.25rem">
            <PencilLoader caption={proposal ? "reading it again with your answer…" : "reading the photo…"} />
          </DoodleCard>
        )}

        {ev && !busy && clarify && (
          <DoodleCard tone="violet" seed={6} padding="1.25rem" className="space-y-4">
            <MonoLabel as="p" muted={false} className="text-violet-ink">
              AI isn&apos;t sure · one question
            </MonoLabel>
            {proposal && <p className="font-hand text-lg leading-snug text-violet-ink">{proposal.rationale}</p>}
            <p className="font-hand text-[1.75rem] leading-tight text-violet-ink">{clarify.question}</p>
            <div className="flex flex-col gap-3">
              {clarify.options.map((o) => (
                <DoodleButton key={o} variant="secondary" size="lg" className="w-full" onClick={() => void answerClarify(o)}>
                  {o}
                </DoodleButton>
              ))}
            </div>
            <DoodleButton variant="ghost" icon={<Pencil size={20} />} onClick={() => {
                setClarify(null);
                setPicking(true);
              }}
            >
              Skip — I&apos;ll pick it myself
            </DoodleButton>
          </DoodleCard>
        )}

        {ev && !busy && !clarify && picking && (
          <div className="space-y-4">
            {unavailable ? (
              <DoodleCard tone="yellow" appear={false} padding="1rem 1.25rem">
                <p className="font-display text-lg leading-snug font-bold">{unavailable}</p>
                <p className="mt-1 font-hand text-xl leading-snug">Pick what it is — the rules still apply.</p>
              </DoodleCard>
            ) : (
              <div className="space-y-1">
                <p className="font-display text-xl font-bold">What is it, then?</p>
                {proposal && (
                  <p className="font-hand text-lg leading-snug text-muted">
                    <span className="text-violet-ink">The AI guessed {issueName(proposal.issue)}.</span> Your pick goes through exactly the same rules.
                  </p>
                )}
              </div>
            )}
            <IssuePicker current={chosen ?? undefined} onPick={choose} />
            {proposal && !unavailable && (
              <DoodleButton variant="ghost" onClick={() => setPicking(false)}>
                Back
              </DoodleButton>
            )}
          </div>
        )}

        {ev && !busy && !clarify && !picking && !chosen && proposal && (
          <ProposalCard proposal={proposal} onAccept={() => choose(proposal.issue)} onCorrect={() => setPicking(true)} />
        )}

        {ev && !picking && chosen && outcome && (
          <div className="space-y-5">
            {proposal && (
              <p className="flex flex-wrap items-center gap-x-2 font-hand text-xl leading-snug">
                <span className="text-violet-ink">
                  AI proposed {issueName(proposal.issue)} ({pct(proposal.confidence)})
                </span>
                <span aria-hidden="true">→</span>
                <span>{corrected ? <>you chose <b className="font-bold">{issueLabel(chosen)}</b></> : "you confirmed it"}</span>
              </p>
            )}

            {outcome.status === "needs_facts" && (
              <DoodleCard seed={15} padding="1.25rem" className="space-y-4">
                <MonoLabel as="p">
                  {outcome.questions.length > 1 ? "The rule needs a couple of facts the photo can't show" : "The rule needs one fact the photo can't show"}
                </MonoLabel>
                <p className="flex items-center gap-2 font-display text-base font-bold text-muted">
                  <IssueIcon issue={outcome.issue} size={20} /> {issueLabel(outcome.issue)}
                </p>
                <fieldset className="space-y-3">
                  <legend className="font-display text-[1.5rem] leading-tight font-extrabold">{outcome.questions[0].prompt}</legend>
                  {outcome.questions[0].help && <p className="font-hand text-lg leading-snug text-muted">{outcome.questions[0].help}</p>}
                  <div className="flex flex-col gap-3 pt-1">
                    {outcome.questions[0].options.map((o) => (
                      <DoodleButton
                        key={o.value}
                        variant="secondary"
                        size="lg"
                        className="w-full justify-start! text-left"
                        onClick={() => answerFact(outcome.questions[0].factId, o.value)}
                      >
                        {o.label}
                      </DoodleButton>
                    ))}
                  </div>
                </fieldset>
                <DoodleButton variant="ghost" icon={<Pencil size={20} />} onClick={() => setPicking(true)}>
                  Change the problem type
                </DoodleButton>
              </DoodleCard>
            )}

            {outcome.status === "classified" && repairBy && (
              <>
                <RuleCard outcome={outcome} facts={known} yearBuilt={caseFile.yearBuilt} repairBy={repairBy} />
                <BuildingSnippet state={building} issue={outcome.issue} delay={900} />
                <div className="space-y-2 pt-1">
                  <DoodleButton size="xl" icon={<Check size={30} />} className="w-full" loading={saving} onClick={() => void save()}>
                    Add to my log
                  </DoodleButton>
                  <DoodleButton variant="ghost" icon={<Pencil size={20} />} onClick={() => setPicking(true)}>
                    Change the problem type
                  </DoodleButton>
                </div>
              </>
            )}

            {outcome.status === "not_applicable" && (
              <>
                <NotApplicableCard outcome={outcome} />
                <div className="space-y-2">
                  <DoodleButton size="lg" icon={<Doc size={22} />} className="w-full" loading={saving} onClick={() => void save()}>
                    Log it anyway as a note
                  </DoodleButton>
                  <DoodleButton variant="ghost" icon={<Pencil size={20} />} onClick={() => setPicking(true)}>
                    Pick a different type
                  </DoodleButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DoodleSheet>
  );
}
