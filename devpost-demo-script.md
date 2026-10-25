# Habitable: Devpost demo storyboard and voiceover

**Length:** 2:15, landscape 1920×1080, 30 fps. That is inside the rules' 1–3 minute window ("less than three minutes").
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

**Files:** `brag-output-2026-10-25-165500/` (git-ignored). `work/` holds the recording plan, the player and the timings.

> **Before you submit — your voice, your words.** The skill pack's ship step says the learner presents the demo in their own words. This voiceover was drafted for you on request and read by a synthetic voice. Rewrite any line that isn't how you'd say it, then record yourself over the same cut:
> - `work/score.wav` is the music alone.
> - `work/timings.json` gives each line's start time.
> - `work/sync3.py` re-fits the scenes if your lines run longer.
>
> Devpost requires the video to be **public on YouTube or Vimeo**.

## Structure

| Time | Chapter |
|---|---|
| 0:00–0:33 | What it is and who it's for, why it matters, then snap → AI proposes → code disposes (Class C, 24 h) |
| 0:33–1:02 | Timeline → building record → **landlord track record** |
| 1:02–1:19 | **Ask the law**: answers only in code-checked quotes |
| 1:19–1:31 | **Message coach**: the AI's words, the code's facts |
| 1:31–1:52 | Heat log · the notice (addressed, EN/ES, the finished preview) · dark mode |
| 1:52–2:11 | **How it was built**: skill pack scope → PRD → spec, cited rules, checklist slices, revisions |
| 2:11–2:15 | End card |

## Storyboard and voiceover

On-screen captions use the app's own words. The voiceover is burned in as subtitles beside the phone.

| Start | Screen and action (live site, phone) | Caption | Voiceover |
|---|---|---|---|
| 0:00 | Title card: **Habitable** · "Your repair problem, on the record — for NYC renters." · habitable-blush.vercel.app · free · no account | | Habitable puts a New York renter's repair problem on the record, straight from their phone. |
| 0:02 | Welcome screen: what it is, who it's for; the cursor points at "The AI only names the problem…" | Your repair problem, on the record. | (continues) |
| 0:05 | Tap **Just looking? Try the demo building** → case file (618 West 136th Street) | A real Harlem building, public HPD record | More than 2.5 million housing violations are open in New York City right now. |
| 0:12 | Tap **Snap a problem** | Snap the problem | Snap the leak. The photo is fingerprinted, dated from its own data, and its location is stripped. |
| 0:15 | Tap the **ceiling stain with drips** sample → evidence list | Fingerprinted, dated, location removed | (continues) |
| 0:18 | The AI proposal in violet pencil: Leak / water damage, 93% | The AI proposes: leak, 93% sure | The AI proposes what it sees: a leak, 93% sure. |
| 0:23 | Tap **Yes, that's it** → "Is water actively dripping or flowing right now?" | The rule asks what photos can't show | Then code takes over. The rules table asks the one fact a photo can't show. Water is dripping, so it stamps Class C: 24 hours. |
| 0:28 | Tap **Yes, it's dripping or flowing** → red **CLASS C** stamp, 24-hour window, countdown | Class C · 24-hour correction window | (continues) |
| 0:33 | Tap **Add to my log** → dated timeline | On a dated timeline, with a countdown | The AI never decides a class or a deadline. |
| 0:37 | Building record: "This building has 291 open HPD violations" | 291 open HPD violations in this building | This building has 291 open violations. Is it the building, or the landlord? |
| 0:43 | Scroll to **This landlord's buildings** | This landlord's buildings | Habitable follows the HPD registration across seven city datasets: four buildings, 948 open violations. |
| 0:48 | Tap **See the landlord's record** → /landlord: 4 buildings · 84 apartments · 948 open violations | 4 buildings · 948 open violations | (continues) |
| 0:53 | The cursor points at **17.8×** (940.5 vs 52.9 per 100 apartments) | 17.8× the NYC rate per apartment | That's nearly 18 times the city's rate per apartment. |
| 0:57 | **Most open Class C violations** (234-240 West 135 Street: 140) | Most open Class C violations | The worst building has 140 open Class C violations. |
| 1:02 | /ask: question box and example chips | Ask in your own words | Ask the law searches the housing code's own text, inside the app. |
| 1:04 | Tap **How cold is too cold at night?** → live answer | The AI may only answer in quotes | (continues) |
| 1:08 | Sentences in violet, quotes in marker, **QUOTE CHECKED** stamps → §27-2029(a) | Every quote checked word for word | The AI may only answer in quotes, and code checks every quote, word for word, against the law. |
| 1:14 | Tap **Back to your case file** | Sentences whose quotes don't match are dropped | A sentence whose quote isn't in the text never reaches the screen. |
| 1:19 | Open the logged leak → issue page | Each issue: evidence, rule, next step | Most people text their super first. The coach drafts that message for the exact hazard class. |
| 1:22 | Scroll to **Draft a message to your landlord or super** | Draft a message to your super | (continues) |
| 1:25 | Tap **Write my message** → live draft: violet words, marker facts, "FACTS FROM YOUR LOG" | AI words in pencil, facts from your log | The AI writes the words in pencil. Every date, class and address is filled in by code. |
| 1:31 | /heat | A photo can't show a temperature | A heat log checks each reading against the city's minimums. |
| 1:34 | Tap **Add sample readings** → "BELOW LEGAL MINIMUM" stamps | Each reading checked against NYC's minimums | (continues) |
| 1:37 | /notice: "Send it to" prefilled with HPD's registered managing agent | Addressed to the managing agent | The notice goes to the registered managing agent, in English or Spanish. |
| 1:40 | Tap **ES** | English or Spanish, print-ready PDF | (continues) |
| 1:43 | Scroll the Spanish notice preview: To / CC, the Class C stamp, the dated item | Dated, cited, photos and fingerprints | It's dated and cited, with every photo, fingerprint and repair-by date. |
| 1:48 | Tap the theme toggle → dark | Light or dark — and it works offline | Light or dark, and it works offline. |
| 1:52 | /plan/scope.html: the skill pack's 2-scope output, rendered | Planned first with the Devpost Learn skill pack | It was planned before any code, with the Devpost Learn skill pack: scope, PRD, then spec. |
| 1:55 | Scroll the scope page | Scope, PRD and spec before any code | (continues) |
| 1:58 | /plan/spec.html at the cited rules table | Every rule cited to its source | Every rule in the table is cited to its source. |
| 2:02 | /plan/checklist.html: the 5-build slices, ticked | Built slice by slice from the checklist | The checklist built it slice by slice. |
| 2:05 | /plan/checklist.html → **Revisions** (what the build forced to change) | Every change the build forced, logged | And every change the build forced, like a repealed code section, is logged as a revision. |
| 2:11 | End card: "Your repair problem, on the record." · For NYC renters · free · no account · not legal advice · **habitable-blush.vercel.app** | | Habitable. Your repair problem, on the record. |

## Every claim, and where it comes from

| Claim | Source |
|---|---|
| More than 2.5 million open violations | NYC Open Data `wvxf-dwi5`, open A+B+C = 2,650,958, queried 2026-10-25 |
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
| Planned first with the skill pack; rules cited; built slice by slice; revisions logged | `devpost/scope.md`, `prd.md`, `spec.md` (the skill pack's outputs, rendered at `/plan/`), `src/lib/rules.json`, `devpost/checklist.md` → Slices and Revisions (rendered at `/plan/checklist.html`; the repealed §27-2018 citation is one revision) |

## Recording notes

- The two AI moments, Ask the law and the coach, are live Gemini answers from production. A re-record may change their wording; the captions and voiceover only state what is always true.
- To re-cut, run these from `work/`:
  1. `walk.py record plan.json --out demo`
  2. `python3 sync3.py`
  3. `fastrender.py video.html --out ../brag.mp4 --audio final.wav`
- Before the render, the activity audit flagged nothing except the held end card.
