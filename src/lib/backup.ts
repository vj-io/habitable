// Back up and restore the whole case as one JSON file. The case lives only in this browser, so this is how it
// is kept safe and moved to another phone. A backup file is a trust boundary: parseBackup checks every field
// before anything reaches the store, so a foreign or hand-edited file can't smuggle odd URLs or shapes into the UI.
import { z } from "zod";
import { nyDay } from "./countdown";
import { getCase, listHeatReadings, listIssues, replaceCase } from "./store";
import { ISSUE_IDS, PROPOSAL_IDS, type CaseFile, type HeatReading, type Issue } from "./types";

export const BACKUP_VERSION = 1;
// Photos are stored as data URLs, so a backup is a few hundred KB per photo. ponytail: a case past ~25 MB
// exports fine but won't restore; raise the cap (or zip the photos) if real cases get there.
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export interface Backup {
  app: "habitable";
  kind: "case-backup";
  version: 1;
  exportedAt: string;
  caseFile: CaseFile;
  issues: Issue[];
  /** The heat log. Optional: version-1 backups made before the heat log restore with an empty one. */
  heatReadings?: HeatReading[];
}

export type BackupResult = { ok: true; backup: Backup } | { ok: false; error: string };

// ---- schema (typed against the app's own types, so a drift in types.ts fails the build) ----

const s = (max = 2000) => z.string().max(max);
const iso = z.iso.datetime({ offset: true });
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
// Shown as a link target, so only https; a backup can't make a button open javascript: or a local file.
const httpsUrl = z.string().max(2048).regex(/^https:\/\//);
// Shown as <img src>, so only an inline image; never a remote URL that would phone home when it renders.
const photo = z.string().max(8_000_000).regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/);
const dim = z.number().int().min(1).max(20_000);
// Ids end up in URLs (/issue/<id>) and calendar UIDs, so only the characters the app itself generates.
const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

const caseFileObject = z.object({
  version: z.literal(1),
  address: z.object({
    label: s(300),
    borough: s(50),
    zip: s(10).optional(),
    bbl: z.string().regex(/^\d{10}$/),
    bin: s(10).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
  unit: s(50),
  yearBuilt: z.number().int().min(1600).max(2200).nullable(),
  childUnder6: z.boolean().nullable(),
  demo: z.boolean(),
  createdAt: iso,
  tenantName: s(120).optional(),
  landlordName: s(120).optional(),
  landlordAddress: s(300).optional(),
  landlordCc: s(500).optional(),
  noticeMadeAt: iso.optional(),
});
const caseFileSchema: z.ZodType<CaseFile> = caseFileObject;

const outcomeSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("classified"),
    ruleId: s(100),
    issue: z.enum(ISSUE_IDS),
    hazardClass: z.enum(["A", "B", "C"]),
    classLabel: s(100),
    window: z.object({ days: z.number().min(0).max(1000).optional(), hours: z.number().min(0).max(10_000).optional(), text: s(100) }),
    citation: s(300),
    sourceUrl: httpsUrl,
    plainEnglish: s(),
    quote: s().optional(),
    lawUrl: httpsUrl.optional(),
    note: s().optional(),
  }),
  z.object({
    status: z.literal("not_applicable"),
    ruleId: s(100),
    issue: z.enum(PROPOSAL_IDS),
    reason: s(),
    sourceUrl: httpsUrl.optional(),
  }),
]);

const issueObject = z.object({
  id,
  createdAt: iso,
  note: s(),
  evidence: z.object({
    sha256,
    capturedAt: iso.nullable(),
    captureSource: z.enum(["exif", "added"]),
    addedAt: iso,
    receivedAt: iso.nullable(),
    receipt: z.string().regex(/^[0-9a-f]{12}$/).nullable(),
    photo,
    width: dim,
    height: dim,
  }),
  proposal: z.object({
    issue: z.enum(PROPOSAL_IDS),
    confidence: z.number().min(0).max(1),
    rationale: s(),
    source: z.enum(["ai", "demo", "manual"]),
    model: s(200).optional(),
  }),
  issue: z.enum(PROPOSAL_IDS),
  facts: z.record(s(100), s(100)),
  outcome: outcomeSchema,
  repairBy: iso.nullable(),
  followUps: z.array(z.object({ id, at: iso, note: s(), photo: photo.optional() })),
  fixedAt: iso.nullable(),
  demoSampleId: s(100).optional(),
});
const issueSchema: z.ZodType<Issue> = issueObject;

const tempF = z.number().min(-100).max(250);

const heatReadingObject = z.object({
  id,
  at: iso,
  kind: z.enum(["heat", "hot_water"]),
  indoorF: tempF,
  outdoorF: tempF.nullable(),
  outdoorSource: z.enum(["nws", "typed"]).nullable(),
  outdoorStation: s(10).optional(),
  outdoorObservedAt: iso.optional(),
  note: s().optional(),
  complaint311: s(50).optional(),
  witness: s(120).optional(),
  photo: photo.optional(),
  demo: z.boolean().optional(),
  createdAt: iso,
});
const heatReadingSchema: z.ZodType<HeatReading> = heatReadingObject;

// z.ZodType<T> still accepts a schema that leaves out one of T's optional fields (restore would then drop it
// silently), so the key sets are compared too: a field added to types.ts and not here fails the build.
type SameKeys<A, B> = [keyof A] extends [keyof B] ? ([keyof B] extends [keyof A] ? true : false) : false;
type Shape<T extends z.ZodType> = z.infer<T>;
const keysMatch: [
  SameKeys<Shape<typeof caseFileObject>, CaseFile>,
  SameKeys<Shape<typeof caseFileObject>["address"], CaseFile["address"]>,
  SameKeys<Shape<typeof issueObject>, Issue>,
  SameKeys<Shape<typeof issueObject>["evidence"], Issue["evidence"]>,
  SameKeys<Shape<typeof issueObject>["proposal"], Issue["proposal"]>,
  SameKeys<Shape<typeof heatReadingObject>, HeatReading>,
] = [true, true, true, true, true, true];
void keysMatch;

const uniqueIds = (items: { id: string }[] = []) => new Set(items.map((i) => i.id)).size === items.length;

const backupSchema: z.ZodType<Backup> = z
  .object({
    app: z.literal("habitable"),
    kind: z.literal("case-backup"),
    version: z.literal(BACKUP_VERSION),
    exportedAt: iso,
    caseFile: caseFileSchema,
    issues: z.array(issueSchema),
    heatReadings: z.array(heatReadingSchema).optional(),
  })
  .refine((b) => uniqueIds(b.issues), { message: "two issues share an id", path: ["issues"] })
  .refine((b) => uniqueIds(b.heatReadings), { message: "two heat readings share an id", path: ["heatReadings"] });

// ---- parse ----

const fail = (error: string): BackupResult => ({ ok: false, error });
const NOT_A_BACKUP = "That doesn't look like a Habitable backup file.";
const TOO_BIG = `That file is too big to be a Habitable backup (the limit is ${MAX_BACKUP_BYTES / 1024 / 1024} MB).`;

/** Validates backup text. Never throws; the error is safe to show the renter. */
export function parseBackup(text: string): BackupResult {
  if (text.length > MAX_BACKUP_BYTES) return fail(TOO_BIG);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail(NOT_A_BACKUP);
  }
  if (typeof raw !== "object" || raw === null) return fail(NOT_A_BACKUP);
  const head = raw as Record<string, unknown>;
  if (head.app !== "habitable" || head.kind !== "case-backup") return fail(NOT_A_BACKUP);
  if (head.version !== BACKUP_VERSION) {
    return fail(
      typeof head.version === "number" && head.version > BACKUP_VERSION
        ? "This backup was made by a newer version of Habitable. Update the app, then try again."
        : "This backup is from a version of Habitable that can't be restored.",
    );
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const at = parsed.error.issues[0]?.path.join(".");
    return fail(`This backup file is damaged or was edited${at ? ` (problem at ${at})` : ""}. Your current case was not changed.`);
  }
  return { ok: true, backup: parsed.data };
}

/** Reads a file the renter picked and validates it; checks the size first so a huge file is never loaded. */
export async function readBackupFile(file: File): Promise<BackupResult> {
  if (file.size > MAX_BACKUP_BYTES) return fail(TOO_BIG);
  try {
    return parseBackup(await file.text());
  } catch {
    return fail("That file couldn't be read. Try choosing it again.");
  }
}

// ---- export / restore ----

/** The whole case as a backup object, or null when there is no case yet. */
export async function exportCase(now: Date = new Date()): Promise<Backup | null> {
  const [caseFile, issues, heatReadings] = await Promise.all([getCase(), listIssues(), listHeatReadings()]);
  if (!caseFile) return null;
  return { app: "habitable", kind: "case-backup", version: BACKUP_VERSION, exportedAt: now.toISOString(), caseFile, issues, heatReadings };
}

/** habitable-case-<yyyy-mm-dd>.json, the date on the New York calendar (same as the notice file). */
export function backupFileName(now: Date = new Date()): string {
  return `habitable-case-${nyDay(now)}.json`;
}

/** Replaces the current case, issues and heat log with the backup's. Callers ask the renter first. */
export function restoreCase(backup: Backup): Promise<void> {
  return replaceCase(backup.caseFile, backup.issues, backup.heatReadings ?? []);
}
