"use client";

// The repair notice as a PDF (US Letter). Client-only: load this module with a dynamic import() so
// @react-pdf/renderer never runs on the server or lands in another page's bundle.
import { Document, Font, Image, Link, Page, Path, StyleSheet, Svg, Text, View, pdf } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { NoticeHeatSection, NoticeItem, NoticeText } from "@/lib/notice-text";

Font.register({
  family: "Archivo",
  fonts: [
    { src: "/fonts/archivo-latin-400-normal.woff", fontWeight: 400 },
    { src: "/fonts/archivo-latin-700-normal.woff", fontWeight: 700 },
    { src: "/fonts/archivo-latin-800-normal.woff", fontWeight: 800 },
  ],
});
Font.register({ family: "Patrick Hand", src: "/fonts/patrick-hand-latin-400-normal.woff" });
Font.register({
  family: "JetBrains Mono",
  fonts: [
    { src: "/fonts/jetbrains-mono-latin-400-normal.woff", fontWeight: 400 },
    { src: "/fonts/jetbrains-mono-latin-700-normal.woff", fontWeight: 700 },
  ],
});
// Never break a word across lines (names, citations and hashes read wrong when split).
Font.registerHyphenationCallback((word) => [word]);

const INK = "#0a0a0a";
const MUTED = "#4f4c47";
const MARKER = "#ffcf3f";
const TONES = { A: "#1d60a3", B: "#9a4a00", C: "#b3261a" } as const;

// Not set on the Page: a line-height inherited from the Page makes react-pdf drop the fixed page-number text.
const LEADING = 1.4;

const PHOTO_MAX_W = 220;
const PHOTO_MAX_H = 160;

const s = StyleSheet.create({
  page: { paddingTop: 54, paddingHorizontal: 54, paddingBottom: 96, fontFamily: "Archivo", fontSize: 11, color: INK },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: INK },
  brand: { fontFamily: "Archivo", fontWeight: 800, fontSize: 17, letterSpacing: -0.4, marginLeft: 7 },
  title: { fontFamily: "Archivo", fontWeight: 800, fontSize: 21, lineHeight: 1.15, letterSpacing: -0.5, marginTop: 20 },
  mono: { fontFamily: "JetBrains Mono", fontSize: 8, color: MUTED },
  metaRow: { flexDirection: "row", marginTop: 3 },
  metaLabel: { fontFamily: "JetBrains Mono", fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, width: 50, paddingTop: 2 },
  metaLine: { fontSize: 11, lineHeight: LEADING },
  intro: { marginTop: 14, lineHeight: LEADING },
  item: { marginTop: 14, paddingTop: 14, borderTopWidth: 0.75, borderTopColor: INK },
  itemHead: { flexDirection: "row", alignItems: "center" },
  circle: { width: 20, height: 20, borderWidth: 1.5, borderColor: INK, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  circleText: { fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 9 },
  itemLabel: { flex: 1, fontFamily: "Archivo", fontWeight: 700, fontSize: 14, marginLeft: 8, letterSpacing: -0.2 },
  cols: { flexDirection: "row", marginTop: 8 },
  left: { flex: 1, paddingRight: 14 },
  line: { fontSize: 10.5, lineHeight: LEADING, marginBottom: 2 },
  strong: { fontFamily: "Archivo", fontWeight: 700 },
  small: { fontSize: 9, lineHeight: LEADING, color: MUTED, marginBottom: 4 },
  repairRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 5, flexWrap: "wrap" },
  note: { fontFamily: "Patrick Hand", fontSize: 13, lineHeight: 1.25, marginTop: 3, paddingLeft: 7, borderLeftWidth: 1.5, borderLeftColor: INK },
  followUp: { fontSize: 9.5, lineHeight: LEADING, marginTop: 5 },
  photo: { borderWidth: 1, borderColor: INK },
  evidence: { fontFamily: "JetBrains Mono", fontSize: 7.5, color: MUTED, marginTop: 7 },
  verify: { fontFamily: "JetBrains Mono", fontSize: 7.5, color: INK, marginTop: 3, textDecoration: "underline" },
  closing: { marginTop: 16, lineHeight: LEADING },
  signoff: { marginTop: 8 },
  sigLine: { marginTop: 24, width: 210, borderBottomWidth: 0.75, borderBottomColor: INK },
  signature: { fontFamily: "Archivo", fontWeight: 700, marginTop: 3 },
  footer: { position: "absolute", left: 54, right: 54, bottom: 28 },
  footerRule: { borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 4 },
  pageNumber: { position: "absolute", right: 54, bottom: 14, fontFamily: "JetBrains Mono", fontSize: 8, color: INK },
  footerText: { fontSize: 7, lineHeight: 1.35, color: MUTED },
  heatTitle: { fontFamily: "Archivo", fontWeight: 700, fontSize: 14, letterSpacing: -0.2 },
  heatRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: MUTED },
  heatHead: { fontFamily: "JetBrains Mono", fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 },
  heatWhen: { fontFamily: "Archivo", fontWeight: 700, fontSize: 9, lineHeight: 1.3 },
  heatCellText: { fontSize: 9, lineHeight: 1.3 },
});

/** The font files hold the Latin range only; drop anything else (emoji, other scripts) instead of printing boxes. */
const safe = (v: string) => v.replace(/[^ -~ -ÿ‐-‧‰-⁞€™Œœ]/gu, "");

/** Lime marker rect behind the text, like a highlighter swipe (prints as light grey in black and white). */
function Marked({ children, size = 12 }: { children: ReactNode; size?: number }) {
  return (
    <View style={{ position: "relative", paddingHorizontal: 3 }}>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 1, height: size * 0.55, backgroundColor: MARKER }} />
      {children}
    </View>
  );
}

/** The site's hand-drawn house (same paths as components/site/Wordmark): marker block, roof, walls, check. */
function HouseMark() {
  const stroke = { stroke: INK, strokeWidth: 2.8, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  return (
    <Svg width={28} height={28} viewBox="0 0 40 40">
      <Path d="M11.4 19.6 Q11.6 26.6 11.2 35.2 L33 34.8 Q32.4 27 32.8 19.4 L22 10.2 Z" fill={MARKER} />
      <Path d="M4.2 20.4 C9.4 15.4 14.6 10.4 20.2 5.6 C25.6 10.4 30.6 15.2 35.8 20.2" {...stroke} />
      <Path d="M9.2 17.4 C9.6 23 9.3 28.2 9.5 33.8 L31 33.5 C30.6 28 30.8 22.4 30.7 17.2" {...stroke} />
      <Path d="M14.4 24.8 C15.9 26.2 17.3 27.7 18.5 29.6 C20.6 25.6 23.4 22.4 26.8 20" {...stroke} />
    </Svg>
  );
}

/** Rotated double-border class stamp; the word on it carries the meaning, colour is only extra. */
function ClassStamp({ item }: { item: NoticeItem }) {
  if (!item.hazardClass || !item.classBadge) return null;
  const tone = TONES[item.hazardClass];
  return (
    <View style={{ transform: "rotate(-5deg)", borderWidth: 2, borderColor: tone, borderRadius: 5, padding: 2 }}>
      <View style={{ borderWidth: 0.75, borderColor: tone, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center" }}>
        <Text style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 13, color: tone, textTransform: "uppercase", letterSpacing: -0.2 }}>
          {item.classBadge}
        </Text>
        {item.classWord && (
          <Text style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 6, color: tone, textTransform: "uppercase", letterSpacing: 1 }}>
            {item.classWord}
          </Text>
        )}
      </View>
    </View>
  );
}

function photoSize(item: NoticeItem) {
  const scale = Math.min(PHOTO_MAX_W / item.photoWidth, PHOTO_MAX_H / item.photoHeight);
  return { width: Math.round(item.photoWidth * scale), height: Math.round(item.photoHeight * scale) };
}

function ItemBlock({ item, text }: { item: NoticeItem; text: NoticeText }) {
  const L = text.labels;
  return (
    <View style={s.item} wrap={false}>
      <View style={s.itemHead}>
        <View style={s.circle}>
          <Text style={s.circleText}>{item.n}</Text>
        </View>
        <Text style={s.itemLabel}>{item.label}</Text>
        <ClassStamp item={item} />
      </View>
      <View style={s.cols}>
        <View style={s.left}>
          <Text style={s.line}>
            {L.firstDocumented}: <Text style={s.strong}>{item.firstDocumented}</Text>
            {` (${L.day}\u00A0${item.dayN})`}
          </Text>
          {item.classLine && <Text style={[s.line, s.strong]}>{item.classLine}</Text>}
          {item.windowLine && <Text style={s.line}>{item.windowLine}</Text>}
          {item.citation && <Text style={s.small}>{item.citation}</Text>}
          {item.repairBy && (
            <View style={s.repairRow}>
              <Text style={{ fontSize: 10.5 }}>{L.repairBy}:</Text>
              <View style={{ width: 6 }} />
              <Marked>
                <Text style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 12.5 }}>{item.repairBy}</Text>
              </Marked>
            </View>
          )}
          {item.note !== "" && <Text style={s.note}>{safe(item.note)}</Text>}
          {item.followUpLine && <Text style={s.followUp}>{safe(item.followUpLine)}</Text>}
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop */}
        <Image src={item.photo} style={[s.photo, photoSize(item)]} />
      </View>
      <Text style={s.evidence}>{item.evidenceLine}</Text>
      {item.verifyUrl ? (
        <Link src={item.verifyUrl} style={s.verify}>
          {L.verifyReceipt}
        </Link>
      ) : null}
    </View>
  );
}

// Heat log table: column widths in points (the page body is 504pt wide); the code column takes the rest.
const HEAT_COLS = [
  ["when", 172], // fits "10 de enero de 2027 a las 12:30 a.m." on one line
  ["what", 70],
  ["measured", 52],
  ["outdoor", 76],
  ["required", 52],
  ["code", 0],
] as const;
const heatCell = (w: number) => (w ? { width: w, paddingRight: 6 } : { flex: 1 });

function HeatBlock({ heat }: { heat: NoticeHeatSection }) {
  return (
    <View style={s.item}>
      <View minPresenceAhead={60}>
        <Text style={s.heatTitle}>{heat.title}</Text>
        <Text style={[s.line, { marginTop: 6 }]}>{heat.summary}</Text>
        <View style={[s.heatRow, { borderBottomWidth: 1, borderBottomColor: INK }]}>
          {HEAT_COLS.map(([key, w]) => (
            <Text key={key} style={[s.heatHead, heatCell(w)]}>
              {heat.columns[key]}
            </Text>
          ))}
        </View>
      </View>
      {heat.rows.map((r) => (
        <View key={r.id} style={s.heatRow} wrap={false}>
          {HEAT_COLS.map(([key, w]) => (
            <Text key={key} style={[key === "when" ? s.heatWhen : s.heatCellText, heatCell(w)]}>
              {r[key]}
            </Text>
          ))}
        </View>
      ))}
      {heat.more && <Text style={[s.small, { marginTop: 4 }]}>{heat.more}</Text>}
      <Text style={[s.small, { marginTop: 4 }]}>{heat.rules}</Text>
    </View>
  );
}

export function NoticeDocument({ text }: { text: NoticeText }) {
  const L = text.labels;
  // Each value is a list of lines: the To block is the name, then the mailing address.
  const meta: [string, string[]][] = [
    [L.to, text.to.map(safe)],
    ...(text.cc ? [[L.cc, [safe(text.cc)]] as [string, string[]]] : []),
    [L.from, [safe(text.from)]],
    [L.re, [safe(text.re)]],
  ];
  return (
    <Document title={text.title} author={safe(text.from)} creator="Habitable" producer="Habitable" language={text.lang}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <HouseMark />
          <Text style={s.brand}>Habitable</Text>
        </View>
        <Text style={s.title}>{text.title}</Text>
        <Text style={[s.mono, { marginTop: 6, marginBottom: 8 }]}>{text.dateLine}</Text>
        {meta.map(([label, lines]) => (
          <View key={label} style={s.metaRow}>
            <Text style={s.metaLabel}>{label}</Text>
            <View style={{ flex: 1 }}>
              {lines.map((line, i) => (
                <Text key={i} style={[s.metaLine, label === L.re ? s.strong : {}]}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ))}
        <Text style={s.intro}>{text.intro}</Text>

        {text.items.map((item) => (
          <ItemBlock key={item.issueId} item={item} text={text} />
        ))}

        {text.heat && <HeatBlock heat={text.heat} />}

        <View wrap={false}>
          <Text style={s.closing}>{text.closing}</Text>
          <Text style={s.signoff}>{L.signoff}</Text>
          <View style={s.sigLine} />
          <Text style={s.signature}>{safe(text.signature)}</Text>
        </View>

        <View style={s.footer} fixed>
          <View style={s.footerRule}>
            {text.footer.map((line) => (
              <Text key={line} style={s.footerText}>
                {line}
              </Text>
            ))}
          </View>
        </View>
        {/* react-pdf resolves `render` only for a fixed Text that is a direct child of the Page */}
        <Text
          fixed
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `${L.page} ${pageNumber} ${L.of} ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

/**
 * Pays the first-PDF cost ahead of time: downloads and parses the font files, starts the layout engine and runs a
 * one-line document through the whole pipeline. Call it once the notice page is idle; a failure is harmless (the real
 * render just does the work itself).
 */
export async function warmPdf(): Promise<void> {
  const faces = [
    { fontFamily: "Archivo", fontWeight: 400 },
    { fontFamily: "Archivo", fontWeight: 700 },
    { fontFamily: "Archivo", fontWeight: 800 },
    { fontFamily: "Patrick Hand", fontWeight: 400 },
    { fontFamily: "JetBrains Mono", fontWeight: 400 },
    { fontFamily: "JetBrains Mono", fontWeight: 700 },
  ] as const;
  await pdf(
    <Document>
      <Page size="LETTER">
        {faces.map((f) => (
          <Text key={`${f.fontFamily}${f.fontWeight}`} style={{ fontFamily: f.fontFamily, fontWeight: f.fontWeight }}>
            Habitable
          </Text>
        ))}
      </Page>
    </Document>,
  ).toBlob();
}

/** Builds the PDF in the browser. */
export async function renderNoticeBlob(text: NoticeText): Promise<Blob> {
  return pdf(<NoticeDocument text={text} />).toBlob();
}
