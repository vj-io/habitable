# Habitable — 2-minute Devpost demo: storyboard and voiceover

**Length:** 2:04 (124 s), landscape 1920×1080, 30 fps.
**What it shows:** the live app at https://habitable-blush.vercel.app, recorded on 2026-10-25 at iPhone size (390×844, 3× pixels), with a cursor operating the real interface inside a phone frame. It uses the project's own doodle look: grid paper, felt-tip marker, violet for anything the AI proposes.
**Focus:** most of the running time goes to the three new features: the **landlord track record**, **Ask the law** (code-checked quotes) and the **message coach**.
**Rendered with:** brag (brag-slim on Opus 5.5) plus motion-kit's demo player, narrate (Kokoro `af_heart`, offline), soundkit (code-made lo-fi bed, ducked under the voice) and fast-render. The files are in `brag-output-2026-10-25-123827/` (git-ignored); `work/` holds the recording plan, the player and the timings, so any scene can be re-cut.

> **Narration authorship.** You asked for this voiceover script, so it is written in full. The Devpost Learn skill pack's ship step says the learner should present the demo in their own words, and Devpost's text fields must be human-written. Before you submit, read the script aloud and reword anything that isn't how you would say it. You can record your own voice over the same cut: `work/score.wav` is the music on its own, and `work/timings.json` gives every line's start time.

## Structure

| Time | Chapter | Feature |
|---|---|---|
| 0:00–0:09 | Hook | The scale of the problem |
| 0:09–0:38 | Snap → AI proposes → code disposes | The core flow |
| 0:38–1:06 | **Landlord track record** | New: 7 NYC Open Data sets, owner's whole portfolio |
| 1:06–1:26 | **Ask the law** | New: local BM25 over verbatim law, quotes checked by code |
| 1:26–1:45 | **Message coach** | New: AI words, code-owned facts |
| 1:45–1:56 | Heat log · notice · dark mode | Supporting features |
| 1:56–2:04 | End card | Call to action |

## Storyboard and voiceover

On-screen captions use the app's own words. Subtitles of the voiceover are burned in beside the phone (spelled-out numbers in the voice are shown as figures).

| Start | Screen and action (phone, live site) | On-screen caption | Voiceover |
|---|---|---|---|
| 0:00 | Hook card: a number counts up to **2,650,958**, a marker underline draws beneath it, source line "NYC Open Data · HPD violations · Oct 25, 2026" | open housing violations in New York City | New York City has more than two and a half million open housing violations. |
| 0:05 | The second line lands with a highlighter swipe; the card pushes in | Every one started with a renter writing it down. | Every one of them started with a renter writing something down. |
| 0:09 | Phone rises in. Welcome screen; the cursor points at "The AI only names the problem…" | Your repair problem, on the record. | Habitable is that record, on your phone. |
| 0:12 | Tap **Just looking? Try the demo building** → case file for 618 West 136th Street | A real Harlem building, public HPD record | Snap the leak. It's fingerprinted, dated from the photo itself, and its location is stripped. |
| 0:15 | Tap **Snap a problem** → the sheet opens | Snap the problem | (continues) |
| 0:18 | Tap the **ceiling stain** sample → the evidence list (fingerprint, EXIF time, server receipt, location removed) | Fingerprinted, dated, location removed | (continues) |
| 0:20 | The AI proposal card in violet: Leak / water damage, 93%, "pencil · you can fix it" | The AI proposes: leak, 93% sure | The AI proposes what it sees: a leak, ninety-three percent sure. |
| 0:25 | Tap **Yes, that's it** → "Is water actively dripping or flowing right now?" | The rule asks what photos can't show | Then code takes over. A cited rules table asks the one fact a photo can't show, and stamps the class: B, thirty days. |
| 0:30 | Tap **No, it's a stain or damage** → the CLASS B stamp thuds, 30-day window, countdown | Class B · 30-day correction window | (continues) |
| 0:34 | Tap **Add to my log** → the dated timeline | On a dated timeline, with a countdown | The AI never decides a class or a deadline. |
| 0:37 | Scroll to the building panel's **This landlord's buildings** block | This landlord's buildings | Now the bigger question. Is it this building, or this landlord? |
| 0:42 | Tap **See the landlord's record** → /landlord: "4 buildings · 84 apartments · 948 open violations" | 4 buildings · 948 open violations | Habitable follows the HPD registration across seven city datasets: four buildings, nine hundred forty-eight open violations. |
| 0:52 | The cursor points at **17.8×** and the hand-drawn bars (940.5 against 52.9 per 100 apartments) | 17.8× the NYC rate per apartment | That's nearly eighteen times the city's rate per apartment. |
| 0:55 | Scroll to **Most open Class C violations** (234-240 West 135 Street: 140) | Most open Class C violations | The worst building has a hundred and forty open Class C violations, and tenants made ninety-four heat complaints to three one one last heating season. |
| 1:01 | Scroll to **Also on the record**: 94 heat complaints to 311, 56 litigation cases, 3 of 4 buildings in AEP | 94 heat complaints to 311 last season | (continues) |
| 1:06 | /ask: the question box and example chips | Ask in your own words | Renters have questions the law already answers. |
| 1:09 | Tap **How cold is too cold at night?** → live AI answer (violet sentences) | The AI may only answer in quotes | Ask the law searches the housing code's own text, inside the app. |
| 1:14 | The answer: each sentence followed by its quote in marker and a **QUOTE CHECKED** stamp linking to §27-2029(a) | Every quote checked word for word | The AI may only answer in quotes, and code checks every quote, word for word, against the law. |
| 1:21 | Tap **Back to your case file** | Sentences whose quotes don't match are dropped | A sentence whose quote isn't in the text never reaches the screen. |
| 1:25 | Open the logged leak → issue page | Each issue: evidence, rule, next step | Most people text their super first. |
| 1:28 | Scroll to **Draft a message to your landlord or super** (Text · Email · Call script, tone, EN/ES) | Draft a message to your super | The coach drafts a text, an email or a call script for the exact hazard class. |
| 1:34 | Tap **Write my message** → live AI draft: the AI's words in violet pencil, every fact in marker, "FACTS FROM YOUR LOG" stamp | AI words in pencil, facts from your log | The AI writes the words in pencil. Every date, class and address is filled in by code. |
| 1:40 | Tap **Call script**, then **Write my message** → bullet call script for a Class B leak | A call script for the exact hazard class | A draft with an invented date is thrown out, so the facts are always yours. |
| 1:45 | /heat → **Add sample readings** → stamps "BELOW LEGAL MINIMUM 62°F / 68°F" | Each reading checked against NYC's minimums | Plus a heat log checked against the city's minimums, and a notice addressed to the managing agent, in English or Spanish. |
| 1:50 | /notice: "Send it to" prefilled with the managing agent from HPD's registration; tap **ES** | Addressed to the managing agent · English or Spanish, print-ready PDF | (continues) |
| 1:56 | Tap the theme toggle → night-notebook dark mode | Light or dark — and it works offline | Habitable. Your repair problem, on the record. |
| 2:00 | End card: "Your repair problem, on the record." · For NYC renters · free · no account · not legal advice · **habitable-blush.vercel.app** | | (music resolves) |

## Every claim, and where it comes from

| Claim | Source |
|---|---|
| 2,650,958 open violations (A+B+C) | NYC Open Data `wvxf-dwi5`, `violationstatus='Open'`, queried 2026-10-25 (also in the README) |
| Fingerprinted, dated from the photo, location stripped | `src/lib/evidence.ts`: SHA-256, EXIF capture time, canvas re-encode drops GPS |
| 93% leak | The demo sample's saved answer (`src/lib/demo/samples.ts`), labelled DEMO in the app |
| Class B, 30 days | `src/lib/rules.json`, leak not actively dripping |
| Seven city datasets | `src/lib/portfolio.ts`: registrations `tesw-yqqr`, contacts `feu5-w2e2`, violations `wvxf-dwi5`, PLUTO `64uk-42ks`, 311 `erm2-nwe9`, litigations `59kj-x8nc`, AEP `hcir-3275` |
| 4 buildings, 948 open violations, 17.8×, 140 Class C, 94 heat complaints | The demo landlord snapshot `src/lib/demo/fixtures/1020020091-landlord.json`, read live 2026-10-25. The city rate is 1,974,942 open B+C ÷ 3,736,645 PLUTO units |
| Searches the housing code's own text; quotes checked word for word; unmatched sentences dropped | `src/lib/law/` (65 verbatim passages from the city's April 2026 compilation and HPD pages; BM25 retrieval; `verify.ts`) |
| Every date, class and address filled in by code; an invented date is thrown out | `src/lib/coach.ts` (`validateDraft`: digits, placeholders, banned phrases, length; template fallback) |
| Heat minimums | `src/lib/heat.ts` (Admin Code §27-2029, §27-2031) |
| Notice addressed to the managing agent | HPD registration contact type `Agent` |
| Works offline | `public/sw.js` (once the app has loaded on that phone) |

## Recording notes

- The two live-AI moments, Ask the law at 1:09 and the coach at 1:34, are real Gemini answers from production. Re-recording can produce different wording; the captions and voiceover only describe what is always true.
- To re-cut:
  1. `walk.py record plan.json --out demo` (in `work/`) re-records the tour.
  2. `python3 sync.py` re-fits each step to its voice line.
  3. `fastrender.py video.html --out ../brag.mp4 --audio final.wav` re-renders.
- Before the render, the activity audit (`fastrender.py --audit`) flagged nothing except the held end card.
