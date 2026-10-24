import Link from "next/link";

/** Hand-drawn house with a check inside, on a slightly mis-registered marker block. */
export function HouseMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 overflow-visible ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.4 19.6 Q11.6 26.6 11.2 35.2 L33 34.8 Q32.4 27 32.8 19.4 L22 10.2 Z" fill="var(--color-marker)" stroke="none" />
      <path d="M4.2 20.4 C9.4 15.4 14.6 10.4 20.2 5.6 C25.6 10.4 30.6 15.2 35.8 20.2" />
      <path d="M9.2 17.4 C9.6 23 9.3 28.2 9.5 33.8 L31 33.5 C30.6 28 30.8 22.4 30.7 17.2" />
      <path d="M14.4 24.8 C15.9 26.2 17.3 27.7 18.5 29.6 C20.6 25.6 23.4 22.4 26.8 20" />
    </svg>
  );
}

export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-2 font-display font-extrabold tracking-[-0.03em] ${size === "lg" ? "text-3xl" : "text-[1.4rem]"}`}
    >
      <HouseMark size={size === "lg" ? 42 : 32} />
      Habitable
    </Link>
  );
}
