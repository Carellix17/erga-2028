import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SeoHead } from "@/components/SeoHead";

export interface LegalSection {
  title: string;
  body: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  intro: string;
  path: string;
  description: string;
  updated: string;
  sections: LegalSection[];
  otherLink: { to: string; label: string };
}

/** Pagina pubblica di testo legale: leggibile, semantica, senza animazioni. */
export function LegalDocument({ title, intro, path, description, updated, sections, otherLink }: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title={`${title} — Erga`} description={description} path={path} />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Torna a Erga
        </Link>
        <h1 className="mt-6 font-display text-3xl sm:text-4xl leading-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ultimo aggiornamento: {updated}</p>
        <p className="mt-6 text-base leading-relaxed">{intro}</p>

        <nav aria-label="Indice" className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Indice</h2>
          <ol className="mt-3 space-y-1.5 text-base">
            {sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#s${i + 1}`} className="underline-offset-4 hover:underline">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.title} id={`s${i + 1}`} className="scroll-mt-6">
              <h2 className="font-display text-xl sm:text-2xl">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Leggi anche:{" "}
          <Link to={otherLink.to} className="font-medium text-foreground underline underline-offset-4">
            {otherLink.label}
          </Link>
        </footer>
      </main>
    </div>
  );
}
