// Demo mode: saved answers for the sample photos in public/samples/ (see scripts/render-samples.mjs).
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
    label: "Ceiling stain with drips",
    file: "/samples/leak-ceiling.jpg",
    first: sure(
      "leak",
      0.93,
      "A brown, ringed stain spreads across the ceiling with a wet core, water running down the corner, drops falling into a puddle and a bucket on the floor.",
    ),
  },
  "mold-bathroom": {
    label: "Black mold above the tub",
    file: "/samples/mold-bathroom.jpg",
    first: sure(
      "mold",
      0.91,
      "Dark green-black speckled patches cover the wall and grout lines above the tub, clustered where the corner stays damp.",
    ),
  },
  "cold-radiator": {
    label: "Cold radiator and frosted window",
    file: "/samples/cold-radiator.jpg",
    first: sure(
      "heat_hot_water",
      0.88,
      "A radiator under a frosted window with a thermometer beside it reading a low indoor temperature; the window glass shows frost on the inside.",
    ),
  },
  "mice-kitchen": {
    label: "Mouse, droppings and chewed cereal box",
    file: "/samples/mice-kitchen.jpg",
    first: sure(
      "pests",
      0.9,
      "A mouse by the kitchen baseboard, small dark droppings on the floor and a cereal box with chewed edges, all typical signs of mice.",
    ),
  },
  "broken-lock": {
    label: "Broken deadbolt and splintered door frame",
    file: "/samples/broken-lock.jpg",
    first: sure(
      "lock_door",
      0.92,
      "The deadbolt hangs loose and the door frame around the strike plate is splintered, so the latch no longer catches.",
    ),
  },
  "peeling-paint": {
    label: "Peeling paint on window sill",
    file: "/samples/peeling-paint.jpg",
    first: sure(
      "peeling_paint",
      0.95,
      "Curling flakes of paint have lifted off the window sill, exposing bare surface underneath, with loose chips lying on the sill.",
    ),
  },
  "ambiguous-stain": {
    label: "Faint stain on wall by window",
    file: "/samples/ambiguous-stain.jpg",
    first: {
      issue: "leak",
      confidence: 0.52,
      rationale:
        "A faint, uneven stain on the wall beside the window. It could be water marks or a growth, and the photo is not clear enough to tell which.",
      clarifyingQuestion: "Is the stain damp or growing fuzzy spots?",
      clarifyingOptions: ["Damp / water marks", "Fuzzy spots", "Not sure"],
    },
    afterAnswer: {
      "Damp / water marks": sure(
        "leak",
        0.84,
        "With the renter's answer, the stain with soft, tide-line edges beside the window reads as water damage rather than a growth.",
      ),
      "Fuzzy spots": sure(
        "mold",
        0.81,
        "With the renter's answer, the speckled, fuzzy-looking patches in the stain read as mold growth on the wall.",
      ),
      "Not sure": sure(
        "leak",
        0.6,
        "Still unclear. The stain beside the window most likely comes from water, but it could also be mold.",
      ),
    },
  },
};
