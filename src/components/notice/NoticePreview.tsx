import { DoodleCard, Highlight, MonoLabel, Stamp, type StampTone } from "@/components/doodle";
import { HouseMark } from "@/components/site/Wordmark";
import type { NoticeItem, NoticeText } from "@/lib/notice-text";

const STAMP_TONE: Record<"A" | "B" | "C", StampTone> = { A: "sky", B: "amber", C: "red" };

function Item({ item, text }: { item: NoticeItem; text: NoticeText }) {
  const L = text.labels;
  return (
    <li className="border-t-2 border-ink pt-4">
      {/* the stamp wraps under the label on narrow screens instead of squeezing it */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink font-mono text-sm font-bold">{item.n}</span>
        <h3 className="min-w-0 flex-1 basis-40 font-display text-lg font-bold leading-tight">{item.label}</h3>
        {item.hazardClass && item.classBadge && (
          <Stamp tone={STAMP_TONE[item.hazardClass]} size="sm" sub={item.classWord} rotate={-5} seed={item.n + 2} className="ml-auto shrink-0">
            {item.classBadge}
          </Stamp>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1 text-[0.9375rem] leading-snug">
          <p>
            {L.firstDocumented}: <b className="font-bold">{item.firstDocumented}</b>
            <span className="whitespace-nowrap font-mono text-sm"> ({L.day}&nbsp;{item.dayN})</span>
          </p>
          {item.classLine && <p className="font-bold">{item.classLine}</p>}
          {item.windowLine && <p>{item.windowLine}</p>}
          {item.citation && <p className="text-sm text-muted">{item.citation}</p>}
          {item.repairBy && (
            <p className="pt-1">
              {L.repairBy}: <Highlight className="font-display text-lg font-extrabold">{item.repairBy}</Highlight>
            </p>
          )}
          {item.note && <p className="border-l-2 border-ink pl-2.5 font-hand text-xl leading-tight">{item.note}</p>}
          {item.followUpLine && <p className="pt-1 text-sm">{item.followUpLine}</p>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- the photo is an on-device data URL */}
        <img
          src={item.photo}
          alt={`${item.label} — ${item.firstDocumented}`}
          width={item.photoWidth}
          height={item.photoHeight}
          className="h-auto w-full max-w-[220px] self-start border-2 border-ink bg-paper object-contain sm:w-[40%]"
        />
      </div>
      <p className="mt-3 break-words font-mono text-[0.6875rem] leading-snug text-muted">{item.evidenceLine}</p>
      {item.verifyUrl ? (
        <a
          href={item.verifyUrl}
          className="mt-1 inline-block font-mono text-[0.6875rem] text-ink underline underline-offset-2"
        >
          {L.verifyReceipt}
        </a>
      ) : null}
    </li>
  );
}

/** The notice as HTML on a paper card: the same NoticeText the PDF prints, so what you see is what you send. */
export function NoticePreview({ text }: { text: NoticeText }) {
  const L = text.labels;
  return (
    <DoodleCard as="article" appear={false} seed={21} className="sm:p-8" aria-label={text.title}>
      <div lang={text.lang} className="space-y-4">
        <div className="flex items-center gap-1.5 border-b-2 border-ink pb-2 font-display text-xl font-extrabold tracking-[-0.03em]">
          <HouseMark size={30} />
          Habitable
        </div>
        <h2 className="font-display text-[1.7rem] font-extrabold leading-[1.08]">{text.title}</h2>
        <MonoLabel as="p" muted>{text.dateLine}</MonoLabel>
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
          {([[L.to, text.to], [L.from, text.from], [L.re, text.re]] as const).map(([label, value]) => (
            <div key={label} className="col-span-2 grid grid-cols-subgrid">
              <MonoLabel as="dt" className="pt-1">{label}</MonoLabel>
              <dd className={`min-w-0 break-words ${label === L.re ? "font-bold" : ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="leading-snug">{text.intro}</p>

        <ol className="space-y-5">
          {text.items.map((item) => (
            <Item key={item.issueId} item={item} text={text} />
          ))}
        </ol>

        <p className="pt-2 leading-snug">{text.closing}</p>
        <div>
          <p>{L.signoff}</p>
          <p className="mt-7 w-56 max-w-full border-t-2 border-ink pt-1 font-bold">{text.signature}</p>
        </div>

        <div className="space-y-1 border-t border-ink/40 pt-3">
          {text.footer.map((line) => (
            <p key={line} className="text-xs leading-snug text-muted">
              {line}
            </p>
          ))}
        </div>
      </div>
    </DoodleCard>
  );
}
