---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Snap a sample photo and watch it become a stamped legal clock**
  Becomes usable: In demo mode, pick a sample photo; the AI proposal (saved answer) appears in violet, any fact the rule needs is asked, then the rules card stamps the class, window, citation and a live countdown, with a "Why?" drawer.
  Why now: This is the kernel (AI proposes, code disposes). Scaffold, doodle kit, the cited rules table and the engine all land here so every later slice builds on the part a reviewer will remember.
  PRD ref: `prd.md > The Core Journey` (steps 3–5), `prd.md > Rules card and countdown`, `prd.md > Demo mode`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Doodle UI kit`, `spec.md > Rules engine (code disposes)`, `spec.md > Rules Table`, `spec.md > Countdown`, `spec.md > Demo mode`
  Build: Scaffold Next.js; doodle tokens and primitives; sample scenes with EXIF; `rules.json` + `rules.ts` + tests; `countdown.ts` + tests; demo answers; SnapSheet with ProposalCard, FactQuestions, RuleCard, Countdown, IssuePicker.
  Verify (mechanical): `npm test` passes rules and countdown suites; `npm run build` passes; Playwright screenshot of the rules card for the leak sample shows "CLASS B" and a ticking countdown.
  Learner check: Open the app, try the demo, snap the ceiling-leak sample, and say whether the stamp moment feels like the wow beat you pictured.
  Commit: `Slice 1: sample photo to stamped rules card (kernel)`

- [x] **2. Your own photo becomes evidence and gets a live AI proposal**
  Becomes usable: Take or pick any photo; Habitable reads its capture time, fingerprints it, strips location, gets a server receipt, and asks the AI for a proposal — with one clarifying question when unsure, and a manual picker when the AI is unavailable or wrong.
  Why now: The live AI call and the evidence chain are the riskiest parts (quota, EXIF reliability); finding problems right after the kernel is cheap.
  PRD ref: `prd.md > Snap and AI proposal`, `prd.md > Evidence timeline`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Evidence capture`, `spec.md > Receipt service`, `spec.md > Classifier (AI proposes)`
  Build: `evidence.ts`; `/api/receipt` + `receipt.ts`; `/api/classify` + `classify.ts` (schema, threshold, demo cache, fallback); clarifying question + unavailable states in the SnapSheet.
  Verify (mechanical): Vitest for receipt sign/verify and classify threshold logic (with a mock model); curl `/api/classify` without a key returns `{status:"unavailable"}`; Playwright uploads a sample file and sees the capture time from EXIF.
  Learner check: Snap something in your apartment on your phone and check the capture time and fingerprint look right.
  Commit: `Slice 2: evidence chain, receipts and live AI proposal`

- [x] **3. Your case is saved: address, timeline, follow-ups**
  Becomes usable: Set up an address (NYC suggestions) and unit once; every snapped issue lands on a dated timeline that survives closing the browser; open an issue to add follow-ups or mark it fixed; delete the case.
  Why now: The log is what turns one classification into a record; it needs the evidence shape from slice 2.
  PRD ref: `prd.md > Address setup`, `prd.md > Evidence timeline`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Address setup`, `spec.md > Case store`, `spec.md > Screens`
  Build: `geosearch.ts`; `store.ts`; Welcome, AddressSetup, CaseFile, Timeline, IssueDetail; empty and storage-unavailable states.
  Verify (mechanical): Playwright: set up the demo building, add two issues, reload, both are still listed; add a follow-up and see "day N".
  Learner check: Set up your own address, log an issue, close the tab, reopen — is everything there?
  Commit: `Slice 3: case setup, timeline and follow-ups`

- [x] **4. The building's public record slides in**
  Becomes usable: The case file and each rules card show the building's open HPD violations, by class and for this issue's category, with recent examples and a source link.
  Why now: The second wow; depends on the BBL from slice 3.
  PRD ref: `prd.md > Building history`
  Spec ref: `spec.md > Building history`, `spec.md > External Services and Dependencies`
  Build: `building.ts` + tests; `/api/building` with PLUTO year built and fixture fallback; BuildingPanel.
  Verify (mechanical): Vitest for keyword mapping and counts; curl `/api/building?bbl=<demo>` returns counts matching the fixture; unavailable state renders when the fetch fails.
  Learner check: Look up your own building and see whether the numbers match what you'd expect.
  Commit: `Slice 4: building history from NYC Open Data`

- [x] **5. One tap makes the notice**
  Becomes usable: A print-ready PDF notice (English or Spanish) with every open issue, its dates, photo, fingerprint, citation and requested repair-by date; download, share, copy 311 text.
  Why now: The finished artifact closes the loop; it needs everything above.
  PRD ref: `prd.md > Notice`
  Spec ref: `spec.md > Notice`
  Build: `notice-text.ts` + tests; NoticeDocument with embedded fonts; `/notice` page with toggle, names, download, share, 311 text.
  Verify (mechanical): Vitest for EN/ES text and 311 text; Playwright downloads the PDF and checks it is a non-empty `%PDF` file whose text contains the address and "Class B".
  Learner check: Generate the notice for your demo case and read it as if you were the landlord.
  Commit: `Slice 5: notice PDF, Spanish toggle and 311 text`

- [x] **6. Ready for judges: trust pages, install, deploy**
  Becomes usable: How-it-works page with the full cited rules table, receipt verify page, installable PWA, polished error states, README and licenses, live on Vercel.
  Why now: Packaging only makes sense once the journey works end to end.
  PRD ref: `prd.md > Trust and safety copy`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Screens`, `spec.md > Where It Runs and How Someone Tries It`
  Build: `/how-it-works`, `/verify`, manifest + icons, README, LICENSE, THIRD-PARTY-NOTICES, `.env.example`, full Playwright journey, deploy.
  Verify (mechanical): `npm test`, `npm run test:e2e`, `npm run build` all pass; deployed URL returns 200 for `/`, `/how-it-works`, `/api/building?bbl=<demo>`.
  Learner check: Open the live URL on your phone, add it to your home screen, and run the whole journey.
  Commit: `Slice 6: trust pages, PWA, docs and deploy`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1 (the kernel). Pending BD: the build ran end to end on BD's instruction; agent-side checks were Playwright walk-throughs and screenshots, which don't replace BD trying it.
- [ ] Final kick-the-tires exploration and feedback completed — pending BD on the live URL (https://habitable-blush.vercel.app) on a phone.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not yet done with BD; `devpost/app-map.html` prepared from the finished code as a reference.
Route and stops: reference route in the app map (snap sheet → `decide()` → `evaluate()`); not toured.
Edit outcome: not applicable yet.
Reflection: not offered yet.
Activity mode: pending.

## Revisions

- Slices were built in parallel by subagents and committed per slice after integration checks — the plan's order held, but intermediate commits were not each built on their own.
- Address search calls NYC GeoSearch from the browser instead of an `/api/geosearch` proxy — GeoSearch allows cross-origin GETs, so the proxy would only add latency.
- The rules table changed after research: pests split B (bedbugs/other) / C (mice, roaches, rats); ordinary peeling paint is Class A (B only with plaster damage); self-closing doors are HMC §27-2041.1 (the brief's §27-2041/2042 were peepholes and elevator mirrors); night heat is 62°F regardless of outside temperature (Local Law 86 of 2017).
- Locks are split by "can the door lock at all" — HPD data shows apartment-lock violations divided between B and C, and HPD lists defective door locks among 24-hour Class C examples.
- Where HPD's inspector assigns the class (leaks, locks, plaster), the card and notice say so and show HPD's observed class split, instead of presenting one class as certain.
- EXIF capture times without an offset are read as New York time — exifr revives them in the viewer's timezone, which shifted evidence by the viewer's offset.
- The countdown starts when the photo is added, not when "Add to my log" is tapped.
- Vercel AI Gateway needs a card on file, so live AI uses a Gemini key: `gemini-2.5-flash` is closed to new keys and `gemini-3.8-flash` took > 30 s, so Gemini 3.5 Flash (thinking off) leads with 3.5 Flash-Lite as fallback.
- Gemini free-tier limits shaped the classifier: no retries inside a model, per-model cooldown from the provider's retry delay, a one-hour cache for identical requests, per-visitor and per-instance caps, and a 768 px AI image.
- Review fixes: production refuses to sign receipts without `RECEIPT_SECRET` (a missing secret would have let anyone forge receipts); client timeouts on every request; the notice links each photo to its receipt check.

