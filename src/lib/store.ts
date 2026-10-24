// Browser only. The renter's case lives in IndexedDB (idb-keyval); falls back to memory when IndexedDB is unavailable.
import { useCallback, useEffect, useState } from "react";
import { del, get, set, update } from "idb-keyval";
import type { CaseFile, FollowUp, Issue } from "./types";

const CASE_KEY = "habitable:case";
const ISSUES_KEY = "habitable:issues";
const PROBE_KEY = "habitable:probe";

// ---- backend: IndexedDB, or an in-memory Map with the same semantics ----

const mem = new Map<string, unknown>();
let persistent = true;
let probe: Promise<boolean> | null = null;

/** Probes IndexedDB once (write, read, delete); on failure the store runs in memory for this session. */
export function storageAvailable(): Promise<boolean> {
  probe ??= (async () => {
    try {
      await set(PROBE_KEY, 1);
      const ok = (await get(PROBE_KEY)) === 1;
      await del(PROBE_KEY);
      persistent = ok;
    } catch {
      persistent = false;
    }
    return persistent;
  })();
  return probe;
}

/** False once the probe found IndexedDB unusable (data then lives only in this tab). Accurate after the first store call. */
export function isPersistent(): boolean {
  return persistent;
}

async function read<T>(key: string): Promise<T | undefined> {
  await storageAvailable();
  if (persistent) return get<T>(key);
  return mem.has(key) ? structuredClone(mem.get(key) as T) : undefined;
}

async function write(key: string, value: unknown): Promise<void> {
  await storageAvailable();
  if (persistent) await set(key, value);
  else mem.set(key, structuredClone(value));
}

async function remove(key: string): Promise<void> {
  await storageAvailable();
  if (persistent) await del(key);
  else mem.delete(key);
}

/** Atomic read-modify-write of the issue list (one IndexedDB transaction), so concurrent writes can't drop each other. */
async function mutateIssues(fn: (issues: Issue[]) => Issue[]): Promise<void> {
  await storageAvailable();
  if (persistent) await update<Issue[]>(ISSUES_KEY, (old) => fn(old ?? []));
  else mem.set(ISSUES_KEY, structuredClone(fn(structuredClone((mem.get(ISSUES_KEY) as Issue[] | undefined) ?? []))));
}

// ---- change notification ----

const listeners = new Set<() => void>();

/** Calls `fn` after every write. Returns the unsubscribe function. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

// ---- API ----

export async function getCase(): Promise<CaseFile | null> {
  return (await read<CaseFile>(CASE_KEY)) ?? null;
}

export async function saveCase(c: CaseFile): Promise<void> {
  await write(CASE_KEY, c);
  emit();
}

/** Merges `patch` into the saved case (re-read just now, so a stale copy in a component can't undo a newer write). No case: no-op. */
export async function updateCase(patch: Partial<CaseFile>): Promise<void> {
  const c = await getCase();
  if (c) await saveCase({ ...c, ...patch });
}

/** Newest first. */
export async function listIssues(): Promise<Issue[]> {
  const issues = (await read<Issue[]>(ISSUES_KEY)) ?? [];
  return issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getIssue(id: string): Promise<Issue | null> {
  return (await listIssues()).find((i) => i.id === id) ?? null;
}

/** Insert or replace by id. */
export async function saveIssue(issue: Issue): Promise<void> {
  await mutateIssues((all) => (all.some((i) => i.id === issue.id) ? all.map((i) => (i.id === issue.id ? issue : i)) : [...all, issue]));
  emit();
}

export async function deleteIssue(id: string): Promise<void> {
  await mutateIssues((all) => all.filter((i) => i.id !== id));
  emit();
}

/** Applies `change` to one issue inside the atomic update; throws if it doesn't exist. */
async function changeIssue(id: string, change: (issue: Issue) => Issue): Promise<Issue> {
  let updated: Issue | undefined;
  await mutateIssues((all) =>
    all.map((i) => {
      if (i.id !== id) return i;
      updated = change(i);
      return updated;
    }),
  );
  if (!updated) throw new Error(`Issue ${id} not found`);
  emit();
  return updated;
}

export function addFollowUp(issueId: string, { note, photo }: { note: string; photo?: string }): Promise<Issue> {
  const followUp: FollowUp = { id: crypto.randomUUID(), at: new Date().toISOString(), note, ...(photo ? { photo } : {}) };
  return changeIssue(issueId, (i) => ({ ...i, followUps: [...i.followUps, followUp] }));
}

export function markFixed(issueId: string, at: string = new Date().toISOString()): Promise<Issue> {
  return changeIssue(issueId, (i) => ({ ...i, fixedAt: at }));
}

/** "Delete my case": removes the case and every issue. */
export async function clearAll(): Promise<void> {
  await Promise.all([remove(CASE_KEY), remove(ISSUES_KEY)]);
  emit();
}

// ---- React hook ----

interface CaseData {
  caseFile: CaseFile | null;
  issues: Issue[];
  /** False until the first load finishes (and always on the server). */
  ready: boolean;
  persistent: boolean;
}

async function load(): Promise<CaseData> {
  const [caseFile, issues] = await Promise.all([getCase(), listIssues()]);
  return { caseFile, issues, ready: true, persistent: isPersistent() };
}

/** Case + issues, reloaded after every store write. Reads IndexedDB only in the browser, after mount. */
export function useCaseData(): CaseData & { refresh: () => Promise<void> } {
  const [data, setData] = useState<CaseData>({ caseFile: null, issues: [], ready: false, persistent: true });
  const refresh = useCallback(() => load().then(setData), []);

  useEffect(() => {
    void refresh();
    return subscribe(() => void refresh());
  }, [refresh]);

  return { ...data, refresh };
}
