import { useState } from "react";
import { BookOpenCheck, CalendarClock, FileText, Globe2, Image as ImageIcon } from "lucide-react";
import { PhoneHome, PhonePiano, PhoneShell, PhoneStudio } from "./PhoneMocks";

const JOURNEY_STEPS = [
  {
    id: "materiale",
    label: "Materiale",
    title: "Parti da ciò che studi davvero.",
    description: "Carica PDF, documenti e foto, oppure cerca una fonte web. Erga parte dal materiale della tua classe.",
    Icon: FileText,
  },
  {
    id: "percorso",
    label: "Percorso",
    title: "La mappa diventa un percorso.",
    description: "I concetti diventano moduli, lezioni brevi ed esercizi. Riprendi sempre dal punto giusto.",
    Icon: BookOpenCheck,
  },
  {
    id: "piano",
    label: "Piano",
    title: "Il percorso entra nella tua settimana.",
    description: "Aggiungi verifiche e impegni, poi controlla e modifica la proposta prima di salvarla.",
    Icon: CalendarClock,
  },
] as const;

const SUBJECTS = {
  fisica: { label: "Fisica", title: "Cinematica e moto rettilineo", tasks: ["Ripassa le formule", "8 esercizi sulla velocità", "Richiamo attivo"] },
  italiano: { label: "Italiano", title: "I Promessi Sposi, capitoli 9-12", tasks: ["Mappa dei personaggi", "Capitolo 10 guidato", "5 domande per l’orale"] },
  latino: { label: "Latino", title: "Sintassi dei casi", tasks: ["Schema dei casi", "Riconosci le desinenze", "Versione guidata"] },
} as const;

type SubjectKey = keyof typeof SUBJECTS;

export function MaterialJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const [subject, setSubject] = useState<SubjectKey>("fisica");
  const current = JOURNEY_STEPS[activeStep];
  const subjectData = SUBJECTS[subject];

  return (
    <section className="lp-journey" id="prodotto">
      <div className="lp-wrap">
        <div className="lp-sec-head">
          <h2 className="lp-h2">Dal materiale della tua classe a un percorso da seguire.</h2>
          <p className="lp-lead">
            Scegli una materia e attraversa il flusso. L’esempio è dimostrativo e usa funzioni disponibili nella beta.
          </p>
        </div>
        <div className="lp-journey-subjects" role="group" aria-label="Scegli una materia per l’esempio">
          {(Object.keys(SUBJECTS) as SubjectKey[]).map((key) => (
            <button key={key} type="button" aria-pressed={subject === key} onClick={() => setSubject(key)}>{SUBJECTS[key].label}</button>
          ))}
        </div>
        <div className="lp-journey-grid">
          <div className="lp-journey-copy">
            <div className="lp-journey-tabs" role="tablist" aria-label="Dal materiale al piano">
              {JOURNEY_STEPS.map((step, index) => (
                <button key={step.id} type="button" role="tab" aria-selected={activeStep === index} aria-controls="journey-panel" onClick={() => setActiveStep(index)}>
                  <step.Icon aria-hidden /><span>{step.label}</span>
                </button>
              ))}
            </div>
            <div id="journey-panel" role="tabpanel" className="lp-journey-detail" key={`${current.id}-${subject}`}>
              <p>{subjectData.label}</p>
              <h3>{current.title}</h3>
              <p>{current.description}</p>
              {activeStep === 0 && (
                <div className="lp-source-row" aria-label="Materiali supportati">
                  <span><FileText aria-hidden />PDF</span><span><ImageIcon aria-hidden />Foto</span><span><Globe2 aria-hidden />Web</span>
                </div>
              )}
            </div>
          </div>
          <div className="lp-journey-phone" id="piano">
            <PhoneShell tab={activeStep === 0 ? "home" : activeStep === 1 ? "studio" : "piano"} label={`Esempio dimostrativo Erga: ${current.label} per ${subjectData.label}`}>
              <div className="lp-phone-screen-swap" key={`${activeStep}-${subject}`}>
                {activeStep === 0 && <PhoneHome subject={subjectData.label} title={subjectData.title} tasks={subjectData.tasks} duration={18} />}
                {activeStep === 1 && <PhoneStudio />}
                {activeStep === 2 && <PhonePiano />}
              </div>
            </PhoneShell>
            <span className="lp-demo-caption">Esempio dimostrativo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
