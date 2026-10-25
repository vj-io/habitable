import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Arrow, Doc, DoodleButton, DoodleCard, Highlight, MonoLabel, NumberCircle } from "@/components/doodle";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BackLink } from "@/components/site/BackLink";

export const metadata: Metadata = {
  title: "Next steps and your rights — Habitable",
  description:
    "What usually comes after a repair notice in NYC: 311 and an HPD inspection, an HP Action in Housing Court, free legal help, rent reductions for rent-stabilized tenants, and protection from retaliation. Every fact links to the official page.",
};

const linkClass = "underline decoration-2 underline-offset-4 hover:decoration-wavy";

/** Official page, new tab. Own line + 44px tall so it's easy to hit on a phone. */
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center leading-snug`}>
      {children} ↗
    </a>
  );
}

/** Phone number as a tel: link. `dial` is the number to dial, `children` what the page shows. */
function Tel({ dial, children }: { dial: string; children: ReactNode }) {
  return (
    <a href={`tel:${dial}`} className={`${linkClass} inline-flex min-h-11 items-center font-mono font-bold whitespace-nowrap`}>
      {children}
    </a>
  );
}

/** A row of tel: links (44px tall each), kept out of the prose so they don't stretch the line height. */
function Numbers({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-5">{children}</div>;
}

function Sources({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-0.5 pt-1">
      <MonoLabel as="p">Official pages</MonoLabel>
      <ul>{children}</ul>
    </div>
  );
}

function Step({ n, title, id, children }: { n: number; title: string; id: string; children: ReactNode }) {
  return (
    <li>
      <DoodleCard as="article" seed={500 + n} padding="1.25rem" appear={false} draw={false} aria-labelledby={id} className="space-y-3">
        <div className="flex items-center gap-3">
          <NumberCircle n={n} />
          <h3 id={id} className="font-display text-2xl leading-tight font-extrabold">
            {title}
          </h3>
        </div>
        {children}
      </DoodleCard>
    </li>
  );
}

/** Hand-drawn arrow and a few words between two steps. */
function Then({ children }: { children: ReactNode }) {
  return (
    <li aria-hidden="true" className="flex items-center gap-2 pl-4 text-muted">
      <Arrow direction="down" size={28} />
      <span className="font-hand text-xl">{children}</span>
    </li>
  );
}

function Side({ title, id, tone = "paper", children }: { title: string; id: string; tone?: "paper" | "marker"; children: ReactNode }) {
  return (
    <DoodleCard as="article" tone={tone} seed={600 + id.length} padding="1.25rem" appear={false} draw={false} aria-labelledby={id} className="space-y-3">
      <h3 id={id} className="font-display text-xl leading-tight font-extrabold">
        {title}
      </h3>
      {children}
    </DoodleCard>
  );
}

export default function NextStepsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 space-y-10 px-4 pt-4 pb-10 sm:px-6">
        <BackLink />

        <header className="max-w-3xl space-y-4">
          <MonoLabel as="p">After the notice</MonoLabel>
          <h1 className="font-display text-[2.4rem] leading-[1.02] font-extrabold sm:text-6xl">
            Next steps &amp; <Highlight>your rights</Highlight>
          </h1>
          <p className="text-lg leading-relaxed text-ink/85">
            Most repair problems start with a letter, then a 311 complaint, and only sometimes a court case. Here is that order in plain words,
            with the official page behind each fact.
          </p>
          <p className="font-hand text-xl leading-snug">
            <span className="font-mono text-[0.75rem] tracking-[0.14em] uppercase">Not legal advice.</span> Habitable documents and cites; it can&apos;t
            tell you what fits your situation. A tenant lawyer or housing group can.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
          <section aria-labelledby="ladder-title" className="space-y-4">
            <h2 id="ladder-title" className="font-display text-2xl font-extrabold">
              The usual order
            </h2>
            <ol className="space-y-2">
              <Step n={1} title="Tell the landlord in writing" id="step-1">
                <p className="leading-snug">
                  HPD says to start with the property owner, managing agent or building superintendent. If that doesn&apos;t work, write to the owner
                  and the management company by certified mail, and keep a copy. That&apos;s what the notice is for.
                </p>
                <p className="leading-snug">Keep a record of every try. HPD says it can be useful in court.</p>
                <DoodleButton href="/notice" icon={<Doc size={22} />}>
                  Make the notice
                </DoodleButton>
                <Sources>
                  <li>
                    <Ext href="https://www.nyc.gov/site/hpd/services-and-information/tenants-rights-and-responsibilities.page">
                      HPD: tenants&apos; rights and responsibilities
                    </Ext>
                  </li>
                </Sources>
              </Step>

              <Then>still nothing?</Then>

              <Step n={2} title="File with 311 for an HPD inspection" id="step-2">
                <p className="leading-snug">
                  Call 311, file online, or use the 311 app. HPD says to contact the landlord first. You can file without giving your name; for heat,
                  the inspector then picks an apartment at random.
                </p>
                <Numbers>
                  <Tel dial="311">Call 311</Tel>
                  <Tel dial="+12125044115">TTY (212) 504-4115</Tel>
                </Numbers>
                <p className="leading-snug">
                  You get a service request number. Track it on 311 or on HPD Online. HPD mails any violation to the managing agent. The notice screen has
                  311 text ready to copy.
                </p>
                <Sources>
                  <li>
                    <Ext href="https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page">HPD: report a maintenance issue</Ext>
                  </li>
                  <li>
                    <Ext href="https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water-information.page">HPD: heat and hot water</Ext>
                  </li>
                  <li>
                    <Ext href="https://portal.311.nyc.gov/">NYC 311 online</Ext>
                  </li>
                  <li>
                    <Ext href="https://portal.311.nyc.gov/article/?kanumber=KA-01025">NYC 311 app</Ext>
                  </li>
                </Sources>
              </Step>

              <Then>repairs still not made?</Then>

              <Step n={3} title="HP Action in Housing Court" id="step-3">
                <p className="leading-snug">
                  A tenant can bring a case against a property owner in Housing Court to force repairs and essential services, like heat and hot water.
                  You start at the Housing Court Clerk&apos;s Office. HPD says you don&apos;t need a lawyer to start an HP case.
                </p>
                <p className="leading-snug">
                  JustFix&apos;s guide walks through the steps: a packet from the clerk, a judge signs an Order to Show Cause, you serve the landlord, and HPD
                  inspects before the first court date. It says the filing fee is $45, with a fee waiver available; ask the clerk to confirm.
                </p>
                <Sources>
                  <li>
                    <Ext href="https://www.nyc.gov/site/hpd/services-and-information/housing-court.page">HPD: Housing Court</Ext>
                  </li>
                  <li>
                    <Ext href="https://www.nycourts.gov/new-york-city-housing-court/starting-hp-proceeding-obtain-repairs">
                      NY Courts: starting an HP proceeding
                    </Ext>
                  </li>
                  <li>
                    <Ext href="https://www.justfix.org/en/learn/guide-to-hp-actions/">JustFix: guide to HP Actions</Ext>
                  </li>
                </Sources>
              </Step>
            </ol>
          </section>

          <section aria-labelledby="help-title" className="space-y-4">
            <h2 id="help-title" className="font-display text-2xl font-extrabold">
              Help and rights
            </h2>

            <Side title="Free legal help" id="side-help" tone="marker">
              <ul className="space-y-2 leading-snug">
                <li>Call 311 and ask for the Tenant Helpline (Mayor&apos;s Public Engagement Unit, Monday to Friday, 9:30am to 5pm).</li>
                <li>
                  The city&apos;s Office of Civil Justice lists free legal services for tenants in every ZIP code, whatever your immigration status.
                </li>
                <li>
                  Right to Counsel: call 311 and ask for Right to Counsel. If you get court papers, say &ldquo;I would like an attorney&rdquo; at your
                  first appearance.
                </li>
              </ul>
              <Numbers>
                <Tel dial="311">Call 311</Tel>
              </Numbers>
              <Sources>
                <li>
                  <Ext href="https://www.nyc.gov/site/mayorspeu/programs/tenant-support-unit.page">Tenant Helpline</Ext>
                </li>
                <li>
                  <Ext href="https://www.nyc.gov/site/hra/help/legal-services-for-tenants.page">HRA: legal services for tenants</Ext>
                </li>
                <li>
                  <Ext href="https://www.nyc.gov/site/mayorspeu/resources/right-to-counsel.page">Right to Counsel</Ext>
                </li>
                <li>
                  <Ext href="https://nyc.gov/tenantresourceportal">Tenant resource portal</Ext>
                </li>
              </Sources>
              <div className="space-y-0.5 border-t-2 border-dashed border-ink/20 pt-3">
                <MonoLabel as="p">Hotlines · hours change, check first</MonoLabel>
                <ul className="leading-snug">
                  <li>
                    <Ext href="https://www.metcouncilonhousing.org/">Met Council on Housing</Ext> <Tel dial="+12129790611">(212) 979-0611</Tel>
                  </li>
                  <li>
                    <Ext href="https://housingcourtanswers.org/contact-us/">Housing Court Answers</Ext> <Tel dial="+12129624795">(212) 962-4795</Tel>
                    <span className="block text-[0.9375rem] text-muted">Monday to Friday, 9am to 5pm, English and Spanish</span>
                  </li>
                </ul>
              </div>
            </Side>

            <Side title="If your apartment is rent-stabilized" id="side-dhcr">
              <p className="leading-snug">
                You can ask the state (NYS Homes and Community Renewal, also called DHCR) to reduce your rent when services decrease. RA-84 is for
                building-wide problems, RA-81 for problems inside your apartment, and HHW-1 for heat and hot water, which needs a city agency report such as
                an HPD violation. HCR recommends telling the owner in writing first, but doesn&apos;t require it.
              </p>
              <p className="leading-snug">
                Habitable never suggests holding back rent. A reduction is something the state orders; talk to a housing group before you change what you
                pay.
              </p>
              <p className="leading-snug">Not sure you&apos;re stabilized? Ask HCR online, or call its rent office.</p>
              <Numbers>
                <Tel dial="+18334990343">1-833-499-0343</Tel>
              </Numbers>
              <Sources>
                <li>
                  <Ext href="https://hcr.ny.gov/living-conditions-and-essential-services">HCR: living conditions and essential services</Ext>
                </li>
                <li>
                  <Ext href="https://hcr.ny.gov/form-ra-84">Form RA-84, building-wide</Ext>
                </li>
                <li>
                  <Ext href="https://hcr.ny.gov/form-ra-81">Form RA-81, your apartment</Ext>
                </li>
                <li>
                  <Ext href="https://hcr.ny.gov/form-hhw-1">Form HHW-1, heat and hot water</Ext>
                </li>
                <li>
                  <Ext href="https://rent.hcr.ny.gov/RentConnect/Tenant/Overview">Rent Connect (file online)</Ext>
                </li>
                <li>
                  <Ext href="https://portal.hcr.ny.gov/app/ask">Ask HCR: rent history and stabilization</Ext>
                </li>
              </Sources>
            </Side>

            <Side title="Warranty of habitability" id="side-warranty">
              <p className="leading-snug">
                New York law says your landlord promises that your apartment is fit for human habitation and free of conditions dangerous, hazardous or
                detrimental to life, health or safety. A lease can&apos;t take that promise away.
              </p>
              <Sources>
                <li>
                  <Ext href="https://www.nysenate.gov/legislation/laws/RPP/235-B">NY Real Property Law §235-b</Ext>
                </li>
              </Sources>
            </Side>

            <Side title="Protection from retaliation" id="side-retaliation">
              <p className="leading-snug">
                A landlord may not evict you or substantially change your tenancy as payback for a good-faith complaint to the landlord or a government
                agency. If something like that happens within one year after you complain, the law presumes it was retaliation, and the landlord can try
                to rebut that. Owner-occupied buildings with fewer than four units are exempt.
              </p>
              <p className="leading-snug">Your dated notice and your 311 request number show when you complained.</p>
              <Sources>
                <li>
                  <Ext href="https://www.nysenate.gov/legislation/laws/RPP/223-B">NY Real Property Law §223-b</Ext>
                </li>
              </Sources>
            </Side>
          </section>
        </div>

        <p className="max-w-3xl font-mono text-xs leading-relaxed tracking-[0.06em] text-muted uppercase">
          Not legal advice · Summaries of the official pages linked above · Phone hours and rules change, so check the page before you rely on it
        </p>
      </main>
    </>
  );
}
