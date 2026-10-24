import type { Metadata } from "next";
import { Suspense } from "react";
import { PencilLoader } from "@/components/doodle";
import { IssueDetail } from "@/components/issue/IssueDetail";

export const metadata: Metadata = {
  title: "Issue — Habitable",
  description: "One logged repair problem: photo, evidence, the rule that applies, and follow-ups.",
};

export default function Page({ params }: PageProps<"/issue/[id]">) {
  return (
    <Suspense
      fallback={
        <main id="main" className="grid flex-1 place-items-center px-4 py-24">
          <PencilLoader caption="finding that issue…" />
        </main>
      }
    >
      {params.then(({ id }) => (
        <IssueDetail id={id} />
      ))}
    </Suspense>
  );
}
