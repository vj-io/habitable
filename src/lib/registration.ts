// HPD registration: who the city has on record as managing agent, head officer and owner of a building.
// Pure (no I/O) so the route, the demo fixtures and the tests share one implementation.
// Data: HPD "Multiple Dwelling Registrations" (tesw-yqqr) and "Registration Contacts" (feu5-w2e2) on NYC Open Data.
import { isoDate } from "./building";
import { formatNY } from "./countdown";
import type { Registration, RegistrationContact, RegistrationInfo } from "./types";

export const REGISTRATIONS_DATASET = "tesw-yqqr";
export const CONTACTS_DATASET = "feu5-w2e2";
export const REGISTRATION_SOURCE_URL = "https://data.cityofnewyork.us/Housing-Development/Multiple-Dwelling-Registrations/tesw-yqqr";
export const HPD_ONLINE_URL = "https://hpdonline.nyc.gov/hpdonline/";

/** The columns we read from `tesw-yqqr` (Socrata sends text and omits null fields). It has no BBL column. */
export interface RegistrationRow {
  registrationid: string;
  buildingid?: string;
  housenumber?: string;
  lowhousenumber?: string;
  highhousenumber?: string;
  streetname?: string;
  /** "0" means HPD has no BIN for the row. */
  bin?: string;
  lastregistrationdate?: string;
  registrationenddate?: string;
}

/** The columns we read from `feu5-w2e2`. Rows can be duplicated, so `registrationcontactid` is the identity. */
export interface ContactRow {
  registrationcontactid: string;
  registrationid?: string;
  type?: string;
  corporationname?: string;
  firstname?: string;
  middleinitial?: string;
  lastname?: string;
  businesshousenumber?: string;
  businessstreetname?: string;
  businessapartment?: string;
  businesscity?: string;
  businessstate?: string;
  businesszip?: string;
}

/** Contact types we use. SiteManager (the super) never has an address; Officer, Shareholder and Lessee are not who a notice goes to. */
export const CONTACT_TYPES = ["Agent", "HeadOfficer", "CorporateOwner", "IndividualOwner", "JointOwner"] as const;
const OWNER_TYPES = ["CorporateOwner", "IndividualOwner", "JointOwner"]; // in order of preference

/** Borough digit, block and lot as numbers: the registration file stores them without leading zeros. */
export function parseBbl(bbl: string): { boroid: number; block: number; lot: number } | null {
  if (!/^\d{10}$/.test(bbl)) return null;
  return { boroid: Number(bbl[0]), block: Number(bbl.slice(1, 6)), lot: Number(bbl.slice(6)) };
}

/** "618 West 136th Street, Manhattan, NY" -> "618"; null when the label doesn't start with a house number. */
export function houseNumberOf(label: string): string | null {
  return /^\s*(\d[\d-]*[A-Za-z]?)(?=\s|,|$)/.exec(label)?.[1] ?? null;
}

export interface BuildingHint {
  /** The case's building identification number, when the address search gave one. */
  bin?: string;
  houseNumber?: string;
}

// ISO timestamps sort as text. Newest end date first; ties go to the newest registration.
const newerFirst = (a: RegistrationRow, b: RegistrationRow) =>
  (b.registrationenddate ?? "").localeCompare(a.registrationenddate ?? "") ||
  (b.lastregistrationdate ?? "").localeCompare(a.lastregistrationdate ?? "");

function onHouse(row: RegistrationRow, house: string): boolean {
  const h = house.toUpperCase();
  const names = [row.housenumber, row.lowhousenumber, row.highhousenumber].map((v) => v?.trim().toUpperCase());
  if (names.includes(h)) return true;
  const n = /^\d+$/.test(h) ? Number(h) : NaN;
  return n >= Number(row.lowhousenumber) && n <= Number(row.highhousenumber); // NaN compares false
}

/**
 * The building's current registration row. One tax lot can hold several buildings and old rows from the 1990s,
 * so: keep each building's newest row, prefer the building matching the case's BIN, then its house number,
 * and otherwise take the newest overall.
 */
export function pickRegistrationRow(rows: RegistrationRow[], hint: BuildingHint = {}): RegistrationRow | null {
  const newest = new Map<string, RegistrationRow>();
  for (const r of rows) {
    const key = r.buildingid ?? r.registrationid;
    const have = newest.get(key);
    if (!have || newerFirst(r, have) < 0) newest.set(key, r);
  }
  const buildings = [...newest.values()];
  const byBin = hint.bin && hint.bin !== "0" ? buildings.filter((b) => b.bin === hint.bin) : [];
  const byHouse = hint.houseNumber ? buildings.filter((b) => onHouse(b, hint.houseNumber as string)) : [];
  const pool = byBin.length ? byBin : byHouse.length ? byHouse : buildings;
  return pool.sort(newerFirst)[0] ?? null;
}

const clean = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim();

/** "person, company" when both are published; whichever exists otherwise. Names stay as HPD wrote them. */
function contactName(c: ContactRow): string {
  const person = [c.firstname, c.middleinitial, c.lastname].map(clean).filter(Boolean).join(" ");
  return [person, clean(c.corporationname)].filter(Boolean).join(", ");
}

/** "579 5th ave, 2nd fl, New York, NY 10017"; null without a street. (Some PO boxes arrive as "POB" + "319".) */
function contactAddress(c: ContactRow): string | null {
  if (!clean(c.businessstreetname)) return null;
  const street = [c.businesshousenumber, c.businessstreetname].map(clean).filter(Boolean).join(" ");
  const place = [clean(c.businesscity), [c.businessstate, c.businesszip].map(clean).filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, clean(c.businessapartment), place].filter(Boolean).join(", ");
}

/** First type in `types` that has a named contact; within a type, one with an address beats one without, then the lowest id. */
function pickContact(contacts: ContactRow[], types: readonly string[]): RegistrationContact | null {
  for (const type of types) {
    const best = contacts
      .filter((c) => c.type === type && contactName(c))
      .sort((a, b) => Number(!!contactAddress(b)) - Number(!!contactAddress(a)) || Number(a.registrationcontactid) - Number(b.registrationcontactid))[0];
    if (best) return { name: contactName(best), address: contactAddress(best) };
  }
  return null;
}

function buildingAddress(r: RegistrationRow): string {
  const lo = clean(r.lowhousenumber);
  const hi = clean(r.highhousenumber);
  const number = lo && hi && lo !== hi ? `${lo}-${hi}` : clean(r.housenumber) || lo || hi;
  return [number, clean(r.streetname)].filter(Boolean).join(" ");
}

/** The registration row plus its contacts, de-duplicated by contact id. */
export function buildRegistration(row: RegistrationRow, contacts: ContactRow[]): Registration {
  const own = [...new Map(contacts.filter((c) => !c.registrationid || c.registrationid === row.registrationid).map((c) => [c.registrationcontactid, c])).values()];
  return {
    registrationId: row.registrationid,
    buildingId: row.buildingid ?? "",
    buildingAddress: buildingAddress(row),
    lastRegistered: isoDate(row.lastregistrationdate),
    endDate: isoDate(row.registrationenddate),
    agent: pickContact(own, ["Agent"]),
    headOfficer: pickContact(own, ["HeadOfficer"]),
    owner: pickContact(own, OWNER_TYPES),
  };
}

/** Pick the building's row, attach its contacts. `asOf` is the file's newest registration date. */
export function registrationInfo(rows: RegistrationRow[], contacts: ContactRow[], hint: BuildingHint, asOf: string | null): RegistrationInfo {
  const row = pickRegistrationRow(rows, hint);
  return { asOf: isoDate(asOf ?? undefined), current: row ? buildRegistration(row, contacts) : null };
}

/**
 * True when the end date is more than a year before the file's snapshot. An ordinary Sept-1 renewal that the
 * snapshot hasn't picked up yet is not "old", and nothing here calls a registration expired.
 */
export function isOldRegistration(reg: Registration, asOf: string | null): boolean {
  if (!reg.endDate || !asOf) return false;
  const cutoff = new Date(`${asOf}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return reg.endDate < cutoff.toISOString().slice(0, 10);
}

/** "Jul 31, 2026" for an HPD calendar day; read at noon UTC so no timezone shifts the day. */
export const dayLabel = (isoDay: string) => formatNY(`${isoDay}T12:00:00Z`, "date");

/** "HPD registration snapshot as of Jul 31, 2026": what the registration facts are as of, so nobody reads them as live. */
export const snapshotLabel = (asOf: string | null) => `HPD registration snapshot${asOf ? ` as of ${dayLabel(asOf)}` : ""}`;

export interface Addressee {
  name: string;
  address: string;
  /** The owner, when the notice is not addressed to the owner itself; "" otherwise. */
  cc: string;
}

/**
 * Who a repair notice should go to: the managing agent, else the head officer, else the owner (never the super).
 * The first of those with a mailing address wins; if none has one, the first with a name. The owner is copied.
 */
export function suggestAddressee(reg: Registration): Addressee | null {
  const chain = [reg.agent, reg.headOfficer, reg.owner].filter((c): c is RegistrationContact => !!c);
  const to = chain.find((c) => c.address) ?? chain[0];
  if (!to) return null;
  const cc = reg.owner && reg.owner !== to ? [reg.owner.name, reg.owner.address].filter(Boolean).join(", ") : "";
  return { name: to.name, address: to.address ?? "", cc };
}
