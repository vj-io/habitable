"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DoodleButton, DoodleCard, Stamp } from "@/components/doodle";
import { Field, inputClass } from "@/components/site/Field";

type Result = { key: string; valid: boolean | null };

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult({ key, valid: await check(sha256, receivedAt, receipt) });
    setBusy(false);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "center" }));
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
        <DoodleButton type="submit" size="lg" loading={busy} disabled={!sha256 || !receivedAt || !receipt}>
          Check receipt
        </DoodleButton>
      </DoodleCard>

    </form>
  );
}
