import { Skeleton } from "@/components/ui/skeleton";

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
 */

// Posizioni orizzontali a zig-zag (in %): le stesse del sentiero vero.
const ZIGZAG_X = [50, 75, 50, 25];
// Spaziatura verticale tra un nodo e l'altro (come NODE_SPACING del sentiero).
const ROW = 110;

export function LessonsListSkeleton() {
  return (
    <div className="relative px-4 pt-6 pb-32 max-w-md mx-auto animate-fade-up" aria-hidden>
      {[0, 1].map((mod) => (
        <div key={mod} className="mb-8">
          {/* Testata del modulo */}
          <div className="flex items-center gap-2 mb-4 px-2">
            <Skeleton className="h-8 w-36 rounded-xl" />
          </div>
          {/* Nodi a zig-zag */}
          <div className="relative" style={{ height: ZIGZAG_X.length * ROW }}>
            {ZIGZAG_X.map((x, i) => (
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
      ))}
    </div>
  );
}
