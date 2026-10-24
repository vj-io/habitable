"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@/components/doodle";

// The inline script in app/layout.tsx sets <html data-theme> before first paint (saved choice, else the
// system setting). This button flips that attribute and remembers the choice on this device.
const KEY = "habitable-theme";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const current = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  // null on the server and during hydration, so the markup matches; the real theme follows right after.
  const theme = useSyncExternalStore(subscribe, current, () => null);
  const next = theme === "dark" ? "light" : "dark";

  function flip() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private mode: the choice lasts for this page only
    }
    listeners.forEach((l) => l());
  }

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      title={theme ? `Switch to ${next} theme` : undefined}
      className="doodle-btn grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-ink/5"
    >
      <Moon size={24} className="dark:hidden" />
      <Sun size={24} className="hidden dark:block" />
    </button>
  );
}
