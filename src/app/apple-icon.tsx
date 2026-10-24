import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The doodle house mark on paper, as a PNG for iOS home screens (which ignore SVG icons).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3eee5" }}>
        <svg viewBox="0 0 64 64" width="180" height="180">
          <path d="M19 31.5 Q19.4 42 18.8 53.5 L52 53 Q51.2 42 51.8 31 L35 17 Z" fill="#ffcf3f" />
          <g fill="none" stroke="#1d1b20" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 32.5 C15 25 23 17.5 32.3 9.5 C41 17.4 48.8 24.8 57 32.2" />
            <path d="M14.6 28 C15.2 36.6 14.8 44.6 15 53.4 L49.6 52.9 C49 44.4 49.3 35.8 49.1 27.6" />
            <path d="M22.6 39.4 C25 41.6 27.2 44 29 47 C32.4 40.6 36.8 35.6 42.2 31.8" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
