import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Habitable — your repair problem, on the record. A hand-drawn Class B hazard stamp on grid paper.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

export default async function OpengraphImage() {
  const [archivo, hand, mono] = await Promise.all([
    font("archivo", "archivo-latin-800-normal.woff"),
    font("patrick-hand", "patrick-hand-latin-400-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff"),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#f3eee5",
          backgroundImage:
            "linear-gradient(rgba(10,10,10,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          color: "#1d1b20",
          fontFamily: "Archivo",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 44 }}>
          <svg viewBox="0 0 40 40" width="64" height="64">
            <path d="M11.4 19.6 Q11.6 26.6 11.2 35.2 L33 34.8 Q32.4 27 32.8 19.4 L22 10.2 Z" fill="#ffcf3f" />
            <g fill="none" stroke="#1d1b20" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.2 20.4 C9.4 15.4 14.6 10.4 20.2 5.6 C25.6 10.4 30.6 15.2 35.8 20.2" />
              <path d="M9.2 17.4 C9.6 23 9.3 28.2 9.5 33.8 L31 33.5 C30.6 28 30.8 22.4 30.7 17.2" />
              <path d="M14.4 24.8 C15.9 26.2 17.3 27.7 18.5 29.6 C20.6 25.6 23.4 22.4 26.8 20" />
            </g>
          </svg>
          <span style={{ letterSpacing: "-0.03em" }}>Habitable</span>
        </div>

        <div style={{ display: "flex", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 720, fontSize: 96, lineHeight: 1.0, letterSpacing: "-0.04em" }}>
              <span>Your repair problem,&nbsp;</span>
              <span style={{ display: "flex", backgroundImage: "linear-gradient(transparent 52%, #ffcf3f 52%, #ffcf3f 94%, transparent 94%)" }}>
                on the record.
              </span>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontFamily: "Patrick Hand", fontSize: 40, color: "#5534e6" }}>
              snap it → the code classifies it → send the notice
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 0,
              top: -10,
              display: "flex",
              transform: "rotate(-8deg)",
              border: "6px solid #b85c00",
              padding: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "3px solid #b85c00",
                padding: "14px 26px",
                color: "#9c4c00",
              }}
            >
              <span style={{ fontSize: 76, lineHeight: 1, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Class B</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: "0.14em", marginTop: 8 }}>HAZARDOUS</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: "0.1em", color: "#65625c" }}>
          NYC RENTERS · AI PROPOSES, CODE DISPOSES · NOT LEGAL ADVICE
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: archivo, weight: 800, style: "normal" },
        { name: "Patrick Hand", data: hand, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 700, style: "normal" },
      ],
    },
  );
}
