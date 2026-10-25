import Link from "next/link";
import { Arrow } from "@/components/doodle";

/** The same way back to the case file on every inner page. */
export function BackLink({ href = "/", children = "Back to your case file" }: { href?: string; children?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 font-mono text-xs font-medium tracking-[0.12em] uppercase underline decoration-2 underline-offset-4 hover:decoration-wavy"
    >
      <Arrow direction="left" size={20} />
      {children}
    </Link>
  );
}
