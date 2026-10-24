import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono, Patrick_Hand } from "next/font/google";
import { BoilFilter } from "@/components/doodle/BoilFilter";
import { SiteFooter, SkipLink } from "@/components/site/SiteFooter";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// Absolute base for share images: the Vercel production domain when deployed, localhost otherwise.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Habitable — your repair problem, on the record",
  description:
    "Snap a photo of what's broken in your NYC apartment. Get a code-classified evidence log and a ready-to-send repair notice.",
  applicationName: "Habitable",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f0ede8",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${patrickHand.variable} ${jetbrainsMono.variable}`}>
      <body className="flex flex-col">
        <SkipLink />
        <BoilFilter />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
