import type { Metadata } from "next";
import { LandlordClient } from "./landlord-client";

export const metadata: Metadata = {
  title: "Landlord track record — Habitable",
  description:
    "Every building HPD has registered under the same head officer, corporate owner or managing agent, with open violations per apartment against the New York City rate. Public records, cited.",
  robots: { index: false },
};

export default function LandlordPage() {
  return <LandlordClient />;
}
