/**
 * Maps course/file names to subject-based color themes.
 * Each subject gets a unique vibrant color for visual differentiation.
 */

export interface SubjectColor {
 key: string;
 label: string;
 bg: string; // background for chips/cards
 bgActive: string; // active state background
 text: string; // text color on bg
 textActive: string; // text on active bg
 border: string; // border color
 icon: string; // icon bg
 gradient: string; // gradient for progress cards
 solid: string; // solid background (replaces gradient usage)
 badge: string; // badge bg
 badgeText: string; // badge text
}

const SUBJECT_COLORS: SubjectColor[] = [ {
 key:"storia",
 label:"Storia",
 bg:"bg-pastel-terracotta/10", bgActive:"bg-pastel-terracotta", text:"text-pastel-terracotta", textActive:"text-primary-foreground",
 border:"border-pastel-terracotta/40", icon:"bg-pastel-terracotta/20", gradient:"from-pastel-terracotta/40 to-pastel-terracotta/10", solid:"bg-pastel-terracotta",
 badge:"bg-pastel-terracotta/15", badgeText:"text-pastel-terracotta",
 }, {
 key:"matematica",
 label:"Matematica",
 bg:"bg-pastel-polvere/10", bgActive:"bg-pastel-polvere", text:"text-pastel-polvere", textActive:"text-primary-foreground",
 border:"border-pastel-polvere/40", icon:"bg-pastel-polvere/20", gradient:"from-pastel-polvere/40 to-pastel-polvere/10", solid:"bg-pastel-polvere",
 badge:"bg-pastel-polvere/15", badgeText:"text-pastel-polvere",
 }, {
 key:"economia",
 label:"Economia",
 bg:"bg-pastel-ocra/10", bgActive:"bg-pastel-ocra", text:"text-pastel-ocra", textActive:"text-primary-foreground",
 border:"border-pastel-ocra/40", icon:"bg-pastel-ocra/20", gradient:"from-pastel-ocra/40 to-pastel-ocra/10", solid:"bg-pastel-ocra",
 badge:"bg-pastel-ocra/15", badgeText:"text-pastel-ocra",
 }, {
 key:"scienze",
 label:"Scienze",
 bg:"bg-pastel-bosco/10", bgActive:"bg-pastel-bosco", text:"text-pastel-bosco", textActive:"text-primary-foreground",
 border:"border-pastel-bosco/40", icon:"bg-pastel-bosco/20", gradient:"from-pastel-bosco/40 to-pastel-bosco/10", solid:"bg-pastel-bosco",
 badge:"bg-pastel-bosco/15", badgeText:"text-pastel-bosco",
 }, {
 key:"letteratura",
 label:"Letteratura",
 bg:"bg-pastel-prugna/10", bgActive:"bg-pastel-prugna", text:"text-pastel-prugna", textActive:"text-primary-foreground",
 border:"border-pastel-prugna/40", icon:"bg-pastel-prugna/20", gradient:"from-pastel-prugna/40 to-pastel-prugna/10", solid:"bg-pastel-prugna",
 badge:"bg-pastel-prugna/15", badgeText:"text-pastel-prugna",
 }, {
 key:"filosofia",
 label:"Filosofia",
 bg:"bg-pastel-crepuscolo/10", bgActive:"bg-pastel-crepuscolo", text:"text-pastel-crepuscolo", textActive:"text-primary-foreground",
 border:"border-pastel-crepuscolo/40", icon:"bg-pastel-crepuscolo/20", gradient:"from-pastel-crepuscolo/40 to-pastel-crepuscolo/10", solid:"bg-pastel-crepuscolo",
 badge:"bg-pastel-crepuscolo/15", badgeText:"text-pastel-crepuscolo",
 }, {
 key:"fisica",
 label:"Fisica",
 bg:"bg-pastel-mare/10", bgActive:"bg-pastel-mare", text:"text-pastel-mare", textActive:"text-primary-foreground",
 border:"border-pastel-mare/40", icon:"bg-pastel-mare/20", gradient:"from-pastel-mare/40 to-pastel-mare/10", solid:"bg-pastel-mare",
 badge:"bg-pastel-mare/15", badgeText:"text-pastel-mare",
 }, {
 key:"informatica",
 label:"Informatica",
 bg:"bg-pastel-violetto/10", bgActive:"bg-pastel-violetto", text:"text-pastel-violetto", textActive:"text-primary-foreground",
 border:"border-pastel-violetto/40", icon:"bg-pastel-violetto/20", gradient:"from-pastel-violetto/40 to-pastel-violetto/10", solid:"bg-pastel-violetto",
 badge:"bg-pastel-violetto/15", badgeText:"text-pastel-violetto",
 }, {
 key:"arte",
 label:"Arte",
 bg:"bg-pastel-cipria/10", bgActive:"bg-pastel-cipria", text:"text-pastel-cipria", textActive:"text-primary-foreground",
 border:"border-pastel-cipria/40", icon:"bg-pastel-cipria/20", gradient:"from-pastel-cipria/40 to-pastel-cipria/10", solid:"bg-pastel-cipria",
 badge:"bg-pastel-cipria/15", badgeText:"text-pastel-cipria",
 }, {
 key:"geografia",
 label:"Geografia",
 bg:"bg-pastel-oliva/10", bgActive:"bg-pastel-oliva", text:"text-pastel-oliva", textActive:"text-primary-foreground",
 border:"border-pastel-oliva/40", icon:"bg-pastel-oliva/20", gradient:"from-pastel-oliva/40 to-pastel-oliva/10", solid:"bg-pastel-oliva",
 badge:"bg-pastel-oliva/15", badgeText:"text-pastel-oliva",
 }, {
 key:"diritto",
 label:"Diritto",
 bg:"bg-pastel-grafite/10", bgActive:"bg-pastel-grafite", text:"text-pastel-grafite", textActive:"text-primary-foreground",
 border:"border-pastel-grafite/40", icon:"bg-pastel-grafite/20", gradient:"from-pastel-grafite/40 to-pastel-grafite/10", solid:"bg-pastel-grafite",
 badge:"bg-pastel-grafite/15", badgeText:"text-pastel-grafite",
 }, {
 key:"lingue",
 label:"Lingue",
 bg:"bg-pastel-miele/10", bgActive:"bg-pastel-miele", text:"text-pastel-miele", textActive:"text-primary-foreground",
 border:"border-pastel-miele/40", icon:"bg-pastel-miele/20", gradient:"from-pastel-miele/40 to-pastel-miele/10", solid:"bg-pastel-miele",
 badge:"bg-pastel-miele/15", badgeText:"text-pastel-miele",
 },
];

// Keywords that map to each subject
const SUBJECT_KEYWORDS: Record<string, string[]> = {
 storia: ["storia","storico","storica","medioevo","romano","romana","impero","guerra","rivoluzione","augusto","cesare","rinascimento","antico","antica","medievale","risorgimento","fascismo","napoleone"],
 matematica: ["matematica","algebra","geometria","calcolo","equazioni","funzioni","integrali","derivate","trigonometria","statistica","probabilità","numeri"],
 economia: ["economia","economico","economica","finanza","mercato","trading","investimento","pil","inflazione","borsa","azioni","analisi tecnica","microeconomia","macroeconomia"],
 scienze: ["scienza","scienze","biologia","chimica","biodiversità","ecosistema","cellula","dna","evoluzione","organismo","molecola","atomo"],
 letteratura: ["letteratura","poesia","romanzo","dante","manzoni","leopardi","figura retorica","figure retoriche","narrativa","sonetto","epica","prosa","verso"],
 filosofia: ["filosofia","filosofico","platone","aristotele","kant","hegel","etica","metafisica","epistemologia","socrate","nietzsche"],
 fisica: ["fisica","meccanica","termodinamica","elettromagnetismo","ottica","quantistica","relatività","newton","energia","forza","velocità","accelerazione"],
 informatica: ["informatica","programmazione","algoritmo","database","software","hardware","codice","python","java","web","computer","rete"],
 arte: ["arte","pittura","scultura","architettura","artistica","caravaggio","michelangelo","rinascimentale","barocco","impressionismo"],
 geografia: ["geografia","geografico","territorio","continente","clima","cartografia","geomorfologia","idrografia"],
 diritto: ["diritto","legge","costituzione","giuridico","normativa","codice civile","penale","contratto"],
 lingue: ["inglese","francese","tedesco","spagnolo","latino","greco","lingua","grammatica","traduzione"],
};

// 🌿 P21e — ripiego generale: pastello neutro di casa (il solid era bg-white:
// bianco-su-bianco di giorno! ora e' inchiostro).
const DEFAULT_COLOR: SubjectColor = {
 key:"default",
 label:"Generale",
 bg:"bg-pastel-neutro/10", bgActive:"bg-pastel-neutro", text:"text-pastel-neutro", textActive:"text-primary-foreground",
 border:"border-pastel-neutro/40", icon:"bg-pastel-neutro/20", gradient:"from-pastel-neutro/40 to-pastel-neutro/10", solid:"bg-foreground",
 badge:"bg-pastel-neutro/15", badgeText:"text-pastel-neutro",
};

/**
 * Detects the subject from a course/file name and returns the matching color theme.
 */
export function getSubjectColor(fileName: string): SubjectColor {
 const lower = fileName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const originalLower = fileName.toLowerCase();

 for (const [subjectKey, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
 for (const kw of keywords) {
 if (originalLower.includes(kw) || lower.includes(kw)) {
 return SUBJECT_COLORS.find(c => c.key === subjectKey) || DEFAULT_COLOR;
 }
 }
 }

 return DEFAULT_COLOR;
}

/**
 * Returns a stable color based on string hash (for courses that don't match any subject).
 * This ensures the same course always gets the same color.
 */
export function getStableSubjectColor(fileName: string): SubjectColor {
 const detected = getSubjectColor(fileName);
 if (detected.key !=="default") return detected;

 // Hash-based stable color assignment for unrecognized subjects
 let hash = 0;
 for (let i = 0; i < fileName.length; i++) {
 hash = ((hash << 5) - hash) + fileName.charCodeAt(i);
 hash |= 0;
 }
 const index = Math.abs(hash) % SUBJECT_COLORS.length;
 return SUBJECT_COLORS[index];
}

// ============================================================
// Colori delle materie: automatici + personalizzabili dall'utente
// ============================================================

/** La palette completa (per il selettore colore nella gestione materie). */
export const SUBJECT_PALETTE: readonly SubjectColor[] = SUBJECT_COLORS;

/** Restituisce il colore della palette con quella chiave, o null se non esiste. */
export function getSubjectColorByKey(key: string | null | undefined): SubjectColor | null {
 if (!key) return null;
 return SUBJECT_COLORS.find((c) => c.key === key) ?? null;
}

/**
 * Colore effettivo di una materia:
 * - se l'utente ha scelto un colore a mano (customKey valido) vince quello;
 * - altrimenti il colore automatico stabile derivato dal nome.
 */
export function resolveSubjectColor(subjectName: string, customKey?: string | null): SubjectColor {
 return getSubjectColorByKey(customKey) ?? getStableSubjectColor(subjectName);
}

// ============================================================
// 🌲 P24 × ACCENTO MATERIA — mappa chiave → colore HSL reale
// (allineato ai token pastel in index.css) per la variabile
// `--subject-accent`. Le materie i cui pastelli sono stati
// neutralizzati a grigio (scienze/fisica/geografia) hanno un
// grigio come accento; tutto il resto usa il colore della materia.
// ============================================================

const SUBJECT_ACCENT_HSL: Record<string, string> = {
  storia: "18 45% 45%",
  matematica: "210 36% 42%",
  economia: "38 55% 36%",
  scienze: "0 0% 38%",
  letteratura: "320 28% 44%",
  filosofia: "230 22% 44%",
  fisica: "0 0% 42%",
  informatica: "250 28% 47%",
  arte: "350 30% 50%",
  geografia: "0 0% 36%",
  diritto: "220 8% 34%",
  lingue: "28 50% 42%",
};

const ACCENT_FALLBACK = "#f59e0b";

/**
 * Colore d'accento (HSL/HEX) della materia corrente, pronto per
 * `--subject-accent`. Rispetta la scelta colore personalizzata
 * dell'utente (customKey) e il rilevamento automatico dal nome.
 */
export function getSubjectAccent(subjectName: string, customKey?: string | null): string {
  const resolved = resolveSubjectColor(subjectName, customKey);
  return SUBJECT_ACCENT_HSL[resolved.key] ?? ACCENT_FALLBACK;
}
