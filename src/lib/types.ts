// Shared domain types. Every module (rules engine, API routes, store, UI, notice) imports from here.

export const ISSUE_IDS = [
  "leak",
  "mold",
  "heat_hot_water",
  "pests",
  "lock_door",
  "peeling_paint",
] as const;
export type IssueId = (typeof ISSUE_IDS)[number];

/** What the model may answer: one of the six issues, or "not covered". */
export const PROPOSAL_IDS = [...ISSUE_IDS, "not_covered"] as const;
export type ProposalIssue = (typeof PROPOSAL_IDS)[number];

export type HazardClass = "A" | "B" | "C";

export interface Address {
  /** Human label from GeoSearch, e.g. "123 Main St, Brooklyn, NY 11201". */
  label: string;
  borough: string;
  zip?: string;
  /** 10-digit borough-block-lot id; the key for every NYC Open Data lookup. */
  bbl: string;
  bin?: string;
  lat?: number;
  lng?: number;
}

export interface CaseFile {
  version: 1;
  address: Address;
  unit: string;
  yearBuilt: number | null;
  /** Answer to "Does a child under 6 live here?" — asked by the paint rule, then remembered. */
  childUnder6: boolean | null;
  demo: boolean;
  createdAt: string; // ISO
  tenantName?: string;
  landlordName?: string;
}

/** The AI's (or the human's) proposal. Never decides class or deadline. */
export interface Proposal {
  issue: ProposalIssue;
  confidence: number; // 0..1
  rationale: string;
  source: "ai" | "demo" | "manual";
  model?: string;
}

/** Facts the rules need that a photo can't show: factId -> chosen option value. */
export type Facts = Record<string, string>;

export interface RuleQuestion {
  factId: string;
  prompt: string;
  help?: string;
  options: { value: string; label: string }[];
}

export interface CorrectionWindow {
  days?: number;
  hours?: number;
  /** Display text, e.g. "30 days", "24 hours". */
  text: string;
}

export type RuleOutcome =
  | { status: "needs_facts"; issue: IssueId; questions: RuleQuestion[] }
  | {
      status: "classified";
      ruleId: string;
      issue: IssueId;
      hazardClass: HazardClass;
      classLabel: string; // "Non-hazardous" | "Hazardous" | "Immediately hazardous"
      window: CorrectionWindow;
      citation: string; // e.g. "NYC Admin. Code §27-2017.3"
      sourceUrl: string;
      plainEnglish: string;
      /** Short official wording quoted from the source, when available. */
      quote?: string;
      /** Link to the enacted law text, when available. */
      lawUrl?: string;
      /** Extra context, e.g. "HPD's inspector assigns the class…". */
      note?: string;
    }
  | {
      status: "not_applicable";
      ruleId: string;
      issue: IssueId | "not_covered";
      reason: string;
      sourceUrl?: string;
    };

export type ClassifiedOutcome = Extract<RuleOutcome, { status: "classified" }>;

export interface Evidence {
  /** SHA-256 (hex) of the original photo file bytes, computed on the device. */
  sha256: string;
  /** Capture time read from the photo's EXIF, ISO; null when the photo has none. */
  capturedAt: string | null;
  captureSource: "exif" | "added";
  /** When the renter added the photo to Habitable, ISO. */
  addedAt: string;
  /** Server receipt: when Habitable's server saw this fingerprint, ISO. */
  receivedAt: string | null;
  /** Short HMAC receipt code over sha256|receivedAt; verifiable at /verify. */
  receipt: string | null;
  /** Re-encoded JPEG data URL with all metadata (incl. GPS) removed, max 1600px. */
  photo: string;
  width: number;
  height: number;
}

export interface FollowUp {
  id: string;
  at: string; // ISO
  note: string;
  photo?: string; // data URL (metadata stripped)
}

export interface Issue {
  id: string;
  createdAt: string; // ISO; "first documented"
  note: string;
  evidence: Evidence;
  proposal: Proposal;
  /** Final problem type after any human correction. */
  issue: ProposalIssue;
  facts: Facts;
  outcome: Extract<RuleOutcome, { status: "classified" | "not_applicable" }>;
  /** Requested repair-by date (ISO) = first documented + correction window; null when no class. */
  repairBy: string | null;
  followUps: FollowUp[];
  fixedAt: string | null;
  demoSampleId?: string;
}

/** Response of POST /api/classify. */
export type ClassifyResponse =
  | {
      status: "proposal";
      proposal: Proposal;
      /** Set by code when confidence < threshold and no answer was given yet. */
      clarifyingQuestion: { question: string; options: string[] } | null;
    }
  | { status: "unavailable"; reason: string };

/** Response of GET /api/building?bbl=… */
export interface BuildingRecord {
  bbl: string;
  yearBuilt: number | null;
  openTotal: number;
  byClass: Record<HazardClass, number>;
  byIssue: Record<IssueId, number>;
  /** Most recent open violations, newest first (max 25). */
  recent: {
    id: string;
    date: string | null; // ISO date
    hazardClass: HazardClass | null;
    description: string;
    issue: IssueId | null;
  }[];
  sourceUrl: string;
  fetchedAt: string;
  source: "live" | "demo-fixture";
}

/** Response of POST /api/receipt. */
export interface ReceiptResponse {
  receivedAt: string;
  receipt: string;
}
