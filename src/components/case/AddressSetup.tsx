"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, DoodleButton, DoodleCard, MonoLabel, SketchBox } from "@/components/doodle";
import { Field, SketchInput, inputClass } from "@/components/site/Field";
import { searchAddresses } from "@/lib/geosearch";
import { saveCase } from "@/lib/store";
import type { Address, BuildingRecord } from "@/lib/types";

type Results = { q: string; items: Address[]; error: boolean };

/** Year built from the city's records; null when unknown or the lookup fails. Never throws. */
function lookupYear(bbl: string): Promise<number | null> {
  return fetch(`/api/building?bbl=${bbl}`)
    .then((r) => (r.ok ? (r.json() as Promise<BuildingRecord>) : null))
    .then((rec) => rec?.yearBuilt ?? null)
    .catch(() => null);
}

const within = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

export function AddressSetup() {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<Promise<number | null> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Address | null>(null);
  const [year, setYear] = useState<{ bbl: string; value: number | null } | null>(null);
  const [unit, setUnit] = useState("");
  const [unitError, setUnitError] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = query.trim();
  useEffect(() => {
    if (selected || q.length < 3) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      // A stalled lookup (null after 8 s) shows the "unavailable" message instead of "looking…" forever.
      within(searchAddresses(q, ac.signal), 8000, null).then(
        (items) => setResults({ q, items: items ?? [], error: !items }),
        () => {
          if (!ac.signal.aborted) setResults({ q, items: [], error: true });
        },
      );
    }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q, selected]);

  const current = !selected && q.length >= 3 && results?.q === q ? results : null;
  const searching = !selected && q.length >= 3 && !current;
  const items = current?.items ?? [];
  const listOpen = open && items.length > 0;
  const message = current?.error
    ? "Address search is unavailable right now. Try again in a moment, or try the demo building."
    : current && items.length === 0
      ? "We couldn't find that NYC address — try number + street + borough."
      : null;

  function select(a: Address) {
    setSelected(a);
    setQuery(a.label);
    setOpen(false);
    setActive(-1);
    setAddressError(false);
    const p = lookupYear(a.bbl);
    yearRef.current = p;
    void p.then((value) => setYear({ bbl: a.bbl, value }));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && listOpen) {
      e.preventDefault();
      select(items[Math.max(active, 0)]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setAddressError(true);
      inputRef.current?.focus();
      return;
    }
    if (!unit.trim()) {
      setUnitError(true);
      document.getElementById("unit")?.focus();
      return;
    }
    setSaving(true);
    // Don't block on the city's records: wait a few seconds at most, then save without a year.
    const yearBuilt = yearRef.current ? await within(yearRef.current, 6000, null) : null;
    await saveCase({
      version: 1,
      address: selected,
      unit: unit.trim(),
      yearBuilt,
      childUnder6: null,
      demo: false,
      createdAt: new Date().toISOString(),
    });
  }

  const yearText = !selected ? "" : year?.bbl !== selected.bbl ? "looking up year built…" : year.value ? `built ${year.value}` : "year built not on record";

  return (
    <form onSubmit={start} noValidate className="space-y-5">
      {!selected ? (
        <div className="relative scroll-mt-4 space-y-1.5">
          <label htmlFor="address" className="block font-display text-base font-bold">
            Your building&apos;s address
          </label>
          <p id="address-hint" className="font-hand text-lg leading-snug text-muted">
            Start typing — like &ldquo;618 West 136th St&rdquo;
          </p>
          <SketchInput>
            <input
              ref={inputRef}
              id="address"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={listOpen && active >= 0 ? `${listId}-${active}` : undefined}
              aria-describedby={`address-hint${message || addressError ? " address-msg" : ""}`}
              aria-invalid={addressError || undefined}
              autoComplete="off"
              spellCheck={false}
              value={query}
              placeholder="Number, street, borough"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={(e) => {
                setOpen(true);
                // Phones: lift the field above the keyboard so the suggestions have room.
                if (window.matchMedia("(max-width: 640px)").matches) e.currentTarget.closest("div.relative")?.scrollIntoView({ block: "start" });
              }}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
              className={inputClass}
            />
            {searching && (
              <span className="pr-4 font-hand text-base whitespace-nowrap text-muted" aria-hidden="true">
                looking…
              </span>
            )}
          </SketchInput>
          <p className="sr-only" aria-live="polite">
            {searching ? "Searching addresses." : current && !current.error ? `${items.length} suggestions.` : ""}
          </p>

          {listOpen && (
            <SketchBox
              as="ul"
              id={listId}
              role="listbox"
              aria-label="Address suggestions"
              seed={27}
              strokeWidth={2.2}
              fill="var(--color-paper-2)"
              shadow="var(--color-ink)"
              className="absolute inset-x-0 top-full z-20 mt-2 p-1.5"
            >
              {items.map((a, i) => (
                <li
                  key={`${a.bbl}-${a.label}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(a)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-[3px] px-3 py-2 ${i === active ? "bg-lime" : ""}`}
                >
                  <span className="leading-tight font-bold">{a.label.split(",")[0]}</span>
                  <span className="font-mono text-[0.75rem] tracking-[0.06em] text-muted">
                    {a.borough} · BBL {a.bbl}
                  </span>
                </li>
              ))}
            </SketchBox>
          )}

          {(message || addressError) && (
            <p id="address-msg" role="alert" className="font-hand text-lg leading-snug text-red-ink">
              {message ?? "Pick your address from the suggestions first."}
            </p>
          )}
        </div>
      ) : (
        <DoodleCard tone="lime" seed={29} padding="1rem 1.25rem" appear={false}>
          <div className="flex items-start gap-3">
            <Check size={26} className="mt-0.5 shrink-0" draw />
            <div className="min-w-0 flex-1 space-y-1">
              <MonoLabel as="p">Found it</MonoLabel>
              <p className="font-display text-lg leading-tight font-bold">{selected.label}</p>
              <p className="font-mono text-[0.8125rem] leading-relaxed text-muted" aria-live="polite">
                {selected.borough} · BBL {selected.bbl} · {yearText}
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <DoodleButton
              variant="ghost"
              onClick={() => {
                setSelected(null);
                setYear(null);
                yearRef.current = null;
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              Not it? Change
            </DoodleButton>
          </div>
        </DoodleCard>
      )}

      <Field
        id="unit"
        label="Apartment / unit"
        error={unitError ? "Add your unit so the notice reaches the right apartment." : undefined}
      >
        <input
          id="unit"
          value={unit}
          required
          aria-invalid={unitError || undefined}
          aria-describedby={unitError ? "unit-error" : undefined}
          autoComplete="address-line2"
          placeholder="e.g. 4B"
          maxLength={20}
          onChange={(e) => {
            setUnit(e.target.value);
            if (e.target.value.trim()) setUnitError(false);
          }}
          className={inputClass}
        />
      </Field>

      <DoodleButton type="submit" size="lg" className="w-full" loading={saving}>
        {saving ? "Opening your case…" : "Start my case"}
      </DoodleButton>
    </form>
  );
}
