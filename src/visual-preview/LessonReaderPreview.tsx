import { FullscreenLesson } from "@/components/studio/FullscreenLesson";

const lesson = {
  id: "visual-lesson-reader",
  title: "Velocità media e istantanea",
  concept: "La velocità media descrive quanto cambia la posizione in un intervallo di tempo.",
  explanation: JSON.stringify([
    {
      part_title: "Come si misura la velocità",
      content: "La velocità media è il rapporto tra lo spazio percorso e il tempo impiegato. Per esempio, percorrere 120 metri in 10 secondi significa avanzare in media di 12 metri ogni secondo.",
    },
  ]),
  example: "Un ciclista percorre 30 km in un'ora: la sua velocità media è 30 km/h.",
  exercises: [],
};

/** Isolated, deterministic fixture for the lesson reader's responsive layout. */
export function LessonReaderPreview() {
  return (
    <FullscreenLesson
      lesson={lesson}
      lessonNumber={2}
      totalLessons={8}
      onClose={() => {}}
      onComplete={() => {}}
      isLastLesson={false}
    />
  );
}
