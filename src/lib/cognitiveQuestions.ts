// 18 cognitive questions (3 per area) + 3 anagraphic prompts.
// Each cognitive answer assigns 0-10 points to its area.
// Final per-area score (0-100) = average of the 3 answers * 10.

export type CognitiveArea = "LOG" | "MEM" | "FOC" | "VOC" | "ANS" | "APP";

export interface CognitiveOption {
  label: string;
  points: number; // 0-10
}

export interface CognitiveQuestion {
  id: string;
  area: CognitiveArea;
  question: string;
  options: CognitiveOption[];
}

export const INSTITUTES_LIST: string[] = [
  'I.I.S.S. "Cartesio" (Triggiano)',
  'I.I.S.S. "De Viti De Marco" (Triggiano / Casamassima)',
  'Liceo Scientifico "Scacchi" (Bari)',
  'Liceo Classico "Flacco" (Bari)',
  'Politecnico di Bari (Poliba)',
  'Università degli Studi di Bari "Aldo Moro" (Uniba)',
  'Liceo Scientifico "Leonardo da Vinci" (Milano)',
  'Liceo Classico "Parini" (Milano)',
  'Liceo Tasso (Roma)',
  'Politecnico di Torino',
  'Altro (Inserisci manualmente)',
];

export const COGNITIVE_QUESTIONS: CognitiveQuestion[] = [
  // LOG
  {
    id: "log1", area: "LOG",
    question: "Davanti a un capitolo di 30 pagine pieno di dettagli storici o tecnici, come inizi a studiare?",
    options: [
      { label: "Lo leggo tutto una volta per avere una visione d'insieme, poi cerco i collegamenti.", points: 10 },
      { label: "Evidenzio le frasi più importanti paragrafo per paragrafo.", points: 5 },
      { label: "Cerco subito un riassunto o uno schema già fatto esternamente per fare prima.", points: 2 },
    ],
  },
  {
    id: "log2", area: "LOG",
    question: "Quando devi spiegare un concetto difficile a un tuo compagno di classe:",
    options: [
      { label: "Ricorri a metafore, esempi pratici o paragoni assurdi ma efficaci.", points: 10 },
      { label: "Gli mostri direttamente gli appunti o lo schema che hai usato tu.", points: 6 },
      { label: "Gli ripeti la definizione precisa del libro usando le parole esatte.", points: 4 },
    ],
  },
  {
    id: "log3", area: "LOG",
    question: "Se trovi due informazioni che sembrano contraddirsi nello stesso testo:",
    options: [
      { label: "Ti fermi finché non capisci qual è il nesso logico o la causa della differenza.", points: 10 },
      { label: "Chiedi spiegazioni o cerchi su internet un terzo punto di vista per chiarire.", points: 7 },
      { label: "Ne memorizzi una delle due, sperando che non sia l'argomento principale.", points: 2 },
    ],
  },
  // MEM
  {
    id: "mem1", area: "MEM",
    question: "Come ricordi date storiche, formule matematiche o vocaboli di una nuova lingua?",
    options: [
      { label: "Sfrutto schemi, flashcard o test ripetuti a distanza di giorni per testarmi.", points: 10 },
      { label: "Devo associarle a un contesto, a una storia o a un pattern visivo.", points: 6 },
      { label: "Le ripeto a memoria decine di volte finché non si fissano in testa.", points: 4 },
    ],
  },
  {
    id: "mem2", area: "MEM",
    question: "Cosa succede se studi un argomento perfettamente una settimana prima di una verifica, senza più toccarlo?",
    options: [
      { label: "Ricordo quasi tutto senza problemi, ho una memoria molto stabile.", points: 10 },
      { label: "Ricordo solo i concetti macroscopici, i dettagli sono svaniti.", points: 6 },
      { label: "Devo assolutamente rifare un ripasso totale il pomeriggio prima.", points: 3 },
    ],
  },
  {
    id: "mem3", area: "MEM",
    question: "Durante un compito in classe, quando sai di aver studiato una cosa ma non ti viene in mente la parola esatta:",
    options: [
      { label: "Ti viene in mente la posizione esatta della pagina sul libro, ma non il testo.", points: 8 },
      { label: "Ricostruisci il ragionamento logico per arrivarci indirettamente.", points: 5 },
      { label: "Vai in blocco e passi alla domanda successiva.", points: 2 },
    ],
  },
  // FOC
  {
    id: "foc1", area: "FOC",
    question: "Mentre studi una materia che non ti fa impazzire, ogni quanto senti il bisogno di controllare il telefono o fare una pausa?",
    options: [
      { label: "Entro in modalità 'tunnel': se inizio, non mi fermo finché non ho finito.", points: 10 },
      { label: "Posso andare avanti anche per un'ora di fila se l'ambiente è silenzioso.", points: 8 },
      { label: "Riesco a stare concentrato al massimo per 15-20 minuti, poi devo staccare.", points: 3 },
    ],
  },
  {
    id: "foc2", area: "FOC",
    question: "Qual è il tuo ambiente di studio ideale?",
    options: [
      { label: "Silenzio assoluto, scrivania vuota e nessun dispositivo visibile.", points: 10 },
      { label: "Musica di sottofondo (lo-fi, strumentale) o rumore bianco.", points: 7 },
      { label: "Letto o divano, spesso con TV accesa o persone che parlano nella stanza.", points: 2 },
    ],
  },
  {
    id: "foc3", area: "FOC",
    question: "Se una notifica interrompe la tua sessione, quanto impieghi a ritrovare la concentrazione massima?",
    options: [
      { label: "Non tengo il telefono nella stanza o è in 'Non Disturbare' profondo.", points: 10 },
      { label: "Rispondo al volo e mi rimetto subito a leggere senza perdere il filo.", points: 7 },
      { label: "Mi distraggo e passano 10-15 minuti prima di riprendere sul serio.", points: 3 },
    ],
  },
  // VOC
  {
    id: "voc1", area: "VOC",
    question: "Quando il professore ti fa una domanda a sorpresa durante un'interrogazione orale:",
    options: [
      { label: "Inizi a parlare subito, strutturando frase e ragionamento mentre ti esprimi.", points: 10 },
      { label: "Ti prendi 5-10 secondi di silenzio per ordinare la scaletta dei concetti.", points: 8 },
      { label: "Sai la risposta ma usi termini colloquiali o ripetizioni (\"tipo\", \"praticamente\").", points: 4 },
    ],
  },
  {
    id: "voc2", area: "VOC",
    question: "Nello scrivere un testo argomentativo o una risposta aperta:",
    options: [
      { label: "Vari molto il lessico, usando sinonimi precisi e connettivi logici complessi.", points: 10 },
      { label: "Tendi ad essere molto sintetico e dritto al punto, con pochi aggettivi.", points: 6 },
      { label: "Ripeti spesso gli stessi concetti con parole leggermente diverse.", points: 3 },
    ],
  },
  {
    id: "voc3", area: "VOC",
    question: "Come valuti la tua fluidità quando parli davanti alla classe?",
    options: [
      { label: "Molto sicura, cambio tono di voce e mantengo il contatto visivo.", points: 10 },
      { label: "Buona, ma se perdo il filo tendo a mangiarmi le parole o accelerare.", points: 6 },
      { label: "Preferisco i test scritti; parlare in pubblico mi fa balbettare.", points: 2 },
    ],
  },
  // ANS
  {
    id: "ans1", area: "ANS",
    question: "Mancano 5 minuti alla consegna e l'ultimo esercizio è completamente sbagliato. Cosa fai?",
    options: [
      { label: "Cancello con calma la parte errata e riscrivo una sintesi corretta col tempo rimasto.", points: 10 },
      { label: "Lascio tutto così com'è per evitare di peggiorare per la fretta.", points: 5 },
      { label: "Il cuore inizia a battere a mille, vado in confusione e non correggo in tempo.", points: 2 },
    ],
  },
  {
    id: "ans2", area: "ANS",
    question: "Come vivi i giorni immediatamente precedenti a un'interrogazione decisiva?",
    options: [
      { label: "Sereno, se ho studiato so che andrà bene. Dormo normalmente.", points: 10 },
      { label: "Sento una leggera tensione che mi aiuta a rimanere focalizzato.", points: 8 },
      { label: "Ho ansia costante, mal di stomaco e fatico ad addormentarmi la notte prima.", points: 2 },
    ],
  },
  {
    id: "ans3", area: "ANS",
    question: "Se il professore muove una critica forte a una tua risposta in una simulazione:",
    options: [
      { label: "Analizzi l'errore freddamente per capire dove il ragionamento ha fatto cilecca.", points: 10 },
      { label: "Cerchi di giustificare la tua risposta spiegando cosa intendevi dire.", points: 6 },
      { label: "La prendi sul personale e ti demoralizzi per il resto della lezione.", points: 3 },
    ],
  },
  // APP
  {
    id: "app1", area: "APP",
    question: "Dopo aver studiato una regola di fisica o un teorema di matematica:",
    options: [
      { label: "Riesco ad applicarla subito anche a problemi con varianti che il libro non spiegava.", points: 10 },
      { label: "Ho bisogno di vedere 3-4 esempi svolti passo-passo prima di provare da solo.", points: 5 },
      { label: "Preferisco imparare la teoria a memoria; l'applicazione mi richiede molto sforzo.", points: 2 },
    ],
  },
  {
    id: "app2", area: "APP",
    question: "Quando affronti un problema di programmazione o di logica che non si risolve al primo colpo:",
    options: [
      { label: "Scompongo il problema in sotto-problemi più piccoli e li risolvo uno alla volta.", points: 10 },
      { label: "Vado per tentativi cambiando i dati finché non esce il risultato.", points: 4 },
      { label: "Mi blocco e cerco subito la soluzione o il codice già pronto online.", points: 2 },
    ],
  },
  {
    id: "app3", area: "APP",
    question: "Nello studio della grammatica (italiana o inglese), preferisci:",
    options: [
      { label: "Fare tantissimi esercizi pratici finché la regola non diventa automatica.", points: 10 },
      { label: "Leggere testi o ascoltare dialoghi reali per assorbire la regola implicitamente.", points: 7 },
      { label: "Studiare le regole generali e le eccezioni dal libro.", points: 4 },
    ],
  },
];

export function computeAreaScores(answers: Record<string, number>): Record<CognitiveArea, number> {
  const areas: CognitiveArea[] = ["LOG", "MEM", "FOC", "VOC", "ANS", "APP"];
  const out = {} as Record<CognitiveArea, number>;
  for (const area of areas) {
    const qs = COGNITIVE_QUESTIONS.filter((q) => q.area === area);
    const pts = qs.map((q) => answers[q.id] ?? 0);
    const avg = pts.reduce((a, b) => a + b, 0) / qs.length; // 0-10
    out[area] = Math.round(avg * 10); // 0-100
  }
  return out;
}