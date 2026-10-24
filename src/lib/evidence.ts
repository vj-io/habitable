// Browser only. Reads a photo on the device: fingerprint, capture time, and metadata-free copies.
// Nothing here touches the DOM at import time, so importing it on the server is harmless.
import { nyWallTimeToIso } from "./countdown";

export class EvidenceError extends Error {
  code: "not_image" | "too_large" | "unreadable";
  constructor(code: EvidenceError["code"], message: string) {
    super(message);
    this.name = "EvidenceError";
    this.code = code;
  }
}

const MAX_BYTES = 20 * 1024 * 1024;

export interface EvidenceRead {
  sha256: string;
  capturedAt: string | null;
  captureSource: "exif" | "added";
  addedAt: string;
  photo: string;
  width: number;
  height: number;
  aiImage: string;
}

export function shortHash(sha256: string): string {
  return `${sha256.slice(0, 8)}…${sha256.slice(-4)}`;
}

function assertUsable(file: File) {
  // Some browsers leave File.type empty for HEIC; let those reach the decoder, which reports "unreadable".
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new EvidenceError("not_image", "That file isn't a photo.");
  }
  if (file.size > MAX_BYTES) throw new EvidenceError("too_large", "That photo is larger than 20 MB.");
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * EXIF capture time as ISO, or null. exifr revives EXIF dates as browser-local Dates; we only use their
 * wall-clock fields. An offset tag, when present, fixes the zone; otherwise the photo is read as New York
 * time (Habitable is NYC-only), so a viewer's own timezone never shifts the evidence.
 */
async function captureTime(file: File): Promise<string | null> {
  try {
    const { parse } = await import("exifr");
    const tags = await parse(file, {
      pick: [
        "DateTimeOriginal", "OffsetTimeOriginal",
        "CreateDate", "OffsetTimeDigitized",
        "ModifyDate", "OffsetTime", // exifr's name for the EXIF "DateTime" tag
      ],
    });
    if (!tags) return null;
    for (const [dateKey, offsetKey] of [
      ["DateTimeOriginal", "OffsetTimeOriginal"],
      ["CreateDate", "OffsetTimeDigitized"],
      ["ModifyDate", "OffsetTime"],
    ] as const) {
      const d: unknown = tags[dateKey];
      // exifr hands back the raw string for unparseable dates; years before 1990 are zeroed/unset camera clocks.
      if (!(d instanceof Date) || Number.isNaN(+d) || d.getFullYear() < 1990) continue;
      const offset = tags[offsetKey];
      if (typeof offset === "string" && /^[+-]\d{2}:\d{2}$/.test(offset.trim())) {
        const wall = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const withOffset = new Date(wall + offset.trim());
        if (!Number.isNaN(+withOffset)) return withOffset.toISOString();
      }
      return nyWallTimeToIso(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    }
  } catch {
    // No EXIF, or a format exifr can't read: treat as "no capture time".
  }
  return null;
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function decode(file: File): Promise<Decoded> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    // createImageBitmap (or its options) unsupported, or the format failed: try an <img>, which applies EXIF orientation itself.
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new EvidenceError("unreadable", "This browser can't read that photo. Try a JPEG or PNG.");
  }
}

/** Redraw on a white canvas and export JPEG. Re-encoding drops every metadata block, GPS included. */
function encode(d: Decoded, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(d.width, d.height));
  const width = Math.max(1, Math.round(d.width * scale));
  const height = Math.max(1, Math.round(d.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new EvidenceError("unreadable", "This browser can't process that photo.");
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black in a JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(d.source, 0, 0, width, height);
  const url = canvas.toDataURL("image/jpeg", quality);
  if (!url.startsWith("data:image/jpeg")) throw new EvidenceError("unreadable", "That photo is too large for this browser to process.");
  return { url, width, height };
}

/** Metadata-free JPEG data URL (max `maxEdge` px). Used for follow-up photos. */
export async function stripImage(file: File, maxEdge = 1600): Promise<string> {
  assertUsable(file);
  const d = await decode(file);
  try {
    return encode(d, maxEdge, 0.82).url;
  } finally {
    d.close();
  }
}

export async function readEvidence(file: File): Promise<EvidenceRead> {
  assertUsable(file);
  const addedAt = new Date().toISOString();
  const d = await decode(file); // fail fast on undecodable files (e.g. HEIC in Chrome)
  try {
    const [sha256, taken] = await Promise.all([sha256Hex(file), captureTime(file)]);
    const stored = encode(d, 1600, 0.82);
    // 768px: Gemini bills images in 768px tiles, so this is one tile per photo (fewer tokens per minute).
    const ai = encode(d, 768, 0.8);
    return {
      sha256,
      capturedAt: taken,
      captureSource: taken ? "exif" : "added",
      addedAt,
      photo: stored.url,
      width: stored.width, // dimensions of the stored copy; the original is not kept
      height: stored.height,
      aiImage: ai.url,
    };
  } finally {
    d.close();
  }
}
