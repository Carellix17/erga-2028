import * as backgrounds from "@/assets/images/course-backgrounds";
import { normalizeSubjectText, type CourseImageKey } from "../../supabase/functions/_shared/courseSubject";

export type { CourseImageKey };
export const COURSE_IMAGE_MAP: Record<CourseImageKey, string> = backgrounds;

const ALIASES: Readonly<Record<string, CourseImageKey>> = {
  letteratura: "letteratura_e_grammatica",
  grammatica: "letteratura_e_grammatica",
  diritto: "diritto_e_economia",
  economia: "diritto_e_economia",
  diritto_ed_economia: "diritto_e_economia",
  lingua: "lingua_straniera",
  lingue: "lingua_straniera",
  straniera: "lingua_straniera",
  lingue_straniere: "lingua_straniera",
};

export function getCourseImage(subjectKey: string): string | null {
  const normalized = normalizeSubjectText(subjectKey).replace(/ /g, "_");
  const key = Object.prototype.hasOwnProperty.call(ALIASES, normalized) ? ALIASES[normalized] : normalized;
  return Object.prototype.hasOwnProperty.call(COURSE_IMAGE_MAP, key)
    ? COURSE_IMAGE_MAP[key as CourseImageKey]
    : null;
}
