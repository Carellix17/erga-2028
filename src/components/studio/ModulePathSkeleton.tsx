import { Skeleton } from "@/components/ui/skeleton";

/**
 * ModulePathSkeleton — replica del percorso squadrato del modulo
 * - Nodi quadrati alternati sinistra/destra 54px
 * - Linea a gomiti
 * - Trofeo finale 62px
 * - Header con back button + titolo modulo
 */
export function ModulePathSkeleton() {
  return (
    <div className="px-4 pt-6 pb-32 space-y-8 animate-fade-up" aria-busy="true" aria-label="Caricamento Modulo">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-pill" />
          <Skeleton className="h-6 w-40 rounded-button" />
        </div>
      </div>

      {/* Path */}
      <div className="relative flex flex-col items-center gap-0">
        {/* Linea centrale */}
        <div className="absolute top-0 bottom-20 left-1/2 w-0.5 bg-border/50 -translate-x-1/2" />
        
        {Array.from({ length: 5 }).map((_, i) => {
          const isLeft = i % 2 === 0;
          return (
            <div key={i} className="relative w-full flex justify-center py-4" style={{ minHeight: 118 }}>
              {/* Nodo */}
              <div className={`absolute top-1/2 -translate-y-1/2 ${isLeft ? 'left-[10%] -translate-x-1/2' : 'right-[10%] translate-x-1/2'}`}>
                <Skeleton className="h-[54px] w-[54px] rounded-xl" />
              </div>
              {/* Card lezione */}
              <div className={`w-[55%] ${isLeft ? 'ml-auto mr-[12%]' : 'mr-auto ml-[12%]'}`}>
                <div className="rounded-[18px] bg-card border border-border px-3.5 py-3 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md opacity-70" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Trofeo finale */}
        <div className="relative pt-6">
          <Skeleton className="h-[62px] w-[62px] rounded-full" />
        </div>
      </div>
    </div>
  );
}
