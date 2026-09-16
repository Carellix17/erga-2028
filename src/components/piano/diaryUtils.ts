import { addDays, differenceInCalendarDays, isSameDay, startOfDay } from "date-fns";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserSubject } from "@/hooks/useUserSubjects";
import type { FileContext } from "@/hooks/useFileContexts";
import { subjectHex } from "@/lib/pianoPalette";
import { dayKey } from "@/lib/weekPlanner";

/**
 * 📔 P49 — IL DIARIO SCOLASTICO: la logica, tutta qui.
 *
 * Questa è la parte "pensante" della vista Diario: trasforma i dati grezzi
 * (verifiche in `evaluations`, eventi in `study_events`, materie, percorsi)
 * nelle tre liste che lo studente vede davvero nella sua giornata:
 *
 *   1. compiti per casa  → da spuntare (una alla volta, con progresso)
 *   2. verifiche/interrogazioni → con conto alla rovescia e voto obiettivo
 *   3. sessioni di studio → con il pulsante per partire in Focus
 *
 * Nessuna chiamata al database qui: funzioni pure, quindi collaudabili e
 * riusabili (il collaudo sta in src/test/diaryView.test.tsx).
 */

/** Giorni visibili nel nastro: 3 prima e 3 dopo il giorno scelto. */
export const STRIP_BEFORE = 3;
export const STRIP_AFTER = 3;
export const STRIP_LENGTH = STRIP_BEFORE + STRIP_AFTER + 1;

/** Tipi di prova che nel diario contano come "verifica" (con conto alla rovescia). */
const EXAM_TYPES: EvaluationType[] = ["scritta", "orale", "pratica", "interrogazione"];

/** Quanti giorni mancano: la "tonalità" decide il colore del badge. */
export type CountdownTone = "today" | "tomorrow" | "soon" | "later" | "past";

export interface Countdown {
  /** Giorni di calendario che mancano (0 = oggi, negativo = passato). */
  days: number;
  tone: CountdownTone;
}

/**
 * Conto alla rovescia onesto: si contano i GIORNI di calendario, non le ore.
 * Una verifica di domani alle 8:00 resta "Domani" anche se sono le 23:00.
 */
export function countdownFor(date: Date | string, now: Date = new Date()): Countdown {
  const target = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return { days: 0, tone: "today" };
  const days = differenceInCalendarDays(startOfDay(target), startOfDay(now));
  if (days < 0) return { days, tone: "past" };
  if (days === 0) return { days, tone: "today" };
  if (days === 1) return { days, tone: "tomorrow" };
  if (days <= 7) return { days, tone: "soon" };
  return { days, tone: "later" };
}

/** I 7 giorni del nastro, centrati sul giorno scelto (da -3 a +3). */
export function stripDays(center: Date): Date[] {
  const base = startOfDay(center);
  const days: Date[] = [];
  for (let offset = -STRIP_BEFORE; offset <= STRIP_AFTER; offset += 1) {
    days.push(addDays(base, offset));
  }
  return days;
}

/** Il progresso del giorno: quanti compiti fatti su quanti totali. */
export function taskProgress(tasks: { completed: boolean }[]): { done: number; total: number; pct: number } {
  const total = tasks.length;
  const done = tasks.filter((task) => task.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

/**
 * Ordine di lettura del diario: prima quello che non è ancora fatto (a
 * partire da chi ha un orario), poi il resto; a parità, ordine alfabetico di
 * materia. Così la cosa da fare "adesso" resta sempre in alto.
 */
export function sortByWorkload<T extends { completed: boolean; time?: string | null; subjectName?: string | null; title: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!!a.time !== !!b.time) return a.time ? -1 : 1;
    if (a.time && b.time && a.time !== b.time) return a.time < b.time ? -1 : 1;
    const subjA = (a.subjectName ?? "").toLocaleLowerCase();
    const subjB = (b.subjectName ?? "").toLocaleLowerCase();
    if (subjA !== subjB) return subjA < subjB ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** Una voce del diario: o una verifica/compito (evaluations) o un evento (study_events). */
export type DiaryEntry =
  | { kind: "evaluation"; evaluation: Evaluation }
  | { kind: "event"; event: StudyEvent };

export interface DiaryTask {
  id: string;
  entry: DiaryEntry;
  title: string;
  /** Descrizione/note: per i compiti creati dal foglio è il testo vero del compito. */
  note: string | null;
  subjectName: string | null;
  hex: string;
  /** Orario dell'impegno ("HH:MM"), se c'è. */
  time: string | null;
  completed: boolean;
  /**
   * true quando lo stato "fatto" esiste solo nel browser: gli eventi creati
   * dalla scheda "Altro" vivono in `study_events`, che non ha (ancora) la
   * colonna di completamento. La nota in fondo alla lista lo dice allo
   * studente, senza promettere una memoria che non c'è.
   */
  localOnly: boolean;
}

export interface DiaryExam {
  id: string;
  entry: DiaryEntry;
  type: EvaluationType | "test";
  title: string;
  subjectName: string | null;
  hex: string;
  date: Date;
  time: string | null;
  goal: number | null;
  /** Argomento: titolo libero scelto dallo studente. */
  topicLabel: string | null;
  /** Percorso di Studio collegato (apre la stanza Studio su quel corso). */
  courseId: string | null;
  courseTitle: string | null;
}

export interface DiarySession {
  id: string;
  entry: DiaryEntry;
  title: string;
  subjectName: string | null;
  hex: string;
  time: string | null;
}

export interface DiaryDay {
  date: Date;
  tasks: DiaryTask[];
  exams: DiaryExam[];
  sessions: DiarySession[];
  progress: { done: number; total: number; pct: number };
  /** C'è almeno un compito il cui "fatto" vive solo nel browser. */
  hasLocalOnlyTasks: boolean;
  /** Niente da fare: il diario mostra l'incoraggiamento invece delle liste. */
  isEmpty: boolean;
}

interface BuildDiaryDayInput {
  date: Date;
  evaluations: Evaluation[];
  events: StudyEvent[];
  subjects: UserSubject[];
  courses: FileContext[];
  /** Id degli eventi spuntati solo in locale (study_events). */
  localCompletedIds?: string[];
}

/** Titolo di ripiego: una card senza titolo sembra un errore, mai lasciarla vuota. */
const EMPTY_TITLE = "—";

/**
 * Costruisce la giornata del diario. Voci senza data valida vengono
 * semplicemente ignorate: mai una riga rotta a schermo.
 */
export function buildDiaryDay({
  date,
  evaluations,
  events,
  subjects,
  courses,
  localCompletedIds = [],
}: BuildDiaryDayInput): DiaryDay {
  const subjectByName = new Map<string, UserSubject>();
  const subjectById = new Map<string, UserSubject>();
  for (const subject of subjects) {
    subjectByName.set(subject.name.toLowerCase(), subject);
    subjectById.set(subject.id, subject);
  }
  const courseById = new Map<string, FileContext>();
  for (const course of courses) courseById.set(course.id, course);

  const hexFor = (name?: string | null, customColor?: string | null) => subjectHex(name, customColor);

  // ── 1. Compiti (evaluations tipo "compito" + eventi storici "assignment") ──
  const tasks: DiaryTask[] = [];

  for (const evaluation of evaluations) {
    if (evaluation.type !== "compito") continue;
    const when = new Date(evaluation.date);
    if (Number.isNaN(when.getTime()) || !isSameDay(when, date)) continue;
    const subject = evaluation.subject_id ? subjectById.get(evaluation.subject_id) : undefined;
    tasks.push({
      id: evaluation.id,
      entry: { kind: "evaluation", evaluation },
      title: evaluation.title || EMPTY_TITLE,
      note: evaluation.description ?? null,
      subjectName: subject?.name ?? null,
      hex: hexFor(subject?.name, subject?.color),
      time: null,
      completed: !!evaluation.is_completed,
      localOnly: false,
    });
  }

  for (const event of events) {
    if (event.event_type !== "assignment") continue;
    const when = new Date(event.event_date);
    if (Number.isNaN(when.getTime()) || !isSameDay(when, date)) continue;
    const subject = subjectByName.get((event.subject ?? "").toLowerCase());
    tasks.push({
      id: event.id,
      entry: { kind: "event", event },
      title: event.title || EMPTY_TITLE,
      note: null,
      subjectName: event.subject || null,
      hex: hexFor(event.subject, subject?.color),
      time: event.event_time ?? null,
      completed: localCompletedIds.includes(event.id),
      localOnly: true,
    });
  }

  // ── 2. Verifiche e interrogazioni (con conto alla rovescia) ──
  const exams: DiaryExam[] = [];

  for (const evaluation of evaluations) {
    if (!EXAM_TYPES.includes(evaluation.type)) continue;
    const when = new Date(evaluation.date);
    if (Number.isNaN(when.getTime()) || !isSameDay(when, date)) continue;
    const subject = evaluation.subject_id ? subjectById.get(evaluation.subject_id) : undefined;
    const course = evaluation.topic_id ? courseById.get(evaluation.topic_id) : undefined;
    exams.push({
      id: evaluation.id,
      entry: { kind: "evaluation", evaluation },
      type: evaluation.type,
      title: evaluation.title || EMPTY_TITLE,
      subjectName: subject?.name ?? null,
      hex: hexFor(subject?.name, subject?.color),
      date: when,
      time: evaluation.date ? timeOf(evaluation.date) : null,
      goal: evaluation.goal ?? null,
      topicLabel: evaluation.topic_type === "free" ? evaluation.free_topic_title ?? null : null,
      courseId: evaluation.topic_type === "linked" ? evaluation.topic_id ?? null : null,
      courseTitle: course?.file_name ?? null,
    });
  }

  // Eventi storici di tipo "test": verifiche salvate prima delle `evaluations`.
  for (const event of events) {
    if (event.event_type !== "test") continue;
    const when = new Date(event.event_date);
    if (Number.isNaN(when.getTime()) || !isSameDay(when, date)) continue;
    const subject = subjectByName.get((event.subject ?? "").toLowerCase());
    exams.push({
      id: event.id,
      entry: { kind: "event", event },
      type: "test",
      title: event.title || EMPTY_TITLE,
      subjectName: event.subject || null,
      hex: hexFor(event.subject, subject?.color),
      date: when,
      time: event.event_time ?? null,
      goal: null,
      topicLabel: null,
      courseId: null,
      courseTitle: null,
    });
  }

  // ── 3. Sessioni di studio (con il pulsante Focus) ──
  const sessions: DiarySession[] = events
    .filter((event) => event.event_type === "study")
    .filter((event) => {
      const when = new Date(event.event_date);
      return !Number.isNaN(when.getTime()) && isSameDay(when, date);
    })
    .map((event) => {
      const subject = subjectByName.get((event.subject ?? "").toLowerCase());
      return {
        id: event.id,
        entry: { kind: "event" as const, event },
        title: event.title || EMPTY_TITLE,
        subjectName: event.subject || null,
        hex: hexFor(event.subject, subject?.color),
        time: event.event_time ?? null,
      };
    });

  const sortedTasks = sortByWorkload(tasks);
  const sortedExams = [...exams].sort((a, b) =>
    a.title.localeCompare(b.title) || (a.subjectName ?? "").localeCompare(b.subjectName ?? ""),
  );
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!!a.time !== !!b.time) return a.time ? -1 : 1;
    if (a.time && b.time && a.time !== b.time) return a.time < b.time ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return {
    date,
    tasks: sortedTasks,
    exams: sortedExams,
    sessions: sortedSessions,
    progress: taskProgress(sortedTasks),
    hasLocalOnlyTasks: sortedTasks.some((task) => task.localOnly),
    isEmpty: sortedTasks.length === 0 && sortedExams.length === 0 && sortedSessions.length === 0,
  };
}

/** "HH:MM" da una data ISO, o null se è mezzanotte finta (l'ora non c'era). */
function timeOf(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const hours = parsed.getHours();
  const minutes = parsed.getMinutes();
  // Il foglio "Aggiungi evento" salva 12:00 quando l'ora non è indicata:
  // mostrarla sarebbe un'informazione inventata.
  if (hours === 12 && minutes === 0) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Le chiavi (una per giorno) che hanno compiti o verifiche: serve al nastro. */
export function activeDayKeys(evaluations: Evaluation[], events: StudyEvent[]): Set<string> {
  const keys = new Set<string>();
  for (const evaluation of evaluations) {
    keys.add(dayKey(new Date(evaluation.date)));
  }
  for (const event of events) {
    keys.add(dayKey(new Date(event.event_date)));
  }
  return keys;
}

/** Piccoli campioni colorati (max 3) per i pallini del nastro: materie del giorno. */
export function dayDots(
  date: Date,
  evaluations: Evaluation[],
  events: StudyEvent[],
  subjects: UserSubject[],
): string[] {
  const subjectByName = new Map(subjects.map((subject) => [subject.name.toLowerCase(), subject]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const hexes: string[] = [];
  const push = (hex: string) => {
    if (!hex || hexes.includes(hex) || hexes.length >= 3) return;
    hexes.push(hex);
  };

  for (const evaluation of evaluations) {
    const when = new Date(evaluation.date);
    if (Number.isNaN(when.getTime()) || !isSameDay(when, date)) continue;
    const subject = evaluation.subject_id ? subjectById.get(evaluation.subject_id) : undefined;
    push(subjectHex(subject?.name, subject?.color));
  }
  for (const event of events) {
    const when = new Date(event.event_date);
    if (Number.isNaN(when.getTime()) || !isSameDay(when, date)) continue;
    const subject = subjectByName.get((event.subject ?? "").toLowerCase());
    push(subjectHex(event.subject, subject?.color));
  }
  return hexes;
}
