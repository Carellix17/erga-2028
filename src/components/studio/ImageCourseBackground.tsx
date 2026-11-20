import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { resolveCourseCover } from "@/lib/courseIdentity";

interface ImageCourseBackgroundProps {
  courseName: string;
  customKey?: string | null;
  materialSubject?: string | null;
  eager?: boolean;
}

export function ImageCourseBackground({
  courseName,
  customKey,
  materialSubject,
  eager = false,
}: ImageCourseBackgroundProps) {
  const cover = resolveCourseCover(courseName, customKey, materialSubject);

  // L'immagine è decorativa. Il fondo materia resta disponibile anche offline.
  return (
    <div aria-hidden="true" className="course-image-background pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <CourseCardBackground courseName={courseName} cover={cover} />
      {cover.backgroundImage && (
        <img
          key={cover.backgroundImage}
          src={cover.backgroundImage}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      )}
    </div>
  );
}
