// Demo mode: saved answers for the sample photos in public/samples/ (real photos, see scripts/render-samples.mjs).
// The /api/classify route runs these through decide() with source "demo", exactly like a live answer.

import type { RawProposal } from "@/lib/classify";

export const DEMO_MODEL_LABEL = "saved sample answer";

export interface DemoSample {
  label: string;
  /** Public path of the photo. */
  file: string;
  first: RawProposal;
  /** Option label -> second proposal, for samples whose first answer asks a question. */
  afterAnswer?: Record<string, RawProposal>;
}

const sure = (issue: RawProposal["issue"], confidence: number, rationale: string): RawProposal => ({
  issue,
  confidence,
  rationale,
  clarifyingQuestion: null,
  clarifyingOptions: [],
});

export const DEMO_SAMPLES: Record<string, DemoSample> = {
  "leak-ceiling": {
    label: "Water-stained ceiling tile",
    file: "/samples/leak-ceiling.jpg",
    first: sure(
      "leak",
      0.93,
      "A large brown, ringed water stain spreads across a ceiling tile in the corner above a tiled wall, the mark water leaves when it comes through from above.",
    ),
  },
  "mold-bathroom": {
    label: "Black mold along the tub's edge",
    file: "/samples/mold-bathroom.jpg",
    first: sure(
      "mold",
      0.91,
      "Black speckled growth runs along the caulk line where the bathroom wall meets the tub, clustered where the edge stays damp.",
    ),
  },
  "cold-radiator": {
    label: "Old cast-iron radiator, no heat",
    file: "/samples/cold-radiator.jpg",
    first: sure(
      "heat_hot_water",
      0.88,
      "An old cast-iron radiator against the wall, the apartment's heat source. A photo can't show a temperature, so this reads as a heat complaint for the heat log to check.",
    ),
  },
  "mice-kitchen": {
    label: "Mouse caught in a snap trap",
    file: "/samples/mice-kitchen.jpg",
    first: sure(
      "pests",
      0.9,
      "A mouse caught in a wooden snap trap on the floor, with small dark droppings nearby: clear signs of mice in the apartment.",
    ),
  },
  "broken-lock": {
    label: "Door with the lock torn out",
    file: "/samples/broken-lock.jpg",
    first: sure(
      "lock_door",
      0.92,
      "The lock has been torn out of the door's edge: an empty hole with torn paint and bare wood around it, so the door can't be locked.",
    ),
  },
  "peeling-paint": {
    label: "Cracked, peeling paint",
    file: "/samples/peeling-paint.jpg",
    first: sure(
      "peeling_paint",
      0.95,
      "Old paint has cracked into curling flakes that lift off the surface, exposing bare wood underneath.",
    ),
  },
  "ambiguous-stain": {
    label: "Faint stain where wall meets ceiling",
    file: "/samples/ambiguous-stain.jpg",
    first: {
      issue: "leak",
      confidence: 0.52,
      rationale:
        "A faint, uneven tan stain on the ceiling where it meets the wall, beside a small crack. It could be water marks or a growth, and the photo is not clear enough to tell which.",
      clarifyingQuestion: "Is the stain damp or growing fuzzy spots?",
      clarifyingOptions: ["Damp / water marks", "Fuzzy spots", "Not sure"],
    },
    afterAnswer: {
      "Damp / water marks": sure(
        "leak",
        0.84,
        "With the renter's answer, the tan, tide-line stain along the crack reads as water damage rather than a growth.",
      ),
      "Fuzzy spots": sure(
        "mold",
        0.81,
        "With the renter's answer, the speckled patches in the stain read as mold growth on the ceiling.",
      ),
      "Not sure": sure(
        "leak",
        0.6,
        "Still unclear. The stain along the ceiling most likely comes from water, but it could also be mold.",
      ),
    },
  },
};
