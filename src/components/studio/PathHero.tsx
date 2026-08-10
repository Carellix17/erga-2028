import { BookOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PathHeroProps {
  /** Nome del percorso (senza estensione). */
  title?: string | null;
  completedCount: number;
  totalLessons: number;
  /** La fabbrica è in corso: l'eroe mostra la barra di trasformazione. */
  isGenerating?: boolean;
  progressPercent?: number;
  canResume?: boolean;
  onResume?: () => void;
}

// 🌲 P24 BOSCO — l'EROE DEL PERCORSO: la card ad arco che apre Studio,
// ispirata alla featured card della foto (verde bosco, angoli organici,
// pillola opaca di invito). Racconta DOVE sei nel percorso senza gridare:
// il colore è la firma del bosco, la gerarchia la fa la superficie.
export function PathHero({
  title,
  completedCount,
  totalLessons,
  isGenerating = false,
  progressPercent = 0,
  canResume = false,
  onResume,
}: PathHeroProps) {
  const pct =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <section className="px-4 pt-4 animate-fade-up">
      <div className="relative overflow-hidden rounded-[32px] bg-primary text-primary-foreground shadow-level-2 p-5 sm:p-6">
        {/* Motivo organico: due tondi di luce, come raggi tra le fronde */}
        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-white/[0.07]" aria-hidden />
        <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-white/[0.05]" aria-hidden />
        <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-white/[0.04]" aria-hidden />

        <div className="relative">
          <p className="label-small text-primary-foreground/70 mb-2 tracking-[0.16em]">
            Percorso attuale
          </p>

          {title ? (
            <h2 className="font-display font-extrabold text-xl sm:text-2xl leading-snug line-clamp-2 pr-6">
              {title}
            </h2>
          ) : (
            <h2 className="font-display font-extrabold text-xl sm:text-2xl leading-snug">
              Il tuo percorso
            </h2>
          )}

          {isGenerating ? (
            <div className="mt-5">
              <p className="text-xs text-primary-foreground/80 mb-2">
                Erga sta trasformando il tuo materiale…
              </p>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-lime transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-primary-foreground/80">
                {completedCount} di {totalLessons} lezioni
              </p>
              <p className="text-sm font-bold text-lime tabular-nums">{pct}%</p>
            </div>
          )}

          {onResume && canResume && !isGenerating && (
            <button
              type="button"
              onClick={onResume}
              className={cn(
                "mt-5 inline-flex items-center gap-2 rounded-full",
                "bg-white/15 border border-white/25 px-5 py-2.5",
                "text-sm font-semibold text-white",
                "transition-all duration-200 hover:bg-white/25 active:scale-[0.97]"
              )}
            >
              <BookOpen className="w-4 h-4" strokeWidth={1.9} />
              Riprendi
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
