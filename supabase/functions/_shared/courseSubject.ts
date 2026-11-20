// Il lessico è condiviso tra Edge e frontend. Le chiavi sono anche quelle delle immagini.
const SUBJECT_KEYWORDS = {
  letteratura_e_grammatica: {
    names: ["letteratura", "grammatica italiana", "italiano", "italian literature"],
    terms: ["grammatica", "poesia", "romanzo", "dante", "manzoni", "leopardi", "figura retorica", "figure retoriche", "narrativa", "sonetto", "epica", "prosa", "verso", "sintassi", "analisi logica"],
  },
  matematica: {
    names: ["matematica", "mathematics", "math"],
    terms: ["algebra", "geometria", "calcolo", "equazione", "equazioni", "funzione", "funzioni", "integrale", "integrali", "derivata", "derivate", "trigonometria", "statistica", "probabilità", "teorema", "disequazioni", "parabola"],
  },
  fisica: {
    names: ["fisica", "physics"],
    terms: ["meccanica", "cinematica", "termodinamica", "elettromagnetismo", "ottica", "quantistica", "relatività", "newton", "legge di newton", "leggi di newton", "energia", "forza", "velocità", "accelerazione", "moto", "gravità", "massa", "densità"],
  },
  informatica: {
    names: ["informatica", "computer science"],
    terms: ["programmazione", "algoritmo", "algoritmi", "database", "software", "hardware", "codice sorgente", "python", "java", "javascript", "web", "computer", "reti informatiche"],
  },
  storia: {
    names: ["storia", "history"],
    terms: ["storico", "storica", "medioevo", "romano", "romana", "impero", "guerra", "rivoluzione", "rinascimento", "risorgimento", "fascismo", "napoleone", "secolo", "guerra mondiale"],
  },
  scienze: {
    names: ["scienze naturali", "biologia", "biology", "scienze", "scienza"],
    terms: ["biodiversità", "ecosistema", "cellula", "cellule", "dna", "rna", "evoluzione", "organismo", "organismi", "genetica", "fotosintesi", "mitosi", "botanica"],
  },
  chimica: {
    names: ["chimica", "chemistry"],
    terms: ["reazione chimica", "reazioni chimiche", "composto", "composti", "tavola periodica", "molecola", "molecole", "atomo", "atomi", "legame covalente", "legami covalenti", "legami chimici", "stechiometria", "acido", "acidi", "ph"],
  },
  filosofia: {
    names: ["filosofia", "philosophy"],
    terms: ["filosofico", "platone", "aristotele", "kant", "hegel", "etica", "metafisica", "epistemologia", "socrate", "nietzsche", "platonico", "ontologia"],
  },
  geografia: {
    names: ["geografia", "geografia fisica", "geography"],
    terms: ["geografico", "territorio", "continente", "clima", "cartografia", "geomorfologia", "idrografia", "paesaggio", "montagna", "fiume", "latitudine", "longitudine"],
  },
  diritto_e_economia: {
    names: ["diritto", "economia", "economics", "giurisprudenza"],
    terms: ["legge", "costituzione", "giuridico", "normativa", "codice civile", "codice penale", "contratto", "finanza", "mercato", "pil", "inflazione", "borsa", "microeconomia", "macroeconomia"],
  },
  lingua_straniera: {
    names: ["lingua straniera", "lingue straniere", "inglese", "francese", "tedesco", "spagnolo", "latino", "greco", "english", "français", "español", "deutsch"],
    terms: ["traduzione", "vocabulary", "grammar", "language", "declinazione", "declinazioni", "past simple", "present perfect", "comprensione orale"],
  },
};

export type CourseImageKey = keyof typeof SUBJECT_KEYWORDS;

export interface CourseSubjectMetadata {
  subject: CourseImageKey;
  confidence: number;
}

export function normalizeSubjectText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const lexicon = (Object.entries(SUBJECT_KEYWORDS) as [
  CourseImageKey, { names: string[]; terms: string[] },
][]).map(([subject, { names, terms }]) => ({
  subject,
  keywords: [
    ...names.map((word) => ({ word, weight: 5 })),
    ...terms.map((word) => ({ word, weight: 2 })),
  ].map(({ word, weight }) => ({ word, weight, normalized: normalizeSubjectText(word) })),
}));

export function classifyCourseSubject(content: string): {
  detectedSubject: CourseImageKey | null;
  confidence: number;
  mainKeywords: string[];
} {
  const normalized = ` ${normalizeSubjectText(content)} `
    .replace(/\b(?:storia dell arte|scienze sociali)\b/g, " ");
  const scores = lexicon.map(({ subject, keywords }) => {
    // Una parola ripetuta vale una volta. Gli spazi delimitano anche le locuzioni.
    const matches = keywords.filter(({ normalized: keyword }) => normalized.includes(` ${keyword} `));
    return {
      subject,
      score: matches.reduce((sum, match) => sum + match.weight, 0),
      mainKeywords: matches.slice(0, 5).map(({ word }) => word),
    };
  }).sort((a, b) => b.score - a.score);
  const [first, second] = scores;

  if (first.score === second.score) return { detectedSubject: null, confidence: 0, mainKeywords: [] };

  return {
    detectedSubject: first.subject,
    confidence: Math.min(1, first.score / 8) * ((first.score - second.score) / first.score),
    mainKeywords: first.mainKeywords,
  };
}
