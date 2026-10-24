"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Arrow,
  Camera,
  Check,
  Chip,
  Cross,
  Doc,
  DoodleButton,
  DoodleCard,
  MonoLabel,
  PencilLoader,
  Shield,
  SketchBox,
  Stamp,
  Tag,
} from "@/components/doodle";
import { SketchInput, inputClass } from "@/components/site/Field";
import { Wordmark } from "@/components/site/Wordmark";
import { useNow } from "@/components/snap/Countdown";
import { NotApplicableCard, RuleCard } from "@/components/snap/RuleCard";
import { daysSince, formatNY } from "@/lib/countdown";
import { EvidenceError, stripImage } from "@/lib/evidence";
import { RULES } from "@/lib/rules";
import { addFollowUp, deleteIssue, markFixed, useCaseData } from "@/lib/store";
import type { Issue } from "@/lib/types";
import { CLASS_TONE, IssueIcon, issueName, pct } from "./meta";

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";

function Shell({ demo, children }: { demo?: boolean; children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <Wordmark />
        {demo && <Chip lead="Demo">building</Chip>}
      </header>
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 pt-2 pb-6 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 font-display font-bold">
          <Arrow direction="left" size={22} /> Your case
        </Link>
        {children}
      </main>
    </>
  );
}

function CopyHash({ sha256 }: { sha256: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(sha256).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-display text-sm font-bold underline decoration-2 underline-offset-4"
    >
      {copied ? <Check size={18} /> : <Doc size={18} />}
      <span aria-live="polite">{copied ? "Copied" : "Copy fingerprint"}</span>
    </button>
  );
}

function Evidence({ issue }: { issue: Issue }) {
  const e = issue.evidence;
  const verifyHref =
    e.receivedAt && e.receipt
      ? `/verify?${new URLSearchParams({ sha256: e.sha256, receivedAt: e.receivedAt, receipt: e.receipt }).toString()}`
      : null;
  const row = "grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-3";
  return (
    <DoodleCard as="section" seed={41} padding="1.25rem" aria-labelledby="evidence-title" appear={false}>
      <div className="flex items-center justify-between gap-2">
        <MonoLabel as="h2">
          <span id="evidence-title">Evidence</span>
        </MonoLabel>
        <Shield size={24} />
      </div>
      <dl className="mt-4 space-y-3.5">
        <div className={row}>
          <dt className="font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase sm:pt-0.5">Photo taken</dt>
          <dd>
            {e.capturedAt ? (
              <>
                <span className="font-mono font-bold">{formatNY(e.capturedAt, "datetime")}</span> · from the photo
              </>
            ) : (
              <>Not in photo — time added used instead</>
            )}
          </dd>
        </div>
        <div className={row}>
          <dt className="font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase sm:pt-0.5">Added</dt>
          <dd className="font-mono font-bold">{formatNY(e.addedAt, "datetime")}</dd>
        </div>
        <div className={row}>
          <dt className="font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase sm:pt-0.5">Received by server</dt>
          <dd>
            {e.receivedAt && e.receipt ? (
              <>
                <span className="font-mono font-bold">{formatNY(e.receivedAt, "datetime")}</span>
                <span className="block">
                  Receipt <span className="font-mono font-bold">{e.receipt}</span> ·{" "}
                  {verifyHref && (
                    <Link href={verifyHref} className={`${linkClass} inline-flex min-h-11 items-center font-bold`}>
                      verify
                    </Link>
                  )}
                </span>
              </>
            ) : (
              <span className="text-muted">No receipt — Habitable&apos;s receipt service didn&apos;t answer when this was logged.</span>
            )}
          </dd>
        </div>
        <div className={row}>
          <dt className="font-mono text-[0.75rem] tracking-[0.1em] text-muted uppercase sm:pt-0.5">SHA-256</dt>
          <dd>
            <span className="block font-mono text-[0.8125rem] leading-relaxed break-all">{e.sha256}</span>
            <CopyHash sha256={e.sha256} />
          </dd>
        </div>
      </dl>
      <p className="mt-2 flex items-center gap-2 font-hand text-lg leading-snug text-muted">
        <Check size={18} /> Location data removed from the stored copy
      </p>
    </DoodleCard>
  );
}

const QUICK = ["Still broken", "Getting worse", "Told the landlord again", "Super came, didn't fix it"];

function FollowUps({ issue, now }: { issue: Issue; now: Date | null }) {
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPhoto(file: File) {
    setError(null);
    try {
      setPhoto(await stripImage(file));
    } catch (e) {
      setError(e instanceof EvidenceError ? e.message : "That photo couldn't be read. Try a JPEG or PNG.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError("Write a few words — even “still broken” counts.");
      return;
    }
    setBusy(true);
    try {
      await addFollowUp(issue.id, { note: note.trim(), ...(photo ? { photo } : {}) });
      setNote("");
      setPhoto(null);
      setError(null);
    } catch {
      // Keep what they typed; a failed write (storage full or blocked) must not lose it or stick the button.
      setError("Couldn't save to this device. Check that your browser allows site storage, then try again.");
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="fu-title" className="space-y-4">
      <h2 id="fu-title" className="font-display text-2xl font-extrabold">
        Follow-ups
      </h2>
      {issue.followUps.length === 0 ? (
        <p className="font-hand text-xl leading-snug text-muted">None yet. Each one you add makes the record harder to dispute.</p>
      ) : (
        <ol className="space-y-3">
          {issue.followUps.map((f) => (
            <li key={f.id} className="flex gap-3 border-l-[3px] border-ink pl-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.8125rem] tracking-[0.04em] text-muted">
                  <b className="text-ink">Day {daysSince(issue.createdAt, new Date(f.at))}</b> · {formatNY(f.at, "datetime")}
                </p>
                <p className="font-hand text-xl leading-snug">{f.note}</p>
              </div>
              {f.photo && (
                <Image src={f.photo} alt="Follow-up photo" width={72} height={72} unoptimized className="size-18 shrink-0 rounded-[3px] border-2 border-ink object-cover" />
              )}
            </li>
          ))}
        </ol>
      )}

      {!issue.fixedAt && (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="fu-note" className="block font-display text-base font-bold">
            Add a follow-up{now ? <span className="font-normal text-muted"> · it&apos;s day {daysSince(issue.createdAt, now)}</span> : null}
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setNote(q)} className="min-h-11 cursor-pointer">
                <Tag className="hover:bg-lime-tint">{q}</Tag>
              </button>
            ))}
          </div>
          <SketchInput>
            <textarea
              id="fu-note"
              rows={2}
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's changed? Who did you talk to?"
              className={`${inputClass} resize-none`}
            />
          </SketchInput>
          {photo && (
            <div className="flex items-center gap-3">
              <Image src={photo} alt="Follow-up photo to add" width={72} height={72} unoptimized className="size-18 rounded-[3px] border-2 border-ink object-cover" />
              <DoodleButton variant="ghost" icon={<Cross size={18} />} onClick={() => setPhoto(null)}>
                Remove photo
              </DoodleButton>
            </div>
          )}
          {error && (
            <p role="alert" className="font-hand text-lg text-red-ink">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <DoodleButton type="submit" loading={busy}>
              Add follow-up
            </DoodleButton>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-display font-bold underline decoration-2 underline-offset-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-violet-ink">
              <Camera size={20} /> {photo ? "Change photo" : "Add a photo"}
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
          </div>
        </form>
      )}
    </section>
  );
}

function Confirm({
  label,
  question,
  yes,
  variant,
  icon,
  onYes,
}: {
  label: string;
  question: string;
  yes: string;
  variant: "secondary" | "danger";
  icon: React.ReactNode;
  onYes: () => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return variant === "danger" ? (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-2 font-display font-bold text-red-ink underline decoration-2 underline-offset-4"
      >
        {icon} {label}
      </button>
    ) : (
      <DoodleButton variant={variant} icon={icon} onClick={() => setAsking(true)}>
        {label}
      </DoodleButton>
    );
  }
  return (
    <SketchBox seed={57} fill={variant === "danger" ? "var(--color-red-tint)" : "var(--color-lime-tint)"} color={variant === "danger" ? "var(--color-red)" : "var(--color-ink)"} className="w-full space-y-3 p-4">
      <p role="alert" className="font-display text-lg leading-snug font-bold">
        {question}
      </p>
      <div className="flex flex-wrap gap-3">
        <DoodleButton
          variant={variant === "danger" ? "danger" : "primary"}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onYes();
            setBusy(false);
            setAsking(false);
          }}
        >
          {yes}
        </DoodleButton>
        <DoodleButton variant="ghost" onClick={() => setAsking(false)}>
          Not now
        </DoodleButton>
      </div>
    </SketchBox>
  );
}

export function IssueDetail({ id }: { id: string }) {
  const router = useRouter();
  const { caseFile, issues, ready } = useCaseData();
  const now = useNow();
  const issue = issues.find((i) => i.id === id);

  if (!ready) {
    return (
      <Shell>
        <div className="grid place-items-center py-20">
          <PencilLoader caption="finding that issue…" />
        </div>
      </Shell>
    );
  }
  if (!issue) {
    return (
      <Shell>
        <DoodleCard seed={7} padding="1.5rem" className="mx-auto mt-8 max-w-lg space-y-3">
          <h1 className="font-display text-2xl font-extrabold">We couldn&apos;t find that issue on this device.</h1>
          <p className="text-muted">Habitable keeps your log in this browser only, so an issue logged on another phone or browser won&apos;t show here.</p>
          <DoodleButton href="/">Back to your case</DoodleButton>
        </DoodleCard>
      </Shell>
    );
  }

  const o = issue.outcome;
  const p = issue.proposal;
  const label = issueName(issue.issue);
  const corrected = p.issue !== issue.issue;

  return (
    <Shell demo={caseFile?.demo}>
      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="space-y-6">
          <SketchBox seed={61} strokeWidth={2.5} fill="#fff" padding="6px" className="rotate-[-0.6deg]">
            <Image
              src={issue.evidence.photo}
              alt={`Photo of the problem: ${label}`}
              width={issue.evidence.width}
              height={issue.evidence.height}
              unoptimized
              className="max-h-[60vh] w-full object-contain lg:max-h-[420px]"
            />
          </SketchBox>

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="flex items-center gap-2.5 font-display text-[2rem] leading-tight font-extrabold">
                <IssueIcon issue={issue.issue} size={34} /> {label}
              </h1>
              {o.status === "classified" ? (
                <Stamp tone={CLASS_TONE[o.hazardClass]} sub={o.classLabel} rotate={-5} className="lg:hidden">
                  Class {o.hazardClass}
                </Stamp>
              ) : (
                <Tag>note · no class</Tag>
              )}
            </div>
            <p className="font-mono text-sm text-muted">
              <b className="text-ink">{issue.fixedAt ? "Fixed" : now ? `Day ${daysSince(issue.createdAt, now)}` : "Day –"}</b> · first documented{" "}
              {formatNY(issue.createdAt, "datetime")}
            </p>
            {issue.note && <p className="font-hand text-[1.4rem] leading-snug">&ldquo;{issue.note}&rdquo;</p>}
            <p className="font-hand text-xl leading-snug">
              {p.source === "manual" ? (
                <>You picked {label} — the AI was unavailable.</>
              ) : (
                <>
                  <span className="text-violet-ink">
                    AI proposed {issueName(p.issue)} ({pct(p.confidence)})
                  </span>{" "}
                  → {corrected ? <>you chose <b>{label}</b></> : "you confirmed it"}
                </>
              )}
            </p>
          </div>

          <Evidence issue={issue} />
        </div>

        <div className="space-y-8">
          {o.status === "classified" && issue.repairBy ? (
            <RuleCard outcome={o} facts={issue.facts} yearBuilt={caseFile?.yearBuilt ?? null} repairBy={issue.repairBy} fixedAt={issue.fixedAt} />
          ) : o.status === "not_applicable" ? (
            <NotApplicableCard outcome={o} />
          ) : null}

          <FollowUps issue={issue} now={now} />

          <DoodleCard as="section" tone="lime" seed={71} padding="1.25rem" appear={false} aria-labelledby="next-title" className="space-y-4">
            <h2 id="next-title" className="font-display text-xl font-extrabold">
              What next
            </h2>
            <DoodleButton href="/notice" size="lg" icon={<Doc size={22} />} className="w-full">
              Make the notice
            </DoodleButton>
            {issue.issue !== "not_covered" && (
              <p className="leading-snug">
                Landlord not responding?{" "}
                <a href={RULES[issue.issue].complaintUrl} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center font-bold`}>
                  Report it to 311
                </a>{" "}
                — an HPD inspection is what puts a violation on record.
              </p>
            )}
          </DoodleCard>

          <section aria-label="Manage this issue" className="flex flex-wrap items-start gap-3 border-t-2 border-dashed border-ink/20 pt-5">
            {!issue.fixedAt && (
              <Confirm
                label="Mark fixed"
                question="Mark this fixed today? The countdown stops and today's date goes on the record."
                yes="Yes, it's fixed"
                variant="secondary"
                icon={<Check size={20} />}
                onYes={async () => {
                  await markFixed(issue.id);
                }}
              />
            )}
            <Confirm
              label="Delete this issue"
              question="Delete this issue, its photo and follow-ups from this device? This can't be undone."
              yes="Delete it"
              variant="danger"
              icon={<Cross size={20} />}
              onYes={async () => {
                router.push("/");
                await deleteIssue(issue.id);
              }}
            />
          </section>
        </div>
      </div>
    </Shell>
  );
}
