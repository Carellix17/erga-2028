import { useState } from "react";
import { BookOpen, CalendarDays, Check, GraduationCap, type LucideIcon } from "lucide-react";
import { PhoneLesson, PhonePiano, PhoneShell, PhoneStudio } from "./PhoneMocks";

const VIEWS = {
  studio: {
    label: "Studio",
    eyebrow: "Percorso a tappe",
    title: "Sai sempre dove sei e cosa viene dopo.",
    description: "Il materiale è diviso in moduli e lezioni. Puoi riprendere dal punto interrotto senza cercare tra pagine e file.",
    bullets: ["Moduli ordinati", "Progresso visibile", "Ripresa dal punto giusto"],
    Icon: BookOpen,
    phoneTab: "studio" as const,
  },
  piano: {
    label: "Piano",
    eyebrow: "Settimana modificabile",
    title: "Una proposta che puoi accettare o cambiare.",
    description: "Verifiche, interrogazioni e impegni entrano in un calendario che resta sotto il tuo controllo.",
    bullets: ["Vista mese e settimana", "Impegni personali", "Modalità Focus"],
    Icon: CalendarDays,
    phoneTab: "piano" as const,
  },
  lezione: {
    label: "Lezione",
    eyebrow: "Studio guidato",
    title: "Un concetto alla volta, con il contesto che serve.",
    description: "Le tappe mettono in evidenza il nucleo dell’argomento e lasciano spazio a esempi, fonti ed esercizi.",
    bullets: ["Testo leggibile", "Esempi mirati", "Avanzamento chiaro"],
    Icon: GraduationCap,
    phoneTab: "home" as const,
  },
} satisfies Record<string, {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  Icon: LucideIcon;
  phoneTab: "home" | "piano" | "studio";
}>;

type ViewKey = keyof typeof VIEWS;

export function ProductShowcase() {
  const [activeView, setActiveView] = useState<ViewKey>("studio");
  const view = VIEWS[activeView];

  return (
    <section className="lp-show" id="app">
      <div className="lp-wrap">
        <div className="lp-sec-head lp-reveal">
          <p className="lp-eyebrow">L’app in azione</p>
          <h2 className="lp-h2">Un telefono. Tre modi di studiare.</h2>
          <p className="lp-lead">Scegli una vista e osserva il dettaglio: il prodotto resta al centro, senza ripetere tre volte la stessa cornice.</p>
        </div>

        <div className="lp-showcase-grid lp-reveal">
          <div className="lp-showcase-phone">
            <div className="lp-showcase-orbit" aria-hidden />
            <PhoneShell tab={view.phoneTab} label={`Anteprima Erga: ${view.label}`}>
              {activeView === "studio" && <PhoneStudio />}
              {activeView === "piano" && <PhonePiano />}
              {activeView === "lezione" && <PhoneLesson />}
            </PhoneShell>
          </div>

          <div className="lp-showcase-copy">
            <div className="lp-showcase-tabs" role="group" aria-label="Scegli l’anteprima dell’app">
              {(Object.keys(VIEWS) as ViewKey[]).map((key) => {
                const item = VIEWS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={activeView === key}
                    className={activeView === key ? "is-on" : undefined}
                    onClick={() => setActiveView(key)}
                  >
                    <item.Icon aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="lp-showcase-detail" aria-live="polite">
              <p>{view.eyebrow}</p>
              <h3>{view.title}</h3>
              <p className="lp-showcase-description">{view.description}</p>
              <ul>
                {view.bullets.map((bullet) => (
                  <li key={bullet}><Check aria-hidden />{bullet}</li>
                ))}
              </ul>
            </div>

            <p className="lp-showcase-note">Anteprime dimostrative della beta. Alcuni dettagli possono cambiare.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
