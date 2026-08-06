import { Skeleton } from "@/components/ui/skeleton";
import { MODULE_SIZE } from "@/lib/lessonModules";

/**
 * 🦴 P10a: SCHELETRO DEL PERCORSO.
 *
 * Cosa vedi mentre un percorso GIÀ ESISTENTE sta arrivando dal caveau
 * (prima dell'orbe ci passava la schermata di generazione come se stessimo
 * creando qualcosa — confusionario). Da 🌿 P21b è lo scheletro della LISTA
 * Opal: righe-tonde, come le carte vere di LessonsList.
 *
 * L'orbe coi satelliti resta solo per la generazione vera (GenerationProgress).
 *
 * ⚡ P16: lo scheletro col RIGHELLO — se ci dicono quante lezioni ha il
 * percorso (è un dato leggero che arriva gratis con la lista contesti),
 * disegniamo la spina dorsale con la LUNGHEZZA VERA: la struttura appare
 * subito, i titoli si accendono appena il furgoncino arriva dal cloud.
 */

export function LessonsListSkeleton({ count }: { count?: number }) {
  const total = Math.max(0, Math.min(count ?? 0, 32));
  const moduleCount = total > 0 ? Math.ceil(total / MODULE_SIZE) : 2;

  return (
    <div className="px-4 pt-6 pb-32 animate-fade-up" aria-hidden>
      {/* Barra del progresso */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-4 w-8 rounded-md" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full mb-7" />

      <div className="flex flex-col gap-8">
        {Array.from({ length: moduleCount }, (_, mod) => {
          const rows = total > 0
            ? Math.max(1, Math.min(MODULE_SIZE, total - mod * MODULE_SIZE))
            : 4;
          return (
            <div key={mod}>
              {/* Testata del modulo */}
              <div className="flex items-baseline justify-between mb-3 px-1">
                <Skeleton className="h-6 w-44 rounded-lg" />
                <Skeleton className="h-3 w-8 rounded-md" />
              </div>
              {/* Righe-lezione */}
              <div className="flex flex-col gap-2">
                {Array.from({ length: rows }, (_, i) => (
                  <div key={i} className="flex items-center gap-3.5 rounded-[18px] bg-card px-3.5 py-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-24 rounded-md mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
