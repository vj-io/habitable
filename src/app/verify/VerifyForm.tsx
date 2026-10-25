"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DoodleButton, DoodleCard, Stamp } from "@/components/doodle";
import { Field, inputClass } from "@/components/site/Field";

type Result = { key: string; valid: boolean | null };

/** SHA-256 of public/samples/leak-ceiling.jpg: a stand-in photo fingerprint for "Try a real receipt". */
const SAMPLE_SHA256 = "f69fe499c1331ccdc6530b1fb7124a1f880ff64effdf25f98a105a48470514f8";

/** Asks the server to sign the sample fingerprint now, exactly as it does for a photo being logged. */
async function stampSample(): Promise<{ receivedAt: string; receipt: string } | null> {
  try {
    const res = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha256: SAMPLE_SHA256 }) });
    return res.ok ? ((await res.json()) as { receivedAt: string; receipt: string }) : null;
  } catch {
    return null;
  }
}

/** The same hex string with its first digit changed, so it is guaranteed different. */
const flipFirstDigit = (hex: string) => ((parseInt(hex[0], 16) + 1) % 16).toString(16) + hex.slice(1);

async function check(sha256: string, receivedAt: string, receipt: string): Promise<boolean | null> {
  try {
    const qs = new URLSearchParams({ sha256: sha256.trim().toLowerCase(), receivedAt: receivedAt.trim(), receipt: receipt.trim().toLowerCase() });
    const res = await fetch(`/api/receipt?${qs.toString()}`);
    if (!res.ok) return null;
    return ((await res.json()) as { valid: boolean }).valid;
  } catch {
    return null;
  }
}

export function VerifyForm() {
  const params = useSearchParams();
  const [sha256, setSha] = useState(params.get("sha256") ?? "");
  const [receivedAt, setReceivedAt] = useState(params.get("receivedAt") ?? "");
  const [receipt, setReceipt] = useState(params.get("receipt") ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const key = `${sha256}|${receivedAt}|${receipt}`;

  // Arriving from a notice's link: check straight away.
  const [initial] = useState(() => (params.get("sha256") && params.get("receivedAt") && params.get("receipt") ? key : null));
  useEffect(() => {
    if (!initial) return;
    const [s, r, c] = initial.split("|");
    void check(s, r, c).then((valid) => setResult({ key: initial, valid }));
  }, [initial]);

  async function run(s: string, r: string, c: string) {
    setBusy(true);
    setResult({ key: `${s}|${r}|${c}`, valid: await check(s, r, c) });
    setBusy(false);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "center" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    return run(sha256, receivedAt, receipt);
  }

  // One tap: have the server sign a sample fingerprint, fill the form with it and check it.
  async function trySample() {
    setBusy(true);
    const stamp = await stampSample();
    if (!stamp) {
      setResult({ key, valid: null });
      setBusy(false);
      return;
    }
    setSha(SAMPLE_SHA256);
    setReceivedAt(stamp.receivedAt);
    setReceipt(stamp.receipt);
    await run(SAMPLE_SHA256, stamp.receivedAt, stamp.receipt);
  }

  // After a valid result: change one character of the fingerprint and check again.
  function tamper() {
    const changed = flipFirstDigit(sha256.trim().toLowerCase());
    setSha(changed);
    return run(changed, receivedAt, receipt);
  }

  const shown = result?.key === key ? result.valid : undefined;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div ref={resultRef} aria-live="polite" className="scroll-mt-6 empty:hidden">
        {shown === true && (
          <div className="flex flex-wrap items-center gap-5">
            <Stamp tone="mint" size="lg" sub="Signed by Habitable" rotate={-7}>
              Valid
            </Stamp>
            <p className="max-w-xs font-hand text-xl leading-snug">This fingerprint reached Habitable&apos;s server at exactly that time.</p>
            <DoodleButton variant="secondary" loading={busy} onClick={() => void tamper()}>
              Change one character
            </DoodleButton>
          </div>
        )}
        {shown === false && (
          <div className="flex flex-wrap items-center gap-5">
            <Stamp tone="red" size="lg" sub="Doesn't match" rotate={-5}>
              Not valid
            </Stamp>
            <p className="max-w-xs font-hand text-xl leading-snug">The fingerprint, time or code was changed, or mistyped. Check each character.</p>
          </div>
        )}
        {shown === null && <p className="font-hand text-xl text-red-ink">The receipt service is unavailable right now. Try again in a moment.</p>}
      </div>
      <DoodleCard seed={14} padding="1.25rem" className="space-y-4" appear={false}>
        <Field id="v-sha" label="Photo fingerprint (SHA-256)">
          <input id="v-sha" value={sha256} onChange={(e) => setSha(e.target.value)} spellCheck={false} autoComplete="off" placeholder="64 characters, 0-9 and a-f" className={`${inputClass} font-mono text-sm`} />
        </Field>
        <Field id="v-at" label="Received at">
          <input id="v-at" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} spellCheck={false} autoComplete="off" placeholder="2026-10-24T19:12:03.000Z" className={`${inputClass} font-mono text-sm`} />
        </Field>
        <Field id="v-rc" label="Receipt code">
          <input id="v-rc" value={receipt} onChange={(e) => setReceipt(e.target.value)} spellCheck={false} autoComplete="off" placeholder="12 characters" className={`${inputClass} font-mono text-sm`} />
        </Field>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <DoodleButton type="submit" size="lg" loading={busy} disabled={!sha256 || !receivedAt || !receipt}>
            Check receipt
          </DoodleButton>
          <DoodleButton variant="ghost" disabled={busy} onClick={() => void trySample()}>
            Try a real receipt
          </DoodleButton>
        </div>
      </DoodleCard>

    </form>
  );
}
