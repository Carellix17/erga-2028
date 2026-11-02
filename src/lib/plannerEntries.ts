import { format, isValid, parseISO, startOfDay } from "date-fns";
import { getSubjectColor } from "@/lib/subjectColors";
import { cleanCourseName } from "@/lib/courseName";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserSubject } from "@/hooks/useUserSubjects";
import type { StudyEventSource, StudyEventStatus } from "@/lib/planner/types";

export interface PlannerEntry {
  id: string;
  kind: "evaluation" | "study" | "assignment" | "personal";
  date: Date;
  time?: string;
  title: string;
  subject: string | null;
  coverName: string;
  customColor?: string | null;
  important: boolean;
  completed: boolean;
  endTime?: string | null;
  notes?: string | null;
  status?: StudyEventStatus;
  contextId?: string | null;
  lessonFrom?: number | null;
  lessonTo?: number | null;
  source?: StudyEventSource;
  moveCount?: number;
  originalDate?: string | null;
  originalTime?: string | null;
  locked?: boolean;
  version?: number;
  original: { kind: "evaluation"; data: Evaluation } | { kind: "studyEvent"; data: StudyEvent };
}
export const validEventTime = (time?: string | null) =>
  time && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time) ? time.slice(0, 5) : undefined;
export function addOneHour(hhmm: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = Math.min(startMinutes + 60, 23 * 60 + 59);
  if (endMinutes <= startMinutes) return null;
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

export const comparePlannerEntries = (a: PlannerEntry, b: PlannerEntry) =>
  (a.time ?? "zz:zz").localeCompare(b.time ?? "zz:zz") || a.title.localeCompare(b.title);

/** Existing evaluations encode an unspecified time as local noon (AddEventSheet).
 * Do not invent a start/end time or a duration for those legacy records. */
export function plannerEntries(
  evaluations: Evaluation[], events: StudyEvent[], subjects: UserSubject[],
  courses: { id: string; file_name: string }[] = [],
): PlannerEntry[] {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const subjectCourse = (name?: string | null) => {
    if (!name || name === "Altro") return undefined;
    const key = getSubjectColor(name).key;
    return courses.find((course) => cleanCourseName(course.file_name).toLocaleLowerCase().includes(name.toLocaleLowerCase())
      || (key !== "default" && getSubjectColor(course.file_name).key === key));
  };
  return [
    ...evaluations.map((event): PlannerEntry => {
      const date = parseISO(event.date);
      const subject = subjectById.get(event.subject_id ?? "");
      const time = isValid(date) && event.date.includes("T") ? format(date, "HH:mm") : undefined;
      const linked = (event.topic_type === "linked" ? courses.find((course) => course.id === event.topic_id) : undefined) ?? subjectCourse(subject?.name);
      return {
        id: event.id, kind: "evaluation", date: startOfDay(date), time: time === "12:00" ? undefined : time,
        title: event.title, subject: subject?.name ?? null,
        coverName: linked ? cleanCourseName(linked.file_name) : subject?.name ?? event.title,
        customColor: linked ? undefined : subject?.color, important: event.type !== "compito", completed: !!event.is_completed,
        original: { kind: "evaluation", data: event },
      };
    }),
    ...events.map((event): PlannerEntry => {
      const subject = subjects.find((item) => item.name.toLocaleLowerCase() === event.subject.toLocaleLowerCase());
      const course = subjectCourse(subject?.name ?? event.subject);
      const kind: PlannerEntry["kind"] = event.event_type === "study"
        ? "study"
        : event.event_type === "test"
          ? "evaluation"
          : event.event_type === "assignment" && event.subject.trim().toLocaleLowerCase() === "altro"
            ? "personal"
            : "assignment";
      return {
        id: event.id, kind, date: parseISO(event.event_date.slice(0, 10)), time: validEventTime(event.event_time),
        title: event.title, subject: event.subject && event.subject !== "Altro" ? event.subject : null,
        coverName: course ? cleanCourseName(course.file_name) : subject?.name ?? event.subject ?? event.title, customColor: course ? undefined : subject?.color,
        important: event.event_type === "test",
        completed: event.status === "done" || event.is_completed === true,
        endTime: event.end_time,
        notes: event.notes,
        status: event.status,
        contextId: event.context_id,
        lessonFrom: event.lesson_from,
        lessonTo: event.lesson_to,
        source: event.source,
        moveCount: event.move_count,
        originalDate: event.original_date,
        originalTime: event.original_time,
        locked: event.locked,
        version: event.version,
        original: { kind: "studyEvent", data: event },
      };
    }),
  ].filter((entry) => isValid(entry.date));
}
