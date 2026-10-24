import type { Metadata } from "next";
import { HeatClient } from "./heat-client";

export const metadata: Metadata = {
  title: "Heat log — Habitable",
  description: "A dated heat and hot water log, each reading checked against NYC's legal minimums. Kept on your device.",
  robots: { index: false },
};

export default function HeatPage() {
  return <HeatClient />;
}
