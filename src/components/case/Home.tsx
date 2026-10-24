"use client";

import { PencilLoader } from "@/components/doodle";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useCaseData } from "@/lib/store";
import { CaseFile } from "./CaseFile";
import { Welcome } from "./Welcome";

/** "/" — the welcome until a case exists, then the case file. Data lives in this browser only. */
export function Home() {
  const { caseFile, issues, ready, persistent } = useCaseData();
  if (!ready) {
    return (
      <>
        <SiteHeader />
        <main id="main" className="grid flex-1 place-items-center px-4 py-20">
          <PencilLoader caption="opening your case…" />
        </main>
      </>
    );
  }
  return caseFile ? <CaseFile caseFile={caseFile} issues={issues} persistent={persistent} /> : <Welcome />;
}
