import { getCourseImage, type CourseImageKey } from "@/lib/courseImages";
import { classifyCourseSubject } from "../../supabase/functions/_shared/courseSubject";

export interface SubjectDetectionResult {
  detectedSubject: CourseImageKey | null;
  confidence: number;
  mainKeywords: string[];
  backgroundImage: string | null;
}

export function detectSubjectFromText(content: string): SubjectDetectionResult {
  const detection = classifyCourseSubject(content);
  return {
    ...detection,
    backgroundImage: detection.detectedSubject ? getCourseImage(detection.detectedSubject) : null,
  };
}
