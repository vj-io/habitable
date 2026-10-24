import { DoodleButton, DoodleCard, MonoLabel } from "@/components/doodle";
import { Wordmark } from "@/components/site/Wordmark";

export default function NotFound() {
  return (
    <>
      <header className="mx-auto w-full max-w-[1100px] px-4 pt-5 sm:px-6">
        <Wordmark />
      </header>
      <main id="main" className="mx-auto grid w-full max-w-lg flex-1 content-center px-4 py-16">
        <DoodleCard seed={4} padding="1.75rem" className="space-y-3">
          <MonoLabel as="p">404 · not on record</MonoLabel>
          <h1 className="font-display text-3xl leading-tight font-extrabold">This page isn&apos;t on file.</h1>
          <p className="font-hand text-xl leading-snug text-muted">The link might be old, or it was never written down. Your case is still where you left it.</p>
          <div className="pt-2">
            <DoodleButton href="/">Back to your case</DoodleButton>
          </div>
        </DoodleCard>
      </main>
    </>
  );
}
