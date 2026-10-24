---
doc: scope
status: approved
---

# Habitable

Snap a photo of what's broken in your NYC apartment; get a dated, housing-code-classified evidence log and a ready-to-send repair notice.

## The Unique Kernel
**AI proposes, code disposes.** A vision model may only pick from a short, fixed list of problem types and must say how sure it is. A cited rules table — never the model — decides the NYC hazard class and the legal correction window. The photo, its capture time and a content hash become an evidence entry, and the building's public violation history shows the tenant isn't alone. Photo → code class → legal clock → building history → notice does not exist as one flow today.

## Who It's For
A New York City renter, typically in an older (often rent-stabilized) building, with a leak, mold, no heat, pests, a broken lock or peeling paint. Today they text or call the landlord, keep no dated record, and don't know what the Housing Maintenance Code requires or how long the landlord has to fix it. When it escalates to a 311 complaint, an HPD inspection or housing court, they have a scattered camera roll and no paper trail.
Secondary: tenant-association organizers and legal-aid intake workers who need structured evidence.

## The Core Loop
Open the app on a phone → snap the problem (plus one optional line like "ceiling dripping since Tuesday") → see the class card with its clock and the "why" → it lands on a dated timeline. They come back to add another issue or a follow-up ("still broken on day 12"), and when ready, produce the notice.

## Inspiration & Identity
- Visual: the **brag-styles doodle kit** — hand-drawn ink lines on grid paper, a lime highlighter swipe under the key word, cards that spring in, Patrick Hand handwriting with a bold display sans and mono numbers — plus one complementary colour (BD's direction). Stamp-style badges for the hazard class carry over from the brief's "legal paper" idea.
- Strong entries in this event share visible guardrails ("AI proposes, code disposes"), a specific named user, and a deliberate visual identity rather than default component-library styling.
- Data: NYC HPD "Clear Violations" correction windows (https://www.nyc.gov/site/hpd/services-and-information/clear-violations.page), NYC311 heat and hot water rules, NYC Open Data HPD violations (`wvxf-dwi5`) and complaints (`ygpa-z7cr`).

## Why This Matters to the Learner
Civic tech with a real document at the end. "Every repair dispute turns on documentation," and the tools that exist are chatbots, not evidence.

## What "Working" Looks Like
On a phone: enter an address once, photograph a stained, dripping ceiling, and watch it flip into a stamped "Class B · Hazardous · 30-day correction window" card with a running countdown and the cited code section. The building panel slides in: "This building already has N open violations, M for leaks." The issue lands on a dated timeline with its hash and timestamps, and one tap produces a print-ready notice PDF. **The "oh, that's cool" beat:** the photo becoming a stamped legal clock, followed by proof the building has a history.

## The POC Boundary
- NYC only, one address per device, no accounts; everything stored on the device.
- Fixed taxonomy of six problem types plus "not covered".
- Vision classification with confidence + rationale; one clarifying question when unsure.
- Deterministic, cited rules table with a "why" drawer and countdown.
- Evidence timeline (photo, capture time, hash, follow-ups).
- Building history from NYC Open Data.
- Notice PDF.
- A seeded demo mode so the demo never depends on a live API.
- "Not legal advice" plus a 311/HPD next step.

## Later
- Email the notice (Resend) — needs a verified sending domain.
- Shareable read-only evidence link for an organizer.
- Multi-unit view for tenant associations.
- More cities.

## Explicitly Cut
- **Accounts and cloud sync** — they add auth and a database without proving the kernel; local-first is also the privacy story.
- **Letting the model decide class or deadline** — that is exactly the trust problem the kernel solves.
- **Rent-withholding or legal strategy advice** — legal risk; the app documents and cites, it doesn't advise.
- **Filing 311 complaints automatically** — no public filing API; we hand the user pre-filled text and the link instead.

## How This Plan Was Made
The interview answers come from BD's written research brief (kept private) and BD's direction in the build session (doodle style, build end to end). BD approved by asking for the full build.
