import { useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  FileText,
  Globe2,
  Image as ImageIcon,
  ListTree,
  type LucideIcon,
} from "lucide-react";

interface JourneyStep {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  Icon: LucideIcon;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "materiale",
    number: "01",
    eyebrow: "Materiale",
    title: "Parti da ciò che studi davvero.",
    description: "Carica un PDF, una foto del quaderno, un documento oppure scegli una fonte web.",
    detail: "Nessun catalogo imposto: il punto di partenza è il materiale della tua classe.",
    Icon: FileText,
  },
  {
    id: "struttura",
    number: "02",
    eyebrow: "Struttura",
    title: "Erga trova il filo.",
    description: "I concetti vengono ordinati in moduli, collegamenti e priorità che puoi controllare.",
    detail: "Il capitolo smette di essere un blocco unico e diventa una mappa leggibile.",
    Icon: ListTree,
  },
  {
    id: "studio",
    number: "03",
    eyebrow: "Studio",
    title: "La mappa diventa un percorso.",
    description: "Segui lezioni brevi, riprendi dal punto giusto e genera esercizi sugli argomenti scelti.",
    detail: "Ogni tappa ha uno scopo chiaro: capire, richiamare oppure mettere in pratica.",
    Icon: BookOpenCheck,
  },
  {
    id: "piano",
    number: "04",
    eyebrow: "Piano",
    title: "Il percorso entra nella tua settimana.",
    description: "Aggiungi verifiche e impegni, poi controlla la proposta prima di salvarla nel calendario.",
    detail: "Il piano è un suggerimento modificabile, non un programma imposto.",
    Icon: CalendarClock,
  },
];

export function MaterialJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.journeyStep);
        if (Number.isFinite(index)) setActiveStep(index);
      },
      { threshold: [0.35, 0.6, 0.85], rootMargin: "-22% 0px -28% 0px" },
    );

    stepRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="lp-journey" id="prodotto">
      <div className="lp-wrap">
        <div className="lp-sec-head lp-reveal">
          <p className="lp-eyebrow">Dal materiale al percorso</p>
          <h2 className="lp-h2">Quattro passaggi. Un solo filo.</h2>
          <p className="lp-lead">
            Erga non sostituisce il tuo materiale: lo trasforma in una sequenza che puoi capire, controllare e seguire.
          </p>
        </div>

        <div className="lp-journey-grid">
          <div className="lp-journey-visual" aria-hidden="true">
            <div className="lp-journey-sticky">
              <div className="lp-journey-visual-head">
                <span>Trasformazione in corso</span>
                <strong>{JOURNEY_STEPS[activeStep].number} / 04</strong>
              </div>

              <div className="lp-journey-canvas">
                <div className="lp-journey-rail">
                  <span style={{ transform: `scaleY(${(activeStep + 1) / JOURNEY_STEPS.length})` }} />
                </div>

                <div className={`lp-journey-layer${activeStep === 0 ? " is-active" : ""}`}>
                  <div className="lp-source-stack">
                    <div className="lp-source-sheet pdf"><FileText /><span>Dispensa.pdf</span></div>
                    <div className="lp-source-sheet photo"><ImageIcon /><span>Foto quaderno</span></div>
                    <div className="lp-source-sheet web"><Globe2 /><span>Fonte web</span></div>
                  </div>
                </div>

                <div className={`lp-journey-layer${activeStep === 1 ? " is-active" : ""}`}>
                  <div className="lp-topic-map">
                    <span className="main">Cinematica</span>
                    <span>Moto</span>
                    <span>Velocità</span>
                    <span>Accelerazione</span>
                    <span className="thread a" /><span className="thread b" /><span className="thread c" />
                  </div>
                </div>

                <div className={`lp-journey-layer${activeStep === 2 ? " is-active" : ""}`}>
                  <div className="lp-path-preview">
                    {["Concetto", "Quiz", "Esempio", "Pratica"].map((label, index) => (
                      <div key={label} className="lp-path-node">
                        <b>{index + 1}</b><span>{label}</span>
                      </div>
                    ))}
                    <svg viewBox="0 0 220 250" preserveAspectRatio="none">
                      <path d="M58 30 C170 68 48 116 162 158 S74 224 156 232" />
                    </svg>
                  </div>
                </div>

                <div className={`lp-journey-layer${activeStep === 3 ? " is-active" : ""}`}>
                  <div className="lp-plan-preview">
                    <div><time>15:10</time><span>Lezione breve</span><b>18 min</b></div>
                    <div><time>15:35</time><span>Esercizi mirati</span><b>12 min</b></div>
                    <div><time>16:00</time><span>Richiamo</span><b>6 min</b></div>
                    <p>Proposta modificabile prima del salvataggio</p>
                  </div>
                </div>
              </div>

              <div className="lp-journey-visual-foot">
                <span>{JOURNEY_STEPS[activeStep].eyebrow}</span>
                <strong>{JOURNEY_STEPS[activeStep].title}</strong>
              </div>
            </div>
          </div>

          <div className="lp-journey-copy">
            {JOURNEY_STEPS.map((step, index) => (
              <article
                key={step.id}
                id={step.id === "piano" ? "piano" : undefined}
                ref={(element) => { stepRefs.current[index] = element; }}
                data-journey-step={index}
                data-active={activeStep === index}
                className="lp-journey-step"
              >
                <div className="lp-journey-step-icon" aria-hidden><step.Icon /></div>
                <div>
                  <p className="lp-journey-step-label"><span>{step.number}</span>{step.eyebrow}</p>
                  <h3 className="lp-h3">{step.title}</h3>
                  <p>{step.description}</p>
                  <small>{step.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
