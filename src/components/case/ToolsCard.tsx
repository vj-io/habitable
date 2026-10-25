import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow, Building, DoodleCard, MonoLabel, Shield } from "@/components/doodle";

const TOOLS: { href: string; title: string; body: string; icon: ReactNode }[] = [
  { href: "/ask", title: "Ask the law", body: "Answers only in quotes from the housing code, each checked by code.", icon: <Shield size={24} /> },
  { href: "/landlord", title: "This landlord's record", body: "Every building under the same owner or agent, from seven city datasets.", icon: <Building size={24} /> },
  { href: "/next-steps", title: "Next steps & your rights", body: "Letter, 311, Housing Court — with free legal help.", icon: <Arrow size={24} /> },
];

/** The case file's other tools, one tap away (the menu and footer have them too). */
export function ToolsCard() {
  return (
    <DoodleCard as="section" seed={23} padding="1.25rem" appear={false} aria-labelledby="tools-title" className="space-y-2">
      <MonoLabel as="h2">
        <span id="tools-title">More tools</span>
      </MonoLabel>
      <ul className="divide-y-2 divide-dashed divide-ink/15">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="group flex min-h-14 items-start gap-3 py-3">
              <span className="mt-0.5 shrink-0">{t.icon}</span>
              <span className="min-w-0">
                <span className="block font-display text-lg leading-tight font-bold underline decoration-transparent decoration-2 underline-offset-4 group-hover:decoration-wavy group-hover:decoration-ink">
                  {t.title}
                </span>
                <span className="block text-[0.9375rem] leading-snug text-muted">{t.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DoodleCard>
  );
}
