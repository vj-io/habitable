"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Arrow, Check, Chip, Doc, DoodleButton, DoodleCard, Highlight, MonoLabel, PencilLoader, Tag } from "@/components/doodle";
import { NoticePreview } from "@/components/notice/NoticePreview";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  complaint311Text,
  complaintUrl,
  noticeFileName,
  noticeText,
  type NoticeItem,
  type NoticeLang,
  type NoticeText,
} from "@/lib/notice-text";
import { saveCase, useCaseData } from "@/lib/store";
import type { CaseFile, HeatReading, Issue } from "@/lib/types";

const HPD_NEXT_STEPS_URL = "https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page";
const WOBBLE = "14px 4px 12px 5px / 5px 12px 4px 14px";

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-xl space-y-6 px-4 pt-4 pb-20 sm:px-6">
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

export function NoticeClient() {
  const { caseFile, issues, heatReadings, ready } = useCaseData();

  if (!ready) {
    return (
      <Shell>
        <PencilLoader caption="opening your case…" />
      </Shell>
    );
  }
  if (!caseFile) {
    return (
      <Shell>
        <DoodleCard className="space-y-4">
          <h1 className="font-display text-3xl font-extrabold leading-tight">Set up your case first</h1>
          <p>The notice is built from your address and your logged problems. Add your address and snap a problem, then come back.</p>
          <DoodleButton href="/">Set up my case</DoodleButton>
        </DoodleCard>
      </Shell>
    );
  }
  return (
    <Shell>
      <NoticeBuilder caseFile={caseFile} issues={issues} heatReadings={heatReadings} />
    </Shell>
  );
}

const subscribeNever = () => () => {};
/** Web Share with files exists on most phones and a few desktops; the check needs a File to ask about. */
function canShareFiles(): boolean {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "notice.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}

function NoticeBuilder({ caseFile, issues, heatReadings }: { caseFile: CaseFile; issues: Issue[]; heatReadings: HeatReading[] }) {
  const [now] = useState(() => new Date());
  const [lang, setLang] = useState<NoticeLang>("en");
  const [tenant, setTenant] = useState(caseFile.tenantName ?? "");
  const [landlord, setLandlord] = useState(caseFile.landlordName ?? "");
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const canShare = useSyncExternalStore(subscribeNever, canShareFiles, () => false);
  const cache = useRef<{ text: NoticeText; blob: Blob } | null>(null);

  const named = useMemo(() => ({ ...caseFile, tenantName: tenant, landlordName: landlord }), [caseFile, tenant, landlord]);
  const text = useMemo(
    () => noticeText(named, issues, lang, now, window.location.origin, heatReadings),
    [named, issues, lang, now, heatReadings],
  );
  const fileName = noticeFileName(caseFile, now);
  // A heat log with readings below the minimum is worth a notice on its own.
  const hasItems = text.items.length > 0 || text.heat !== null;

  // Warm the PDF code path in the background (renderer, notice component, fonts) so the first Download or Share
  // is quick. Waits a moment so it doesn't compete with the first paint; ignores failures.
  useEffect(() => {
    if (!hasItems) return;
    const timer = setTimeout(() => {
      void import("@/components/notice/NoticeDocument").then((m) => m.warmPdf()).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [hasItems]);

  // Names are saved with the case when the field loses focus, so they persist and prefill next time.
  function persistNames() {
    const t = tenant.trim();
    const l = landlord.trim();
    if (t === (caseFile.tenantName ?? "") && l === (caseFile.landlordName ?? "")) return;
    void saveCase({ ...caseFile, tenantName: t || undefined, landlordName: l || undefined });
  }

  // Rendering a PDF with photos takes a moment, so keep the last one until the notice text changes.
  async function makeBlob(): Promise<Blob> {
    if (cache.current?.text === text) return cache.current.blob;
    const { renderNoticeBlob } = await import("@/components/notice/NoticeDocument");
    const blob = await renderNoticeBlob(text);
    cache.current = { text, blob };
    return blob;
  }

  async function run(kind: "download" | "share") {
    setBusy(kind);
    setError(null);
    setHint(null);
    let blob: Blob;
    try {
      blob = await makeBlob();
    } catch {
      setError("Couldn't make the PDF — try again");
      setBusy(null);
      return;
    }
    try {
      if (kind === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } else {
        await navigator.share({ files: [new File([blob], fileName, { type: "application/pdf" })], title: text.title });
      }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError") setHint("Your PDF is ready. Tap Share once more to send it.");
      else if (name !== "AbortError") setError(kind === "share" ? "Couldn't open sharing — try Download PDF instead" : "Couldn't save the PDF — try again");
    }
    setBusy(null);
  }

  const byId = new Map(issues.map((i) => [i.id, i]));

  return (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.02]">
            Your repair <Highlight>notice</Highlight>
          </h1>
          {caseFile.demo && <Chip lead="Demo">sample building</Chip>}
        </div>
        <p className="font-hand text-xl leading-snug text-muted">A dated letter for your landlord. Check it, then download or share it.</p>
      </header>

      <DoodleCard className="space-y-5" appear={false} seed={5}>
        <div className="space-y-1.5">
          <MonoLabel as="p">Language</MonoLabel>
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <Field label="Your name" value={tenant} onChange={setTenant} onBlur={persistNames} autoComplete="name" />
        <Field label="Landlord or managing agent" value={landlord} onChange={setLandlord} onBlur={persistNames} autoComplete="off" />
      </DoodleCard>

      {!hasItems ? (
        <DoodleCard tone="marker" className="space-y-3">
          <h2 className="font-display text-2xl font-extrabold leading-tight">Nothing to put in a notice yet</h2>
          <p>
            {text.fixedCount > 0
              ? "Everything you logged is marked fixed, so there is nothing left to ask for."
              : "Snap a problem on your case file and it will show up here, dated and classified."}
          </p>
          <DoodleButton href="/" variant="secondary">
            Back to your case file
          </DoodleButton>
        </DoodleCard>
      ) : (
        <>
          <section aria-label="Notice preview" className="space-y-2">
            <MonoLabel as="p">Preview · the PDF says exactly this</MonoLabel>
            <NoticePreview text={text} />
            {text.fixedCount > 0 && (
              <p className="font-mono text-xs text-muted">
                {text.fixedCount} fixed {text.fixedCount === 1 ? "problem is" : "problems are"} left out.
              </p>
            )}
          </section>

          <section aria-label="Download or share" className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <DoodleButton size="lg" icon={<Doc />} loading={busy === "download"} disabled={busy !== null} onClick={() => void run("download")}>
                {busy === "download" ? "Making your PDF…" : "Download PDF"}
              </DoodleButton>
              {canShare && (
                <DoodleButton
                  size="lg"
                  variant="secondary"
                  icon={<Arrow direction="up" size={22} />}
                  loading={busy === "share"}
                  disabled={busy !== null}
                  onClick={() => void run("share")}
                >
                  {busy === "share" ? "Making your PDF…" : "Share"}
                </DoodleButton>
              )}
            </div>
            {error && (
              <p role="alert" className="font-hand text-xl text-red-ink">
                {error}
              </p>
            )}
            {hint && (
              <p role="status" className="font-hand text-xl text-violet-ink">
                {hint}
              </p>
            )}
          </section>

          {text.items.length > 0 && (
            <section aria-labelledby="h311" className="space-y-3">
              <MonoLabel as="h2">
                <span id="h311">Also tell NYC 311</span>
              </MonoLabel>
              <p className="text-[0.9375rem] leading-snug">Copy the text, then paste it into the 311 complaint form.</p>
              <ul className="space-y-3">
                {text.items.map((item) => {
                  const issue = byId.get(item.issueId);
                  return issue && <Row311 key={item.issueId} item={item} issue={issue} caseFile={caseFile} now={now} heatReadings={heatReadings} />;
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="space-y-1 text-sm text-muted">
        <span className="block font-mono text-xs uppercase tracking-[0.12em]">Not legal advice</span>
        <a
          href={HPD_NEXT_STEPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-ink underline decoration-2 underline-offset-4 hover:decoration-wavy"
        >
          What happens next ↗
        </a>
      </p>
    </>
  );
}

function LangToggle({ lang, onChange }: { lang: NoticeLang; onChange: (l: NoticeLang) => void }) {
  const options = [
    { id: "en", name: "English" },
    { id: "es", name: "Español" },
  ] as const;
  return (
    <div role="group" aria-label="Notice language" className="inline-flex overflow-hidden border-2 border-ink bg-paper-2" style={{ borderRadius: WOBBLE }}>
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          lang={o.id}
          aria-label={o.name}
          aria-pressed={lang === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-11 min-w-20 cursor-pointer px-5 font-mono text-sm font-bold uppercase tracking-[0.1em] ${i > 0 ? "border-l-2 border-ink" : ""} ${lang === o.id ? "bg-marker text-on-marker" : ""}`}
        >
          {o.id}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  autoComplete: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id}>
        <MonoLabel>{label}</MonoLabel>
        <span className="font-hand text-lg text-muted"> · optional</span>
      </label>
      <input
        id={id}
        type="text"
        value={value}
        autoComplete={autoComplete}
        maxLength={120}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="block min-h-12 w-full border-2 border-ink bg-paper-2 px-3.5 text-base"
        style={{ borderRadius: WOBBLE }}
      />
    </div>
  );
}

function Row311({
  item,
  issue,
  caseFile,
  now,
  heatReadings,
}: {
  item: NoticeItem;
  issue: Issue;
  caseFile: CaseFile;
  now: Date;
  heatReadings: HeatReading[];
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const body = complaint311Text(caseFile, issue, now, heatReadings);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
    }
  }

  return (
    <li>
      <DoodleCard appear={false} padding="1rem" seed={item.n + 30} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-lg font-bold leading-tight">{item.label}</p>
          {item.hazardClass && <Tag tone={item.hazardClass === "C" ? "red" : item.hazardClass === "B" ? "amber" : "ink"}>{item.classBadge}</Tag>}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <DoodleButton variant="secondary" icon={state === "copied" ? <Check size={20} /> : undefined} onClick={() => void copy()}>
            {state === "copied" ? "Copied" : "Copy 311 text"}
          </DoodleButton>
          <a
            href={complaintUrl(issue)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4 hover:decoration-wavy"
          >
            Open NYC 311 ↗
          </a>
        </div>
        <span role="status" className="sr-only">
          {state === "copied" ? "Copied to clipboard" : ""}
        </span>
        {state === "failed" && (
          <div className="space-y-1">
            <p className="font-hand text-xl text-red-ink">Couldn&apos;t copy automatically — select and copy this text.</p>
            <textarea
              readOnly
              rows={6}
              defaultValue={body}
              aria-label={`311 text for ${item.label}`}
              onFocus={(e) => e.currentTarget.select()}
              className="block w-full border-2 border-ink bg-paper-2 p-2 font-mono text-xs"
            />
          </div>
        )}
      </DoodleCard>
    </li>
  );
}
