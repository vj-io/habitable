import Link from "next/link";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 bg-marker px-4 py-3 font-display font-bold text-on-marker focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto px-4 pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="mx-auto flex max-w-[1100px] flex-col items-center gap-x-2.5 text-center font-mono text-[0.75rem] uppercase tracking-[0.12em] text-muted sm:flex-row sm:justify-center">
        <span className="pt-3 sm:pt-0">Not legal advice · NYC only</span>
        <span aria-hidden="true" className="hidden sm:inline">
          ·
        </span>
        <span>Data: NYC Open Data / HPD</span>
        <span aria-hidden="true" className="hidden sm:inline">
          ·
        </span>
        <Link href="/how-it-works" className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4 hover:text-ink">
          How it works
        </Link>
        <span aria-hidden="true" className="hidden sm:inline">
          ·
        </span>
        <Link href="/next-steps" className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4 hover:text-ink">
          Next steps &amp; rights
        </Link>
      </p>
    </footer>
  );
}
