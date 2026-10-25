# Habitable: Devpost demo storyboard and voiceover

**Length:** 1:59, landscape 1920×1080, 30 fps. That is inside the rules' 1–3 minute window ("less than three minutes").
**What it shows:** the live app at https://habitable-blush.vercel.app, recorded on 2026-10-25 at iPhone size (390×844, 3× pixels), with a cursor operating the real interface inside a phone frame. The look is the project's own doodle style.
**Built for the judges' Will It Ship checklist:**
- The app is on screen within 4 s, and the first line says what it does and who it's for.
- The newer features are walked through.
- The last chapter shows how it was built with the Devpost Learn skill pack.

**Rendered with:**
- brag (brag-slim on Opus 5.5) and motion-kit's demo player;
- narrate (Kokoro `af_heart`, offline);
- soundkit (code-made lo-fi, ducked under the voice);
- fast-render.

**Files:** `brag-output-2026-10-25-160135/` (git-ignored). `work/` holds the recording plan, the player and the timings.

> **Before you submit — your voice, your words.** The skill pack's ship step says the learner presents the demo in their own words. This voiceover was drafted for you on request and read by a synthetic voice. Rewrite any line that isn't how you'd say it, then record yourself over the same cut:
> - `work/score.wav` is the music alone.
> - `work/timings.json` gives each line's start time.
> - `work/sync3.py` re-fits the scenes if your lines run longer.
>
> Devpost requires the video to be **public on YouTube or Vimeo**.

## Structure

| Time | Chapter |
|---|---|
| 0:00–0:28 | What it is, then snap → AI proposes → code disposes (Class C, 24 h) |
| 0:28–0:57 | Timeline → building record → **landlord track record** |
| 0:57–1:14 | **Ask the law**: answers only in code-checked quotes |
| 1:14–1:27 | **Message coach**: the AI's words, the code's facts |
| 1:27–1:41 | Heat log · notice to the managing agent, EN/ES · dark mode |
| 1:41–1:54 | **How it was built**: the skill pack's scope → PRD → spec, cited rules, revisions |
| 1:54–1:59 | End card |

## Storyboard and voiceover

On-screen captions use the app's own words. The voiceover is burned in as subtitles beside the phone.

| Start | Screen and action (live site, phone) | Caption | Voiceover |
|---|---|---|---|
| 0:00 | Title card: **Habitable** · "Your repair problem, on the record — for NYC renters." · habitable-blush.vercel.app · free · no account | | Habitable puts a New York renter's repair problem on the record, straight from their phone. |
| 0:02 | Phone rises: welcome screen; the cursor points at "The AI only names the problem…" | Your repair problem, on the record. | (continues) |
| 0:05 | Tap **Just looking? Try the demo building** → case file | A real Harlem building, public HPD record | Try the demo building and snap the leak. The photo is fingerprinted, dated from its own data, and its location is stripped. |
| 0:09 | Tap **Snap a problem** | Snap the problem | (continues) |
| 0:11 | Tap the **ceiling stain with drips** sample → the evidence list | Fingerprinted, dated, location removed | (continues) |
| 0:14 | The AI proposal in violet pencil: Leak / water damage, 93% | The AI proposes: leak, 93% sure | The AI proposes what it sees: a leak, ninety-three percent sure. |
| 0:18 | Tap **Yes, that's it** → "Is water actively dripping or flowing right now?" | The rule asks what photos can't show | Then code takes over. The rules table asks the one fact a photo can't show. Water is dripping, so it stamps Class C: twenty-four hours. |
| 0:23 | Tap **Yes, it's dripping or flowing** → red **CLASS C · Immediately hazardous** stamp, 24-hour window, countdown | Class C · 24-hour correction window | (continues) |
| 0:28 | Tap **Add to my log** → dated timeline | On a dated timeline, with a countdown | The AI never decides a class or a deadline. |
| 0:32 | Scroll to the building record: "This building has 291 open HPD violations" | 291 open HPD violations in this building | This building has two hundred ninety-one open violations. Is it the building, or the landlord? |
| 0:38 | Scroll to **This landlord's buildings** | This landlord's buildings | Habitable follows the HPD registration across seven city datasets: four buildings, nine hundred forty-eight open violations. |
| 0:43 | Tap **See the landlord's record** → /landlord, "4 buildings · 84 apartments · 948 open violations" | 4 buildings · 948 open violations | (continues) |
| 0:48 | The cursor points at **17.8×** and the bars (940.5 vs 52.9 per 100 apartments) | 17.8× the NYC rate per apartment | That's nearly eighteen times the city's rate per apartment. |
| 0:52 | Scroll to **Most open Class C violations** (234-240 West 135 Street: 140) | Most open Class C violations | The worst building has a hundred and forty open Class C violations. |
| 0:57 | /ask: the question box and example chips | Ask in your own words | Ask the law searches the housing code's own text, inside the app. |
| 0:59 | Tap **How cold is too cold at night?** → live answer | The AI may only answer in quotes | (continues) |
| 1:03 | Each sentence (violet) with its quote in marker and a **QUOTE CHECKED** stamp → §27-2029(a) | Every quote checked word for word | The AI may only answer in quotes, and code checks every quote, word for word, against the law. |
| 1:10 | Tap **Back to your case file** | Sentences whose quotes don't match are dropped | A sentence whose quote isn't in the text never reaches the screen. |
| 1:14 | Open the logged leak → issue page | Each issue: evidence, rule, next step | Most people text their super first. The coach drafts that message for the exact hazard class. |
| 1:18 | Scroll to **Draft a message to your landlord or super** | Draft a message to your super | (continues) |
| 1:21 | Tap **Write my message** → live draft: the AI's words in violet, facts in marker, "FACTS FROM YOUR LOG" | AI words in pencil, facts from your log | The AI writes the words in pencil. Every date, class and address is filled in by code. |
| 1:27 | /heat → **Add sample readings** → "BELOW LEGAL MINIMUM" stamps | Each reading checked against NYC's minimums | A heat log checks each reading against the city's minimums. |
| 1:32 | /notice: "Send it to" prefilled with HPD's registered managing agent; tap **ES** | Addressed to the managing agent · English or Spanish, print-ready PDF | And the notice goes to the registered managing agent, in English or Spanish. |
| 1:38 | Tap the theme toggle → dark | Light or dark — and it works offline | Light or dark, and it works offline. |
| 1:41 | /plan/scope.html (the skill pack's 2-scope output, rendered), then scroll | Planned first with the Devpost Learn skill pack · Scope, PRD and spec before any code | It was planned before any code, with the Devpost Learn skill pack: scope, P R D, then spec. |
| 1:48 | /plan/spec.html at the cited rules table | Every rule cited, every revision logged | Every rule is cited, and every change the build forced is logged as a revision. |
| 1:54 | End card: "Your repair problem, on the record." · For NYC renters · free · no account · not legal advice · **habitable-blush.vercel.app** | | Habitable. Your repair problem, on the record. |

## Every claim, and where it comes from

| Claim | Source |
|---|---|
| Fingerprinted, dated from its own data, location stripped | `src/lib/evidence.ts`: SHA-256, EXIF capture time, canvas re-encode drops GPS |
| 93% leak | The demo sample's saved answer (`src/lib/demo/samples.ts`), labelled DEMO in the app |
| Dripping → Class C, 24 hours | `src/lib/rules.json`, leak, actively dripping (Admin Code §27-2005(a), §27-2026) |
| 291 open violations | The demo building's saved NYC Open Data snapshot (`wvxf-dwi5`), dated on screen |
| Seven city datasets; 4 buildings, 948 open, 17.8×, 140 Class C | `src/lib/portfolio.ts` (`tesw-yqqr`, `feu5-w2e2`, `wvxf-dwi5`, `64uk-42ks`, `erm2-nwe9`, `59kj-x8nc`, `hcir-3275`) and the snapshot `src/lib/demo/fixtures/1020020091-landlord.json`. City rate: 1,974,942 open B+C ÷ 3,736,645 PLUTO units |
| Searches the housing code's own text; quotes checked word for word; unmatched sentences dropped | `src/lib/law/` (65 verbatim passages, BM25, `verify.ts`) |
| Every date, class and address filled in by code | `src/lib/coach.ts` (`validateDraft`: digits, placeholders, banned and overclaiming phrases, length) |
| Heat minimums | `src/lib/heat.ts` (Admin Code §27-2029, §27-2031) |
| Registered managing agent | HPD Registration Contacts, type `Agent` |
| Works offline | `public/sw.js` (once the app has loaded on that phone) |
| Planned first with the skill pack; rules cited; revisions logged | `devpost/scope.md`, `prd.md`, `spec.md` (the skill pack's outputs, also rendered at `/plan/`), `src/lib/rules.json`, `devpost/checklist.md` → Revisions |

## Recording notes

- The two AI moments, Ask the law at 0:59 and the coach at 1:21, are live Gemini answers from production. A re-record may change their wording; the captions and voiceover only state what is always true.
- To re-cut, run these from `work/`:
  1. `walk.py record plan.json --out demo`
  2. `python3 sync3.py`
  3. `fastrender.py video.html --out ../brag.mp4 --audio final.wav`
- Before the render, the activity audit flagged nothing except the held end card.
