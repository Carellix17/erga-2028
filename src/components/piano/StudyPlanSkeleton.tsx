/**
 * StudyPlanSkeleton — Piano di studio (PianoView)
 * Riprende la forma del calendario degli appuntazioni: superficie scura,
 * intestazione mese + toggle, giorni della settimana, griglia 7 colonne
 * con celle alte 4rem e il bottone "Aggiungi evento" in fondo.
 */
export function StudyPlanSkeleton() {
  return (
    <div className="p-4 pb-28 space-y-4 animate-fade-up" aria-busy="true" aria-label="Caricamento Piano di Studio">
      <div className="rounded-card bg-zinc-950 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-lg">
          {/* Intestazione: mese + toggle */}
          <div className="mb-4 flex items-center justify-between">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-9 w-[72px] animate-pulse rounded-lg bg-zinc-800" />
          </div>
          {/* Giorni della settimana */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded-xl bg-[#323232]/60" />
            ))}
          </div>
          {/* Griglia giorni */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#1e1e1e]/60" />
            ))}
          </div>
          {/* Bottoni */}
          <div className="mt-4 h-10 animate-pulse rounded-lg bg-[#1e1e1e]/60" />
        </div>
      </div>
    </div>
  );
}
