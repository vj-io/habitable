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

/** Below this confidence, code (not the model) asks one clarifying question. Shared by server and UI. */
export const CONFIDENCE_THRESHOLD = 0.7;

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
  // -- notice "To:" block and what the renter has done with it --
  /** Mailing address of the person the notice is addressed to (one line). */
  landlordAddress?: string;
  /** Who gets a copy, e.g. the owner (one line: name, address). */
  landlordCc?: string;
  /** When the renter first downloaded or shared the notice PDF, ISO. Drives the "what to do next" card. */
  noticeMadeAt?: string;
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

export type HeatKind = "heat" | "hot_water";

/** One dated reading in the heat and hot water log. Raw facts only: the legal check (lib/heat.ts) runs at display time. */
export interface HeatReading {
  id: string;
  /** When the reading was taken, ISO. */
  at: string;
  kind: HeatKind;
  /** Indoor air temperature (heat) or water temperature at the tap (hot water), °F. */
  indoorF: number;
  outdoorF: number | null;
  outdoorSource: "nws" | "typed" | null;
  /** NWS station id and observation time, kept with the reading: NWS keeps only 7 days of history. */
  outdoorStation?: string;
  outdoorObservedAt?: string;
  note?: string;
  /** 311 service request number, if the renter filed a complaint. */
  complaint311?: string;
  witness?: string;
  /** Thermometer photo: metadata-free JPEG data URL. */
  photo?: string;
  /** A sample reading added in demo mode. */
  demo?: boolean;
  createdAt: string; // ISO
}

/** Response of GET /api/outdoor (200). */
export interface OutdoorReading {
  tempF: number;
  observedAt: string; // ISO
  station: "KNYC" | "KLGA" | "KJFK";
  /** The NWS observation URL the value came from. */
  source: string;
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

/** One person or company named on an HPD registration, as published. */
export interface RegistrationContact {
  /** Company name, or the person's name; when both are published: "person, company". */
  name: string;
  /** One-line business address; null when HPD publishes none. */
  address: string | null;
}

/** A building's registration with HPD (Multiple Dwelling Registrations + Registration Contacts). */
export interface Registration {
  registrationId: string;
  buildingId: string;
  /** Registered street address, e.g. "618-620 WEST 136 STREET". */
  buildingAddress: string;
  /** ISO dates, null when missing. `endDate` is the date in HPD's file, not a verdict on whether it lapsed. */
  lastRegistered: string | null;
  endDate: string | null;
  /** Managing agent: who HPD mails violations to and who a repair notice should go to. */
  agent: RegistrationContact | null;
  headOfficer: RegistrationContact | null;
  /** Corporate, individual or joint owner. */
  owner: RegistrationContact | null;
}

export interface RegistrationInfo {
  /** Newest registration date in HPD's file when it was read (ISO date): the snapshot this answer comes from. */
  asOf: string | null;
  /** The building's most recent registration, or null when the building is not in the file. */
  current: Registration | null;
}

/** What HPD's other public datasets say about the building's recent history. Counts only: no apartment numbers, no names. */
export interface BuildingSignals {
  /** Start of the 12-month window for `complaints` (ISO date). */
  since: string;
  /** Problems reported to HPD since `since`, by category, most first. */
  complaints: { category: string; n: number }[];
  /** HPD litigation cases on record for the building, all years. */
  litigations: number;
  /** In HPD's Alternative Enforcement Program right now (the file's current status is "AEP Active"). */
  aep: boolean;
}

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
  /** HPD registration contacts. Undefined when that lookup failed (the rest of the record is still good). */
  registration?: RegistrationInfo;
  /** Complaints, litigation and AEP. Undefined when that lookup failed. */
  signals?: BuildingSignals;
}

/** Response of POST /api/receipt. */
export interface ReceiptResponse {
  receivedAt: string;
  receipt: string;
}
