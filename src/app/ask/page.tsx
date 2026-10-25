import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Highlight, MonoLabel, PencilLoader } from "@/components/doodle";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PASSAGES, isLawText } from "@/lib/law/corpus";
import { AskClient } from "./AskClient";
import { BackLink } from "@/components/site/BackLink";

export const metadata: Metadata = {
  title: "Ask the law — Habitable",
  description:
    "Ask a question about NYC housing rules in your own words. The AI may only answer with quotes from the law text, and code checks every quote word for word before it is shown.",
};

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";
const lawCount = PASSAGES.filter(isLawText).length;
const hpdCount = PASSAGES.length - lawCount;

export default function AskPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 space-y-6 px-4 pt-4 pb-10 sm:px-6 *:max-w-2xl">
        <BackLink />

        <header className="space-y-4">
          <MonoLabel as="p">Law text · quotes checked by code</MonoLabel>
          <h1 className="font-display text-[2.4rem] leading-[1.02] font-extrabold sm:text-6xl">
            Ask <Highlight>the law</Highlight>
          </h1>
          <p className="text-lg leading-relaxed text-ink/85">
            Ask in your own words. The AI may only answer with quotes from the law text Habitable keeps, and code checks every quote word for word
            before you see it. Sentences whose quotes don&apos;t match are dropped.
          </p>
          <p className="font-hand text-xl leading-snug">
            <span className="font-mono text-[0.75rem] tracking-[0.14em] uppercase">Not legal advice.</span> It shows what the text says, not what fits
            your situation.{" "}
            <Link href="/next-steps" className={linkClass}>
              Next steps and free legal help
            </Link>
          </p>
        </header>

        <Suspense fallback={<PencilLoader caption="loading…" />}>
          <AskClient />
        </Suspense>

        <section aria-labelledby="corpus-title" className="space-y-2 border-t-2 border-dashed border-ink/20 pt-5 text-[0.9375rem] leading-relaxed text-muted">
          <h2 id="corpus-title" className="font-display text-base font-bold text-ink">
            What the law text is
          </h2>
          <p>
            {lawCount} passages of the NYC Housing Maintenance Code (Admin. Code Title 27, Chapter 2), split at subdivisions, from{" "}
            <a href="https://www.nyc.gov/assets/buildings/pdf/HousingMaintenanceCode.pdf" target="_blank" rel="noreferrer" className={linkClass}>
              the city&apos;s compilation dated Apr 17, 2026
            </a>
            , and {hpdCount} excerpts of HPD pages on nyc.gov. All copied word for word on Oct 25, 2026; each passage links to its page.
          </p>
          <p>New York State law, like the warranty of habitability or the rule against retaliation, isn&apos;t in it yet.</p>
        </section>
      </main>
    </>
  );
}
