import type { Metadata } from "next";
import { NoticeClient } from "./notice-client";

export const metadata: Metadata = {
  title: "Your repair notice — Habitable",
  description: "A dated, printable repair notice for your landlord, built on your device from your case file.",
  robots: { index: false },
};

export default function NoticePage() {
  return <NoticeClient />;
}
