---
doc: prd
status: approved
---

# Habitable — Product Requirements

A phone-first web app that turns a NYC renter's photo of a repair problem into a dated, housing-code-classified evidence log and a ready-to-send repair notice.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. **Arrive.** The renter opens Habitable on their phone. The first screen says what it does in one line, shows the three-step promise (snap → code class → notice), a "Not legal advice" note, and two ways in: enter your address, or try the demo building.
2. **Set up once (~20 s).** They type their street address; suggestions appear as they type and they pick one. They add their unit. Habitable confirms the building (borough, the city's tax-lot number, year built) and saves it on the device.
3. **Snap.** On the case file they tap the big "Snap a problem" button. The phone camera opens (or they pick a photo). They can add one optional line ("ceiling dripping since Tuesday").
4. **The AI proposes.** While the photo is read, a hand-drawn "reading the photo…" animation plays. The AI's proposal appears in violet "pencil": the problem type, how sure it is, and one sentence of why. If it isn't sure, it asks one clarifying question instead (e.g., "Is water actively dripping?") and proposes again after the answer. The renter can always correct the pick.
5. **The code disposes.** The rules card stamps in: hazard class (e.g., "CLASS B · HAZARDOUS"), the correction window, the cited code section, and a live countdown to the requested repair-by date. If the rule depends on a fact the photo can't show (mold size, a child under 6, heat vs. hot water), the card asks for that fact first. A "Why?" drawer shows the exact rule row and source link and says plainly: the model picked the problem type; this table picked the class.
6. **Building context.** A panel slides in with the building's public record: "This building already has N open HPD violations, M for leaks," with the most recent related ones.
7. **Log.** Saving adds the issue to a dated timeline: photo, capture time, time received, a content fingerprint, and follow-ups ("still broken on day 12").
8. **Notice.** One tap builds a print-ready notice PDF listing every open issue with dates, photos, cited obligations and requested repair-by dates. They download or share it, and can copy pre-filled 311 complaint text.
**Success:** a stranger can go from photo to downloaded notice in under two minutes, and every class and deadline on screen traces to a cited rule.

## Screens and Layout
Mobile-first single column (375px and up); on desktop the same column sits centred on the grid paper with the building panel beside the timeline.
- **Welcome / setup** — headline, three-step doodle strip, address + unit form, "Try the demo building" link, disclaimer.
- **Case file (home after setup)** — address card at top; giant "Snap a problem" button; timeline of issues (newest first); building panel; "Make the notice" button once there's at least one issue.
- **Snap sheet** — full-height sheet over the case file: photo → AI proposal → clarifying question or rule facts → rules card → building panel → "Add to my log".
- **Issue page** — one issue in full: photo, evidence block, rules card with countdown, follow-ups, "Add follow-up", "Mark fixed".
- **Notice page** — on-screen preview of the notice, English/Spanish toggle, optional landlord name and tenant name fields, "Download PDF", "Share", "Copy 311 text", link to 311.
- **How it works / rules page** — the "AI proposes, code disposes" diagram, the full rules table with sources, what the countdown means, privacy, disclaimer.

## Look and Feel
- **Style:** the brag-styles **doodle** kit, chosen by the builder — a hand-drawn notebook come alive. Grid paper background (warm off-white paper, faint ink grid), black ink lines that look drawn by hand, cards that spring in.
- **Colour** (revised after the first build: the lime became a sunflower marker in a felt-tip set, and a dark theme was added — see the checklist's Revisions): ink black on paper; **lime highlighter** as the main accent (key words, the primary button, things the code verified). The builder asked for one additional complementary colour: **violet "pencil"** for everything the AI proposes (tentative, correctable). A **stamp red** is reserved for hazard stamps and deadlines. Pastel sticky-note tints of those colours for backgrounds. Every colour is always paired with a word or number.
- **Type:** a heavy bold sans for headlines and claims; a handwriting face for notes, labels and the AI's voice; a monospace for numbers, dates, hashes and countdowns.
- **Signature move in the UI:** strokes draw themselves when something appears (the box around the rules card, check marks, arrows), a highlighter swipes under the key word, and the hazard stamp thuds down. Motion is skipped for people who prefer reduced motion.
- **Tone of copy:** plain, warm, direct, a little wry. Never alarmist, never legal-sounding advice.
- **Avoid:** default component-library look, glossy gradients, clip-art, stock illustrations.

## Features and Behavior

### Address setup
- As a NYC renter, I want to enter my address once so that every issue and the notice use it.
  - [ ] Typing 3+ characters shows NYC address suggestions; picking one shows borough, tax-lot number (BBL) and year built.
  - [ ] Unit is required before continuing; the case is remembered after closing the browser.
  - [ ] A non-NYC or unknown address shows "We couldn't find that NYC address" and keeps the form.
  - [ ] "Try the demo building" fills in a real NYC building with a public violation record, clearly labelled DEMO.

### Snap and AI proposal
- As a renter, I want to photograph the problem and get a proposed problem type so that I don't have to know the legal category.
  - [ ] On a phone, the button opens the rear camera; on desktop it opens a file picker; sample photos are offered in demo mode.
  - [ ] The proposal shows exactly one of: Leak / water damage, Mold, No heat / hot water, Pests, Broken lock / door, Peeling paint, or "Not something Habitable covers".
  - [ ] It shows a confidence percentage and a one-sentence reason in handwriting/violet.
  - [ ] Below a confidence threshold it asks one clarifying question; after the answer it proposes again (at most one question per photo).
  - [ ] "Not right?" lets the renter pick the type themselves; the rules card updates instantly.
  - [ ] A non-image file or a photo that can't be read shows a plain message and lets them try again.

### Rules card and countdown
- As a renter, I want to see the hazard class, the legal window and its source so that I know what the law requires and can prove it.
  - [ ] The card shows a stamped class (A Non-hazardous / B Hazardous / C Immediately hazardous), the correction window, the cited code section and a live countdown (days, hours, minutes, seconds) to the requested repair-by date.
  - [ ] When the rule needs a fact (mold area, child under 6 in a pre-1960 building, heat vs. hot water, heat season), the card asks for it with plain options before stamping.
  - [ ] "Why?" shows the rule row, the source link and the sentence "The AI picked the problem type. This table — not the AI — set the class and window."
  - [ ] The countdown is labelled honestly: the legal window starts when HPD issues a violation; the countdown is to the repair-by date the notice requests, which mirrors that window.
  - [ ] Heat outside Oct 1–May 31 explains the heat season instead of stamping a class (hot water applies year-round).

### Building history
- As a renter, I want to see my building's record so that I know whether the problem is systemic.
  - [ ] Shows the count of open HPD violations, the count by class, and the count matching this issue's category.
  - [ ] Lists up to five most recent related violations with date, class and short description, and links to the public source.
  - [ ] No records → "No open HPD violations on record for this building." Unavailable → "Building records are unavailable right now" with retry; the rest of the flow still works.

### Evidence timeline
- As a renter, I want each issue logged with dates and proof so that my record is harder to dispute than a camera roll.
  - [ ] Each entry shows photo, problem type, class stamp, first documented date, "day N" counter, and the countdown.
  - [ ] Evidence block: photo capture time (from the photo itself, or "not in photo — time added used instead"), time received by Habitable's server, the photo's SHA-256 fingerprint, and a short receipt code.
  - [ ] Follow-ups can be added (note, optional photo) and appear dated under the issue; "Mark fixed" stops the countdown and records the date.
  - [ ] Location data in photos is removed from the stored copy.
  - [ ] The log persists on this device across visits; "Delete my case" removes everything after a confirmation.

### Notice
- As a renter, I want a dated notice I can send so that my landlord has a written, specific repair request.
  - [ ] The PDF includes date, tenant address and unit, optional names, each open issue (type, class, first documented, follow-up count, cited code section, requested repair-by date, photo, fingerprint) and a closing request.
  - [ ] English/Spanish toggle changes the notice text.
  - [ ] "Download PDF" saves a file named with the address and date; "Share" uses the phone's share sheet where available.
  - [ ] "Copy 311 text" copies a pre-filled complaint description; a link opens NYC 311.
  - [ ] Footer: "Prepared with Habitable. Not legal advice."

### Demo mode
- As a judge or first-time visitor, I want to try the full journey without an account or API key so that it never fails on stage.
  - [ ] Demo building plus sample photos for each problem type and one ambiguous photo; their AI answers come from saved responses.
  - [ ] Everything on screen in demo mode is labelled DEMO / sample.

### Trust and safety copy
- [ ] "Not legal advice" on the welcome screen, the rules card drawer and the notice; a "What to do next" link to 311/HPD.
- [ ] The app never suggests withholding rent.

## States and Boundaries
- **First use** — welcome + setup; no case file until an address and unit exist.
- **Empty case file** — a doodled arrow points at "Snap a problem": "Nothing logged yet. Start with the thing that's bothering you most."
- **Classifying** — drawing animation; the button can't be pressed twice.
- **Low confidence** — one clarifying question, then a second proposal; if still unsure, the manual picker.
- **AI unavailable** (no key, quota, outage) — "The AI couldn't read this photo right now. Pick what it is — the rules still apply." The rest of the flow continues.
- **Not covered** — explains the six conditions; offers the manual picker or "Log it anyway" as a general note with no class.
- **No capture time in photo** — says so and uses the time added.
- **Building records unavailable / none** — as above; flow continues.
- **Storage unavailable** (some private-browsing modes) — banner: "This browser may not keep your log after you close it."
- **What persists** — address, unit, child-under-6 answer, issues, follow-ups, photos (location removed): on this device only.
- **Who can see it** — only this device. Nothing is shared unless the renter downloads or shares the notice.

## Product Decisions
- **The model only picks from a fixed list; a rules table decides class and window.** — trust and verifiability; the core of the idea.
- **Countdown = requested repair-by date mirroring the legal window**, labelled as such — the legal clock runs from HPD's service of a violation, not the photo (the builder's brief flagged this).
- **NYC only, six problem types** — keeps the legal table small enough to cite accurately.
- **No accounts; on-device storage** — privacy and proof-of-concept size.
- **Seeded demo mode** — the video and judges never depend on a live AI call.
- **Doodle style + violet complementary colour** — the builder's choice; violet marks what the AI proposes, lime marks what the code verified.
- **Facts the rules need are asked by the rules, not guessed by the AI** — mold size, child under 6, heat vs. hot water.
- **Spanish notice toggle and 311 text are in** — small, high-value for the audience. **Email is out** (cut order item 1 in the brief).

## What We're Building
Everything under **Features and Behavior**: address setup, snap + AI proposal (with clarifying question and manual correction), rules card with countdown and "why" drawer, building history, evidence timeline with follow-ups, notice PDF (EN/ES, download, share, 311 text), demo mode, how-it-works/rules page, trust copy, installable on a phone home screen.

## Deferred From the POC
- **Email sending** — needs a verified domain; download/share covers it.
- **Shareable evidence link for an organizer** — needs hosted storage and access control.
- **Multi-unit / tenant-association view** — needs accounts and shared data.
- **Other cities** — each needs its own cited rules table.
- **Automatic 311 filing** — no public filing API.

## Possible Later Enhancements
- Organizer dashboard aggregating issues across units in one building.
- Reminder when a requested repair-by date passes.
- Translations beyond Spanish.

## Non-Goals
- Legal advice, rent-withholding guidance, or predicting case outcomes — liability; the app documents and cites.
- A chatbot — the value is the chained evidence flow, not conversation.
- Deciding the law with AI — the model never sets class or deadline.
- Accounts, cloud sync, social features — not needed to prove the kernel.

## Open Questions
- Exact HPD class for apartment-door locks and for general peeling paint — resolved in `spec.md > Rules Table`.
- Mold area thresholds under Local Law 55 — resolved in `spec.md > Rules Table`.
