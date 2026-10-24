"use client";

import { useState } from "react";
import { Chip, DoodleButton, DoodleSheet, Doc, Highlight, MonoLabel } from "@/components/doodle";

export function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DoodleButton variant="secondary" icon={<Doc />} onClick={() => setOpen(true)}>
        Why this class?
      </DoodleButton>
      <DoodleSheet open={open} onClose={() => setOpen(false)} title="Why Class B?">
        <div className="space-y-5 pb-4">
          <p className="text-lg">
            The AI picked the problem type. <Highlight>This table — not the AI</Highlight> set the class and window.
          </p>
          <div className="space-y-1">
            <MonoLabel>Rule row · sample</MonoLabel>
            <p className="font-mono text-sm">leak / water damage → Class B → 30 days</p>
          </div>
          <Chip lead="Source">NYC Housing Maintenance Code (sample)</Chip>
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i} className="text-muted">
              Filler paragraph {i + 1} so the sheet scrolls inside itself while the page behind stays put.
            </p>
          ))}
          <DoodleButton className="w-full" onClick={() => setOpen(false)}>
            Got it
          </DoodleButton>
        </div>
      </DoodleSheet>
    </>
  );
}
