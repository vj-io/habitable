---
doc: spec
status: approved
---

# Habitable — Technical Spec

## How This Works, In Plain Language
Habitable is one website that works like a phone app. It has three parts:

1. **The app on your phone (the browser).** It reads your photo, computes its fingerprint (a SHA-256 hash — a code that changes if a single pixel changes), reads the time the photo was taken from inside the file (EXIF), removes location data, and keeps your whole case — address, issues, photos, follow-ups — in the browser's own storage (IndexedDB). There is no account and nothing is uploaded except what the next part needs.
2. **A small server (Next.js API routes on Vercel).** It does three jobs the phone can't do safely: asks the vision AI to *propose* a problem type (the AI key stays on the server), stamps a receipt saying "I saw this fingerprint at this time", and fetches the building's public record from NYC Open Data.
3. **The rules table (`src/lib/rules.json`) and the rules engine (`src/lib/rules.ts`).** Plain data plus plain code. Given the problem type and any facts it needs (mold size, a child under 6, heat or hot water, the date), it returns the hazard class, the correction window, the code section and the source link. The AI never touches this step. That is the kernel: **AI proposes, code disposes.**

The notice PDF is drawn in the browser from the saved case, so the document never passes through a server.

Why this shape: one deployable app, no database, no login, one external AI call per photo. Everything the demo needs also works offline from saved sample answers (demo mode).

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. **Arrive / set up** — the renter types an address → the browser asks NYC GeoSearch directly (it allows cross-origin requests) → suggestions come back with borough, BBL and BIN → the renter picks one and types a unit → the browser saves the `CaseFile` in IndexedDB → it asks `/api/building?bbl=` for year built and violations (shown on the case file).
2. **Snap** — the camera input returns a file → `evidence.ts` reads EXIF capture time (exifr), hashes the original bytes (Web Crypto), and re-encodes a ≤1600px JPEG on a canvas (which drops every metadata tag, GPS included) → in parallel the browser posts the hash to `/api/receipt` and gets `{receivedAt, receipt}`.
3. **AI proposes** — the browser posts a ≤1024px copy + the optional note to `/api/classify` → in demo mode with a sample photo the server returns the saved answer; otherwise it calls the vision model with a fixed list and a Zod schema at temperature 0 → **code** checks confidence: below 0.7 with no answer yet → returns a clarifying question; else the proposal. Errors / no key → `{status: "unavailable"}` and the UI shows the manual picker.
4. **Code disposes** — the browser runs `evaluate(issue, facts, {now, yearBuilt})` from `rules.ts` → if a rule needs a fact it returns questions → the renter answers → it returns the class, window, citation and source → `countdown.ts` computes the requested repair-by date in America/New_York.
5. **Building context** — the case file's `BuildingRecord` is filtered to the issue's category (`byIssue`, `recent[].issue`).
6. **Log** — the browser saves an `Issue` in IndexedDB; follow-ups and "mark fixed" update it.
7. **Notice** — `/notice` builds the PDF in the browser with `@react-pdf/renderer` from the saved case (EN/ES text from `notice-text.ts`) → download or Web Share; "Copy 311 text" uses the same module.

## Stack
- **Next.js 16.4 (App Router) + React 19 + TypeScript** — one app for pages and API routes; deploys to Vercel in one command. Docs: https://nextjs.org/docs (the installed version's docs are in `node_modules/next/dist/docs/` and take precedence — this version enables `cacheComponents`).
- **Tailwind CSS v4** — styling via CSS variables for the doodle tokens. https://tailwindcss.com/docs
- **AI SDK 7 (`ai`)** — one `generateText` call with a structured `Output.object` schema. Model ids route through **Vercel AI Gateway** (`anthropic/claude-haiku-5.5` primary, `google/gemini-2.5-flash` fallback). If `GOOGLE_GENERATIVE_AI_API_KEY` is set, `@ai-sdk/google` is used directly instead. https://ai-sdk.dev/docs · https://vercel.com/docs/ai-gateway
- **Zod 4** — validates the model's answer and every API input. https://zod.dev
- **exifr** — reads EXIF capture time in the browser. https://github.com/MikeKovarik/exifr
- **idb-keyval** — tiny IndexedDB wrapper for the on-device case. https://github.com/jakearchibald/idb-keyval
- **@react-pdf/renderer 4** — notice PDF in the browser with embedded fonts (no headless Chrome). https://react-pdf.org
- **Vitest** (rules, countdown, building, notice text, API logic) and **Playwright** (one end-to-end journey in demo mode). https://vitest.dev · https://playwright.dev
- Fonts: Archivo, Patrick Hand, JetBrains Mono (SIL OFL) via `next/font/google` for the web and `@fontsource/*` WOFF files for the PDF.
- Accepted tradeoff: AI Gateway needs a card on the Vercel account to unlock its free credits; without a key the app still runs end to end (demo mode + manual picker).

## Where It Runs and How Someone Tries It
- Requirements: Node.js ≥ 20, npm.
- Local: `npm install` → `npm run dev` → open http://localhost:3000 → "Try the demo building".
- Live AI (optional): `vercel env pull .env.local` (AI Gateway via OIDC) **or** `AI_GATEWAY_API_KEY=…` **or** `GOOGLE_GENERATIVE_AI_API_KEY=…` in `.env.local`. `RECEIPT_SECRET` signs receipts (any long random string). See `.env.example`.
- Tests: `npm test` (Vitest), `npm run test:e2e` (Playwright, starts the app itself).
- Deploy (chosen): Vercel — `vercel --prod`. Public GitHub repo for the submission. The demo video records the deployed app on a phone.

## Look and Feel
Carried from `prd.md > Look and Feel` (brag-styles doodle kit, BD's choice):
- **Palette:** paper `#f0ede8` with a faint ink grid and grain; ink `#0a0a0a`; lime highlighter `#c8ff00` (primary actions, key words, "verified by code"); **violet** `#6b4eff` (text-safe darker shade) for everything the AI proposes — BD's complementary colour; stamp red for Class C / deadlines and amber for Class B, ink for Class A; pastel tints for sticky notes. Colour is always paired with a word or number.
- **Type:** Archivo 800 for claims, Patrick Hand for handwriting (notes, labels, the AI's voice), JetBrains Mono for numbers, dates, hashes and countdowns.
- **Motion:** strokes draw themselves on appear, highlighter swipes, cards spring in, stamps thud; all disabled under `prefers-reduced-motion`.
- **Density:** one column, generous spacing, big tap targets, one primary action per screen.
- **Copy tone:** plain, warm, direct; never legal advice.
- Built as reusable primitives in `src/components/doodle/` (`SketchBox`, `Highlight`, `Stamp`, `DoodleButton`, `DoodleCard`, `DoodleSheet`, `Chip`, `DrawnIcon`s, `PencilLoader`), previewed at `/kit` during the build.

## Components

### Doodle UI kit
Hand-drawn primitives and design tokens. `src/components/doodle/`, `src/app/globals.css`, `src/app/layout.tsx`.
PRD ref: `prd.md > Look and Feel`.

### Address setup
`AddressSetup` component + `src/lib/geosearch.ts` (`searchAddresses(text)` calls NYC GeoSearch autocomplete straight from the browser — it allows cross-origin GETs — and returns `Address[]`, max 6). Saves the `CaseFile`. "Try the demo building" writes the demo case (flag `demo: true`).
PRD ref: `prd.md > Address setup`.

### Evidence capture
`src/lib/evidence.ts`: `readEvidence(file: File): Promise<{sha256, capturedAt, captureSource, addedAt, photo, width, height, aiImage}>` — EXIF via exifr, SHA-256 via `crypto.subtle.digest`, canvas re-encode (≤1600px stored copy, ≤1024px copy for the AI). Rejects non-images and files > 20 MB with a typed error.
PRD ref: `prd.md > Snap and AI proposal`, `prd.md > Evidence timeline`.

### Receipt service
`POST /api/receipt {sha256}` → `{receivedAt, receipt}` where `receipt` = first 12 hex chars of HMAC-SHA256(`RECEIPT_SECRET`, `sha256|receivedAt`). `GET /api/receipt?sha256&receivedAt&receipt` → `{valid}`. `/verify` page lets anyone check a receipt from a notice.
PRD ref: `prd.md > Evidence timeline`.

### Classifier (AI proposes)
`POST /api/classify {image (data URL ≤1024px JPEG), note?, answer?: {question, answer}, sampleId?}` → `ClassifyResponse`.
- `sampleId` of a demo sample → saved answer from `src/lib/demo/samples.ts` (labelled `source: "demo"`).
- Otherwise: system prompt lists the seven allowed answers with one-line definitions; output schema `{issue: enum, confidence: 0..1, rationale: ≤200 chars, clarifyingQuestion: string|null, clarifyingOptions: string[]}`; temperature 0; one retry; fallback model.
- **Code** applies the threshold (0.7): below it and no `answer` → return the question (the model's, or a default per issue); with an `answer` → return the second proposal whatever its confidence (the UI offers the manual picker when it's still low).
- Input limits: body ≤ 2 MB, image must be `data:image/jpeg|png|webp`, note ≤ 280 chars.
PRD ref: `prd.md > Snap and AI proposal`, `prd.md > States and Boundaries`.

### Rules engine (code disposes)
`src/lib/rules.json` (the cited table) + `src/lib/rules.ts`: `evaluate(issue: ProposalIssue, facts: Facts, ctx: {now: Date, yearBuilt: number | null}): RuleOutcome`, `RULES` export for the rules page. Pure, no I/O, fully unit-tested. See **Rules Table** below.
PRD ref: `prd.md > Rules card and countdown`.

### Countdown
`src/lib/countdown.ts`: `repairByDate(firstDocumented: string, window): string` and `remaining(repairBy, now)` → `{days, hours, minutes, seconds, overdue}`; `formatNY(iso)` renders dates in America/New_York. `Countdown` component ticks every second (paused when the tab is hidden).
PRD ref: `prd.md > Rules card and countdown`.

### Building history
`GET /api/building?bbl=` → `BuildingRecord`. Server queries Socrata `wvxf-dwi5` (open violations for the BBL, newest first) and PLUTO `64uk-42ks` (`yearbuilt`), maps each violation's description to an issue with the keyword table in `src/lib/building.ts`, counts by class and issue, caches for an hour. Demo BBLs fall back to saved fixtures in `src/lib/demo/` if the live call fails. `BuildingPanel` component.
PRD ref: `prd.md > Building history`.

### Case store
`src/lib/store.ts` (idb-keyval): `getCase/saveCase`, `listIssues/getIssue/saveIssue/deleteIssue`, `addFollowUp`, `markFixed`, `clearAll`, `storageAvailable()`. A tiny `useCase()` hook re-reads after writes.
PRD ref: `prd.md > Evidence timeline`, `prd.md > States and Boundaries`.

### Screens
- `/` — `Welcome` (first use) or `CaseFile` (address card, Snap button, `Timeline`, `BuildingPanel`, notice button).
- `SnapSheet` — photo → `PencilLoader` → `ProposalCard` (violet) → `ClarifyQuestion` → `FactQuestions` → `RuleCard` (stamp, window, citation, `Countdown`, "Why?" drawer) → building snippet → "Add to my log". "Not right?" opens `IssuePicker`.
- `/issue/[id]` — `IssueDetail` with evidence block, follow-ups, mark fixed.
- `/notice` — `NoticePreview` + `NoticeDocument` (react-pdf), EN/ES toggle, names, download/share, 311 text.
- `/how-it-works` — diagram, full rules table from `RULES`, countdown meaning, privacy, disclaimer.
- `/verify` — receipt check.
PRD ref: `prd.md > Screens and Layout`.

### Notice
`src/lib/notice-text.ts`: `noticeText(case, issues, lang: "en" | "es")` → structured sections; `complaint311Text(case, issue)`. `src/components/notice/NoticeDocument.tsx` renders the PDF with fonts registered from `/fonts/*.woff`. File name `habitable-notice-<street>-<yyyy-mm-dd>.pdf`.
PRD ref: `prd.md > Notice`.

### Demo mode
`src/lib/demo/`: the demo building (address + BBL + fixtures), `samples.ts` (saved AI answers for each sample photo in `public/samples/`). Every demo surface shows a DEMO chip.
PRD ref: `prd.md > Demo mode`.

## Rules Table
The table lives in `src/lib/rules.json`; every row carries its citation, source URL, a short official quote and a plain-English line. Verified 2026-10-24 against HPD's "Clear Violations" page, HPD's indoor-allergen, heat/hot-water, lead-paint and self-closing-door pages, HPD's CY25 certification report, NYC311 articles, and the enacted texts of Local Law 55 of 2018 and Local Law 86 of 2017. Class counts quoted in notes come from live HPD Open Data rows (inspections since 2025-01-01).

**Clock:** every HPD window runs "from date of service" of an HPD Notice of Violation, never from a tenant photo or letter. The app's countdown is therefore the *requested* repair-by date in the notice, mirroring the window.

| Issue | Fact the rule asks | Outcome | Window | Citation |
|---|---|---|---|---|
| Leak | water actively dripping? yes | Class C | 24 hours | Admin. Code §27-2005(a), §27-2026 (HPD lists "active leaks" as 24-hour C) |
| Leak | no (stain / damage) | Class B | 30 days | §27-2005(a), §27-2026 (80% of leak violations since 2025 are B) |
| Mold | area in one room < 10 sq ft | Class A | 90 days | §27-2017.3(a)(1), Local Law 55 of 2018 |
| Mold | 10–29 sq ft | Class B | 30 days | §27-2017.3(a)(2) |
| Mold | ≥ 30 sq ft | Class C | 21 days | §27-2017.3(a)(4), (c)(2) |
| Pests | mice, cockroaches or rats | Class C | 21 days | §27-2017.4(b), (c) |
| Pests | bedbugs or other | Class B | 30 days | §27-2017.4(a); §27-2018 |
| Heat / hot water | hot water (or both) | Class C | no time (notice asks 24 h) | §27-2031 (≥120°F year-round) |
| Heat / hot water | heat, Oct 1–May 31 (derived from date) | Class C | no time (notice asks 24 h) | §27-2029(a) as amended by LL 86/2017 (68°F day when < 55°F out; 62°F night) |
| Heat / hot water | heat, June 1–Sept 30 | no class — explains heat season | — | §27-2029(a) |
| Lock / door | apartment door can't lock | Class C | 24 hours | §27-2043(a) (HPD lists "defective door locks" as 24-hour C) |
| Lock / door | apartment lock damaged but locks | Class B | 30 days | §27-2043(a), §27-2005(a) |
| Lock / door | building entrance won't lock | Class C | 24 hours | §27-2005(a) |
| Lock / door | door doesn't self-close | Class C | 14 days | HMC §27-2041.1 |
| Peeling paint | built before 1960 (from PLUTO, else asked) + child under 6 | Class C | 21 days | §27-2056.6 (Local Law 1 of 2004) |
| Peeling paint | plaster also broken | Class B | 30 days | §27-2005(a), §27-2013 |
| Peeling paint | paint only | Class A | 90 days | §27-2013 |
| Not covered | — | no class; manual pick or "log as note" | — | — |

Where HPD's inspector assigns the class (leaks, locks, plaster), the card says so and shows the share observed in HPD data. Unverified and therefore not claimed: the exact conditions that make HPD escalate a leak or lock to Class C; whether a tenant's own letter starts any legal clock.

## Data Model
All on the device (IndexedDB via idb-keyval), shapes in `src/lib/types.ts`:
- `case` → `CaseFile` (address, unit, yearBuilt, childUnder6, demo, createdAt, optional names). Written at setup; updated when the paint rule learns about a child under 6 or names are typed on the notice page.
- `issues` → `Issue[]` (evidence incl. stripped photo, proposal, final issue, facts, outcome snapshot, repairBy, followUps, fixedAt). Written on "Add to my log"; updated by follow-ups / mark fixed.
- Leaving and coming back: everything reloads from IndexedDB. "Delete my case" clears both keys.
- Server keeps nothing. Building records are cached by the platform for an hour.

## File Structure
```
.
├── devpost/                    # Devpost learning workspace: scope, prd, spec, checklist, app map
├── .agents/skills/             # Devpost Learn skill pack (MIT)
├── public/
│   ├── samples/                # illustrated demo "photos" (EXIF capture time, no GPS) + manifest.json
│   └── fonts/                  # WOFF fonts embedded in the PDF
├── scripts/render-samples.mjs  # rebuilds the sample photos from scripts/samples/*.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx, globals.css   # fonts, doodle tokens, grid paper
│   │   ├── page.tsx                  # Welcome or CaseFile
│   │   ├── issue/[id]/page.tsx       # one issue
│   │   ├── notice/page.tsx           # notice preview + PDF
│   │   ├── how-it-works/page.tsx     # rules table + diagram
│   │   ├── verify/page.tsx           # receipt check
│   │   ├── manifest.ts, icon.svg     # installable on a phone
│   │   ├── kit/page.tsx              # UI kit showcase (not linked)
│   │   └── api/
│   │       ├── classify/route.ts     # AI proposes
│   │       ├── receipt/route.ts      # sign / verify receipts
│   │       └── building/route.ts     # NYC Open Data
│   ├── components/
│   │   ├── doodle/                   # hand-drawn primitives
│   │   ├── case/                     # Welcome, AddressSetup, CaseFile, Timeline, BuildingPanel
│   │   ├── snap/                     # SnapSheet, ProposalCard, RuleCard, Countdown, pickers
│   │   ├── issue/                    # IssueDetail
│   │   └── notice/                   # NoticePreview, NoticeDocument
│   └── lib/
│       ├── types.ts                  # shared domain types
│       ├── rules.json, rules.ts      # cited table + engine (+ rules.test.ts)
│       ├── countdown.ts              # NY-time deadlines (+ test)
│       ├── building.ts               # violation → issue mapping, summary (+ test)
│       ├── geosearch.ts              # NYC address autocomplete (browser)
│       ├── classify.ts               # prompt, schema, threshold logic (+ test)
│       ├── receipt.ts                # HMAC sign/verify (+ test)
│       ├── evidence.ts               # EXIF, hash, strip metadata
│       ├── store.ts                  # IndexedDB case store
│       ├── notice-text.ts            # EN/ES notice + 311 text (+ test)
│       └── demo/                     # demo building fixtures, saved sample answers
├── e2e/journey.spec.ts         # Playwright: demo journey photo → notice
├── README.md, LICENSE (MIT), THIRD-PARTY-NOTICES.md, .env.example
```

## External Services and Dependencies
- **NYC GeoSearch (Planning Labs, Pelias)** — `GET https://geosearch.planninglabs.nyc/v2/autocomplete?text=<q>&size=6`. No key. BBL at `features[i].properties.addendum.pad.bbl`, BIN at `.pad.bin`, label `properties.label`, borough `properties.borough`, zip `properties.postalcode`, `geometry.coordinates` = [lon, lat]. Don't filter by `layers` (PAD records are `venue`); don't gate on `confidence`; non-NYC text can still match NYC streets, so the renter confirms the label. ~1.6 s. Docs: https://geosearch.planninglabs.nyc/docs/
- **NYC Open Data (Socrata SODA)** — no key needed; optional `X-App-Token` (`SOCRATA_APP_TOKEN`) raises limits. Single-BBL queries 1.5–3 s; always `$select` + `$limit`. Docs: https://dev.socrata.com/docs/queries/
  - HPD violations `wvxf-dwi5`: `GET https://data.cityofnewyork.us/resource/wvxf-dwi5.json?$where=bbl='<bbl>' AND violationstatus='Open'&$select=violationid,class,inspectiondate,novissueddate,originalcorrectbydate,currentstatus,novdescription&$order=inspectiondate DESC&$limit=1000` (`bbl` is TEXT → quoted; "open" = `violationstatus='Open'`, not `currentstatus`). Counts by class: `$select=class,count(*) as n&$group=class`. https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5
  - PLUTO `64uk-42ks`: `GET …/64uk-42ks.json?$where=bbl=<bbl>&$select=bbl,yearbuilt,unitsres` (`bbl` is a NUMBER → unquoted). https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks
  - Violation → issue mapping (first match wins, case-insensitive): mold `27-2017.3` or the word MOLD (never "MOLDING"); pests `27-2017.4`, "INFESTATION CONSISTING OF", MICE, ROACHES, RATS, BEDBUGS (drop "FILE ANNUAL BEDBUG REPORT"); heat `27-2029`, `27-2031`, "SUPPLY OF HEAT", "HOT WATER" (drop boiler-room rows); lock/door LOCK, LATCH, DEAD BOLT, `27-2043` (not `27-2043.1`), SELF-CLOSING (drop BOILER, signage, WINDOW GUARD); paint `27-2056`, LEAD-BASED PAINT, PEELING PAINT, "PLASTERED SURFACES AND PAINT", word PAINT (never bare "LEAD"); leak "WATER LEAK", LEAK, DAMPNESS, MOISTURE, SEEPAGE (never bare "WATER").
- **Vercel AI Gateway** — model ids `anthropic/claude-haiku-5.5` (vision, structured output; $0.10/$0.50 per M tokens) then `google/gemini-2.5-flash`. Auth: OIDC on Vercel / `vercel env pull`, or `AI_GATEWAY_API_KEY`. Requires a card on the Vercel account to unlock free credits. https://vercel.com/docs/ai-gateway
- **Google Gemini API (optional)** — `GOOGLE_GENERATIVE_AI_API_KEY`, model `gemini-2.5-flash` via `@ai-sdk/google`. https://ai.google.dev/gemini-api/docs
- **Vercel** — hosting (Hobby, free). https://vercel.com/docs
- **NYC 311 articles** (links only, no API): KA-01074 apartment maintenance, KA-02262 mold, KA-02278 pests, KA-01036 heat/hot water, KA-02134 lead paint — `https://portal.311.nyc.gov/article/?kanumber=<id>`.
- **Demo buildings** (public building records only): 618 West 136th Street, Manhattan (BBL 1020020091, built 1905, 291 open violations, 37 leak-related); fixtures in `src/lib/demo/`.

## Important Failure Modes
- **AI unavailable (no key, quota, outage, timeout 20 s)** → manual picker: "The AI couldn't read this photo right now. Pick what it is — the rules still apply."
- **NYC Open Data slow, down or no match** → "Building records are unavailable right now" + retry; demo building uses saved fixtures; no records → "No open HPD violations on record."
- **IndexedDB unavailable** → banner "This browser may not keep your log after you close it"; the session continues in memory.

## What Was Simplified and Why
- **On-device storage** instead of accounts + database — the kernel needs neither; also the privacy story. Fuller version: hosted Postgres + auth for organizer sharing.
- **Illustrated sample scenes** instead of real demo photos — no licensing risk and no private photos in a public repo; real photos still work live. The video uses BD's real photos.
- **Saved AI answers for samples** instead of a live call in demo mode — the demo never depends on a quota.
- **Receipt = HMAC over the hash and time** instead of a timestamping authority — proves Habitable's server saw the fingerprint then; a fuller version would anchor to an RFC 3161 timestamp service.
- **One city, six problem types** — keeps every rule citable.

## Decisions and Open Issues
- **Model choice** (implementation detail): Claude Haiku 5.5 through AI Gateway with Gemini Flash fallback; direct Gemini key also supported. Temperature 0, one retry.
- **Confidence threshold 0.7** (implementation detail), tuned on the sample photos.
- **Learner uncertainty discussed:** when does the legal clock start? Resolved from HPD's own page: correction periods run from HPD's service of a violation, so the countdown is labelled as the repair-by date the notice requests, mirroring that window.
- Resolved by research: mold area thresholds (Local Law 55), pests split B/C, self-closing doors are §27-2041.1 (not 2041/2042), ordinary peeling paint is Class A, night heat is 62°F regardless of outside temperature. Still unverified (and not claimed): what makes HPD escalate a leak or lock to Class C; whether a tenant letter starts any clock.
- Carried from `prd.md > Open Questions`: both resolved above.
