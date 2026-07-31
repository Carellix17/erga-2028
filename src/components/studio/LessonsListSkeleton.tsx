import { Skeleton } from "@/components/ui/skeleton";
import { MODULE_SIZE } from "@/lib/lessonModules";

/**
 * 🦴 P10a: SCHELETRO DEL SENTIERO.
 *
 * Cosa vedi mentre un percorso GIÀ ESISTENTE sta arrivando dal caveau
 * (prima dell'orbe ci passava la schermata di generazione come se stessimo
 * creando qualcosa — confusionario). Ora: sagome a zig-zag, come i nodi
 * veri di LessonsList, nello stile delle schermate di caricamento
 * di Piano e Profilo.
 *
 * L'orbe coi satelliti resta solo per la generazione vera (GenerationProgress).
 *
 * ⚡ P16: lo scheletro col RIGHELLO — se ci dicono quante lezioni ha il
 * percorso (è un dato leggero che arriva gratis con la lista contesti),
 * disegniamo la spina dorsale con la LUNGHEZZA VERA: la struttura appare
 * subito, i titoli si accendono appena il furgoncino arriva dal cloud.
 */

// Posizioni orizzontali a zig-zag (in %): le stesse del sentiero vero.
const ZIGZAG_X = [50, 75, 50, 25];
// Spaziatura verticale tra un nodo e l'altro (come NODE_SPACING del sentiero).
const ROW = 110;

export function LessonsListSkeleton({ count }: { count?: number }) {
  const total = Math.max(0, Math.min(count ?? 0, 32));
  const moduleCount = total > 0 ? Math.ceil(total / MODULE_SIZE) : 2;

  return (
    <div className="relative px-4 pt-6 pb-32 max-w-md mx-auto animate-fade-up" aria-hidden>
      {Array.from({ length: moduleCount }, (_, mod) => {
        const rows = total > 0
          ? Math.max(1, Math.min(MODULE_SIZE, total - mod * MODULE_SIZE))
          : ZIGZAG_X.length;
        return (
          <div key={mod} className="mb-8">
            {/* Testata del modulo */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <Skeleton className="h-8 w-36 rounded-xl" />
            </div>
            {/* Nodi a zig-zag */}
            <div className="relative" style={{ height: rows * ROW }}>
              {ZIGZAG_X.slice(0, rows).map((x, i) => (
                <div
                  key={i}
                  className="absolute flex flex-col items-center -translate-x-1/2"
                  style={{ left: `${x}%`, top: i * ROW }}
                >
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="mt-2.5 h-4 w-20 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
