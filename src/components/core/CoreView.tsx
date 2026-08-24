import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, CalendarClock, Hexagon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CognitiveHexagonEditor } from "./CognitiveHexagonEditor";
import { SubjectsInterestsEditor } from "./SubjectsInterestsEditor";
import { WeeklyRoutineEditor } from "./WeeklyRoutineEditor";

type CoreTab = "esagono" | "materie" | "routine";

/**
 * Le tre stanze del Core.
 * `label` è il nome completo (usato su desktop E come nome accessibile per gli
 * screen reader); `short` è la versione compatta che entra nel telefono senza
 * far scorrere la barra.
 */
const CORE_TABS: { id: CoreTab; label: string; short: string; icon: typeof Hexagon }[] = [
  { id: "esagono", label: "Esagono Cognitivo", short: "Esagono", icon: Hexagon },
  { id: "materie", label: "Materie & Interessi", short: "Materie", icon: BookOpen },
  { id: "routine", label: "Planning Routine", short: "Routine", icon: CalendarClock },
];

/**
 * Dice se la striscia delle schede sta scorrendo e da quale lato è tagliata.
 * Serve solo a mostrare la sfumatura di bordo: la scrollbar vera resta nascosta.
 */
function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth > 1;
    setEdges({
      left: overflow && el.scrollLeft > 1,
      right: overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return { ref, edges, measure };
}

interface CoreViewProps {
  /** Apre il questionario cognitivo iniziale (gestito dalla schermata principale). */
  onOpenCognitive?: () => void;
}

/**
 * Core — il centro della personalizzazione dello studente.
 *
 * Tre schede (Esagono Cognitivo, Materie & Interessi, Planning Routine) in un
 * component Tabs standard: ne resta aperta una sola alla volta, così la pagina
 * non diventa un rotolo infinito. Le impostazioni dell'account NON vivono qui:
 * stanno in Impostazioni → Generale.
 */
export function CoreView({ onOpenCognitive }: CoreViewProps = {}) {
  const [activeTab, setActiveTab] = useState<CoreTab>("esagono");
  const { ref: listRef, edges, measure } = useScrollEdges<HTMLDivElement>();

  // Quando cambia scheda la portiamo in vista (utile se la striscia scorre)
  // e ricalcoliamo la sfumatura di bordo.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-core-tab="${activeTab}"]`);
    // scrollIntoView manca in alcuni ambienti (es. jsdom): chiamiamolo solo se c'è.
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    measure();
  }, [activeTab, listRef, measure]);

  return (
    <div className="mx-auto max-w-lg animate-fade-up space-y-5 px-4 pb-32 pt-4 md:max-w-2xl lg:max-w-4xl">
      {/* ── Intestazione della pagina ── */}
      <header className="space-y-1">
        <h1 className="title-large font-display font-bold text-foreground">Core</h1>
        <p className="body-medium text-muted-foreground">
          Chi sei, come studi, quando sei libero.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CoreTab)}>
        {/* ── Navigazione a schede: piatte su desktop, scorrevoli (senza
               scrollbar) sul telefono ── */}
        <div className="relative border-b border-border">
          <TabsList
            ref={listRef}
            aria-label="Sezioni del Core"
            className={cn(
              "scrollbar-hide grid h-auto w-full grid-cols-3 items-stretch justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0",
              "md:inline-flex md:w-auto",
              // Spostiamo il bordo inferiore di 1px: l'indicatore attivo ci si appoggia sopra.
              "-mb-px",
            )}
          >
            {CORE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  data-core-tab={tab.id}
                  aria-label={tab.label}
                  title={tab.label}
                  className={cn(
                    "relative h-11 min-w-0 gap-1.5 rounded-t-button px-2 py-0 text-[13px] font-semibold",
                    "text-muted-foreground transition-colors duration-200",
                    "hover:text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground",
                    "data-[state=active]:shadow-none focus-visible:ring-inset",
                    "md:h-11 md:flex-none md:px-4 md:text-sm",
                    // Indicatore attivo: una riga sottile, non una pillola nera.
                    "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity after:duration-200 data-[state=active]:after:opacity-100",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate md:hidden">{tab.short}</span>
                  <span className="hidden truncate md:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Sfumatura di bordo: appare SOLO se la striscia sta davvero tagliando
              del contenuto. Nessun scrollbar visibile. */}
          {edges.left && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
            />
          )}
          {edges.right && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
            />
          )}
        </div>

        {/* ── Pannelli: ne vive uno solo alla volta ── */}
        <TabsContent value="esagono" className="mt-5">
          <CognitiveHexagonEditor onOpenDiagnostic={onOpenCognitive ?? (() => {})} />
        </TabsContent>

        <TabsContent value="materie" className="mt-5">
          <SubjectsInterestsEditor />
        </TabsContent>

        <TabsContent value="routine" className="mt-5">
          <WeeklyRoutineEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
