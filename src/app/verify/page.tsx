import type { Metadata } from "next";
import { Suspense } from "react";
import { MonoLabel, PencilLoader } from "@/components/doodle";
import { SiteHeader } from "@/components/site/SiteHeader";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = {
  title: "Verify a receipt — Habitable",
  description: "Check that Habitable's server saw a photo's fingerprint at the time a notice says it did.",
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 space-y-6 px-4 pt-4 pb-10 sm:px-6 *:max-w-2xl">
        <MonoLabel as="p">Receipt check</MonoLabel>
        <h1 className="font-display text-[2.25rem] leading-[1.05] font-extrabold sm:text-5xl">Did Habitable really see this photo then?</h1>
        <p className="text-lg leading-relaxed text-ink/85">
          When a photo is logged, Habitable&apos;s server signs its fingerprint (SHA-256) together with the time it arrived. If either one is
          changed — a different photo, a different time — the receipt stops matching.
        </p>
        <Suspense fallback={<PencilLoader caption="loading the form…" />}>
          <VerifyForm />
        </Suspense>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          A valid receipt proves the server saw that exact file at that moment. It doesn&apos;t prove what the photo shows or who took it.
        </p>
      </main>
    </>
  );
}
