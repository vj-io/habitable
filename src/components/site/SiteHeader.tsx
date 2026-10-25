import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

/** Wordmark on the left; page actions (if any) and the theme switch on the right. */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-2 px-4 pt-4 sm:px-6">
      <Wordmark />
      <div className="flex min-w-0 items-center gap-1 min-[360px]:gap-1.5 sm:gap-3">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
