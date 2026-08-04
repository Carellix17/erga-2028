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

const SUBJECT_COLORS: SubjectColor[] = [
 {
 key:"storia",
 label:"Storia",
 bg:"bg-orchid-bloom/10", bgActive:"bg-orchid-bloom", text:"text-orchid-bloom", textActive:"text-black",
 border:"border-orchid-bloom/30", icon:"bg-orchid-bloom/20", gradient:"from-orchid-bloom to-pink-500", solid:"bg-orchid-bloom",
 badge:"bg-orchid-bloom/15", badgeText:"text-orchid-bloom",
 },
 {
 key:"matematica",
 label:"Matematica",
 bg:"bg-iris-gleam/10", bgActive:"bg-iris-gleam", text:"text-iris-gleam", textActive:"text-white",
 border:"border-iris-gleam/30", icon:"bg-iris-gleam/20", gradient:"from-iris-gleam to-deep-iris", solid:"bg-iris-gleam",
 badge:"bg-iris-gleam/15", badgeText:"text-iris-gleam",
 },
 {
 key:"economia",
 label:"Economia",
 bg:"bg-periwinkle/10", bgActive:"bg-periwinkle", text:"text-periwinkle", textActive:"text-black",
 border:"border-periwinkle/30", icon:"bg-periwinkle/20", gradient:"from-periwinkle to-cyan-signal", solid:"bg-periwinkle",
 badge:"bg-periwinkle/15", badgeText:"text-periwinkle",
 },
 {
 key:"scienze",
 label:"Scienze",
 bg:"bg-cyan-signal/10", bgActive:"bg-cyan-signal", text:"text-cyan-signal", textActive:"text-black",
 border:"border-cyan-signal/30", icon:"bg-cyan-signal/20", gradient:"from-cyan-signal to-periwinkle", solid:"bg-cyan-signal",
 badge:"bg-cyan-signal/15", badgeText:"text-cyan-signal",
 },
 {
 key:"letteratura",
 label:"Letteratura",
 bg:"bg-orchid-bloom/10", bgActive:"bg-orchid-bloom", text:"text-orchid-bloom", textActive:"text-black",
 border:"border-orchid-bloom/30", icon:"bg-orchid-bloom/20", gradient:"from-orchid-bloom to-pale-iris", solid:"bg-orchid-bloom",
 badge:"bg-orchid-bloom/15", badgeText:"text-orchid-bloom",
 },
 {
 key:"filosofia",
 label:"Filosofia",
 bg:"bg-deep-iris/15", bgActive:"bg-deep-iris", text:"text-pale-iris", textActive:"text-white",
 border:"border-deep-iris/40", icon:"bg-deep-iris/25", gradient:"from-deep-iris to-iris-gleam", solid:"bg-deep-iris",
 badge:"bg-deep-iris/20", badgeText:"text-pale-iris",
 },
 {
 key:"fisica",
 label:"Fisica",
 bg:"bg-periwinkle/10", bgActive:"bg-periwinkle", text:"text-periwinkle", textActive:"text-black",
 border:"border-periwinkle/30", icon:"bg-periwinkle/20", gradient:"from-periwinkle to-iris-gleam", solid:"bg-periwinkle",
 badge:"bg-periwinkle/15", badgeText:"text-periwinkle",
 },
 {
 key:"informatica",
 label:"Informatica",
 bg:"bg-cyan-signal/10", bgActive:"bg-cyan-signal", text:"text-cyan-signal", textActive:"text-black",
 border:"border-cyan-signal/30", icon:"bg-cyan-signal/20", gradient:"from-cyan-signal to-deep-iris", solid:"bg-cyan-signal",
 badge:"bg-cyan-signal/15", badgeText:"text-cyan-signal",
 },
 {
 key:"arte",
 label:"Arte",
 bg:"bg-orchid-bloom/10", bgActive:"bg-orchid-bloom", text:"text-orchid-bloom", textActive:"text-black",
 border:"border-orchid-bloom/30", icon:"bg-orchid-bloom/20", gradient:"from-orchid-bloom to-deep-iris", solid:"bg-orchid-bloom",
 badge:"bg-orchid-bloom/15", badgeText:"text-orchid-bloom",
 },
 {
 key:"geografia",
 label:"Geografia",
 bg:"bg-cyan-signal/10", bgActive:"bg-cyan-signal", text:"text-cyan-signal", textActive:"text-black",
 border:"border-cyan-signal/30", icon:"bg-cyan-signal/20", gradient:"from-cyan-signal to-periwinkle", solid:"bg-cyan-signal",
 badge:"bg-cyan-signal/15", badgeText:"text-cyan-signal",
 },
 {
 key:"diritto",
 label:"Diritto",
 bg:"bg-white/5", bgActive:"bg-white", text:"text-white", textActive:"text-black",
 border:"border-white/20", icon:"bg-white/10", gradient:"from-white to-silver", solid:"bg-white",
 badge:"bg-white/10", badgeText:"text-white",
 },
 {
 key:"lingue",
 label:"Lingue",
 bg:"bg-orchid-bloom/10", bgActive:"bg-orchid-bloom", text:"text-orchid-bloom", textActive:"text-black",
 border:"border-orchid-bloom/30", icon:"bg-orchid-bloom/20", gradient:"from-orchid-bloom to-periwinkle", solid:"bg-orchid-bloom",
 badge:"bg-orchid-bloom/15", badgeText:"text-orchid-bloom",
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

// Default fallback color (the primary indigo)
const DEFAULT_COLOR: SubjectColor = {
 key:"default",
 label:"Generale",
 bg:"bg-iris-gleam/10", bgActive:"bg-primary", text:"text-iris-gleam", textActive:"text-primary-foreground",
 border:"border-iris-gleam/30", icon:"bg-iris-gleam/20", gradient:"from-iris-gleam to-deep-iris", solid:"bg-white",
 badge:"bg-iris-gleam/15", badgeText:"text-iris-gleam",
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
