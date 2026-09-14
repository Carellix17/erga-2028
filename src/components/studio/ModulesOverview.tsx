import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, Lock, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { appScrollToTop, getAppScrollTop } from "@/lib/appScroll";

export type ModuleState = "done" | "cur" | "gen" | "lock" | "ready";

export interface ModuleCardData {
  index: number;
  title: string;
  doneCount: number;
  total: number;
  state: ModuleState;
  /** Solo per lo stato "gen": percentuale di generazione (0-100). */
  genPercent?: number;
}

interface ModulesOverviewProps {
  modules: ModuleCardData[];
  onOpenModule: (moduleIndex: number) => void;
}

/**
 * 🧭 P46 — lo "strato" dentro la card fissa del corso: StudioView mette un
 * `<div id="studio-modules-layer" />` subito sotto la card sticky, e questa
 * schermata ci infila dentro (via portale) la sfumatura di uscita e la pillola
 * "↑ N moduli completati". Così restano ancorate sotto la card da sole, senza
 * posizioni fisse calcolate a mano.
 */
export const MODULES_LAYER_ID = "studio-modules-layer";

/** Altezza di ripiego dell'intestazione fissa quando non è misurabile (test jsdom). */
const HEAD_FALLBACK = 132;
/** Sotto questa soglia di scroll siamo "in cima": la pillola sparisce. */
const TOP_THRESHOLD = 12;
/** Spazio che la pillola occupa sotto la card (36 px + 8 px di margine) + 8 px
 *  di respiro: così il modulo d'atterraggio resta INTERO sotto la pillola. */
const PILL_SPACE = 52;

/** 🔎 Il contenitore che scorre davvero (colonna desktop o finestra mobile).
 *  Stessa logica di src/lib/appScroll.ts, che però non espone l'elemento. */
function resolveScroller(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("app-scroll-view");
  if (el && el.scrollHeight > el.clientHeight + 1) return el;
  return null;
}

/** Scorre (liscio o immediato) sul contenitore giusto, senza rompersi in jsdom. */
function scrollToY(y: number, behavior: ScrollBehavior) {
  const top = Math.max(0, y);
  const el = resolveScroller();
  if (el) {
    if (typeof el.scrollTo === "function") el.scrollTo({ top, behavior });
    else el.scrollTop = top;
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top, behavior });
  } catch {
    window.scrollTo(0, top);
  }
}

/** Quanto è alta la card fissa (card percorso + sfumatura) adesso. */
function stickyHeadHeight(): number {
  const head = typeof document === "undefined"
    ? null
    : document.getElementById(MODULES_LAYER_ID)?.parentElement ?? null;
  const h = head?.getBoundingClientRect().height ?? 0;
  return h > 0 ? h : HEAD_FALLBACK;
}

/**
 * 🎯 Il modulo su cui la lista deve atterrare aprendosi: il modulo in corso (o
 * in generazione); se il corso è tutto finito, l'ultimo modulo (niente errori
 * a corso completato). Corso nuovo → il primo modulo.
 */
export function landingModuleIndex(modules: ModuleCardData[]): number | null {
  if (modules.length === 0) return null;
  const active = modules.find((m) => m.state === "cur" || m.state === "gen");
  if (active) return active.index;
  const firstNotDone = modules.find((m) => m.state !== "done");
  if (firstNotDone) return firstNotDone.index;
  return modules[modules.length - 1].index;
}

/** 🔢 Quanti moduli sono già completati PRIMA del modulo d'atterraggio. */
export function completedBeforeLanding(modules: ModuleCardData[]): number {
  const target = landingModuleIndex(modules);
  if (target === null) return 0;
  return modules.filter((m) => m.index < target && m.state === "done").length;
}

/**
 * P24 — SCHERMATA 1: i moduli del corso.
 * Rettangoli cliccabili (come nel mockup approvato): titolo INTERO del modulo,
 * numero in una targa, stato (completato / riprendi / in generazione / da
 * sbloccare / apri) e barra di avanzamento per il modulo corrente o in generazione.
 * La logica (quali moduli esistono, quanto sono completi) arriva da StudioView.
 * P37: il pulsante "Crea nuovo percorso" e i tre accessi alla pratica vivono
 * ora in StudioView (sopra e sotto la card del percorso): qui restano solo
 * le schede dei moduli, con padding inferiore pb-32 che tiene tutto sopra
 * la barra di navigazione fissa.
 *
 * 🧭 P46 — la lettura del percorso diventa comoda:
 *  (a) all'apertura la lista si posiziona DA SOLA sul modulo attivo, che
 *      diventa il primo elemento visibile sotto la card fissa del corso;
 *  (b) sotto la card fissa c'è una sfumatura morbida: le schede ci scivolano
 *      sotto senza taglio netto;
 *  (c) se prima del modulo attivo ci sono moduli completati, appare la pillola
 *      "↑ N moduli completati" appena sotto la card: un tocco riporta in cima
 *      con uno scorrimento morbido, e appena torni in cima la pillola sparisce.
 */
export function ModulesOverview({ modules, onOpenModule }: ModulesOverviewProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [showPill, setShowPill] = useState(false);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  // Se lo studente tocca lo schermo mentre arrivano i dati, non gli rubiamo lo scroll.
  const touchedRef = useRef(false);
  // Ultimo modulo su cui ci siamo già posizionati (per non riposizionare a ogni render).
  const landedRef = useRef<number | null>(null);

  const targetIndex = landingModuleIndex(modules);
  const completedBefore = completedBeforeLanding(modules);

  // Lo strato-portale vive dentro la card sticky di StudioView: si risolve dopo
  // il mount (e se non c'è — test, altri usi — la schermata funziona lo stesso).
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    setLayer(document.getElementById(MODULES_LAYER_ID));
  }, []);

  // ── La pillola compare solo quando c'è davvero qualcosa sopra ──
  useEffect(() => {
    if (completedBefore === 0) {
      setShowPill(false);
      return;
    }
    const compute = () => setShowPill(getAppScrollTop() > TOP_THRESHOLD);
    compute();
    const scroller = resolveScroller();
    const targets: (HTMLElement | Window)[] = [window];
    if (scroller) targets.push(scroller);
    targets.forEach((t) => t.addEventListener("scroll", compute, { passive: true }));
    return () => targets.forEach((t) => t.removeEventListener("scroll", compute));
  }, [completedBefore]);

  // ── (a) Atterraggio automatico sul modulo attivo ──
  useEffect(() => {
    if (targetIndex === null || modules.length === 0) return;
    if (touchedRef.current || landedRef.current === targetIndex) return;

    const markTouched = () => { touchedRef.current = true; };
    window.addEventListener("touchstart", markTouched, { passive: true });
    window.addEventListener("wheel", markTouched, { passive: true });

    const land = () => {
      if (touchedRef.current) return;
      const row = listRef.current?.querySelector<HTMLElement>(`[data-module-row="${targetIndex}"]`);
      if (!row) return;
      const pad = completedBefore > 0 ? PILL_SPACE : 8;
      const headBottom = (() => {
        const head = document.getElementById(MODULES_LAYER_ID)?.parentElement;
        const bottom = head?.getBoundingClientRect().bottom ?? 0;
        return bottom > 0 ? bottom : null;
      })();
      // Posizione del modulo rispetto all'altezza dell'intestazione fissa.
      const delta = headBottom === null
        ? row.getBoundingClientRect().top - stickyHeadHeight() - pad
        : row.getBoundingClientRect().top - headBottom - pad;
      landedRef.current = targetIndex;
      // 🫱 all'apertura: immediato (niente "viaggio" sotto l'occhio); dopo un
      // tocco dello studente non ci muoviamo più.
      const first = getAppScrollTop();
      scrollToY(first + delta, ("instant" as ScrollBehavior));
      // Secondo passaggio: le animazioni d'ingresso (200-240 ms) spostano di
      // qualche pixel la lista; a fine corsa ci riallineiamo una volta sola.
      window.setTimeout(() => {
        if (touchedRef.current) return;
        const again = listRef.current?.querySelector<HTMLElement>(`[data-module-row="${targetIndex}"]`);
        if (!again) return;
        const head = document.getElementById(MODULES_LAYER_ID)?.parentElement;
        const bottom = head?.getBoundingClientRect().bottom ?? 0;
        const d = bottom > 0
          ? again.getBoundingClientRect().top - bottom - pad
          : again.getBoundingClientRect().top - stickyHeadHeight() - pad;
        if (Math.abs(d) > 2) scrollToY(getAppScrollTop() + d, ("instant" as ScrollBehavior));
      }, 320);
    };

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(land); });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("touchstart", markTouched);
      window.removeEventListener("wheel", markTouched);
    };
  }, [targetIndex, modules.length, completedBefore]);

  if (modules.length === 0) return null;

  const handlePillClick = () => {
    touchedRef.current = true;
    // In cima con scorrimento morbido (dove possibile).
    const el = resolveScroller();
    if (el && typeof el.scrollTo === "function") el.scrollTo({ top: 0, behavior: "smooth" });
    else appScrollToTop();
  };

  // ── Sfumatura + pillola, ancorate sotto la card fissa ──
  const overlay = (
    <>
      {/* (b) uscita morbida: le schede scivolano sotto senza taglio netto */}
      <div
        aria-hidden
        data-modules-fade
        className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background via-background/80 to-transparent"
      />
      <AnimatePresence>
        {showPill && completedBefore > 0 && (
          <motion.button
            key="modules-completed-pill"
            type="button"
            onClick={handlePillClick}
            aria-label="Torna in cima ai moduli"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-1/2 top-full z-30 mt-2 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-pill border border-border bg-card/95 px-3.5 text-xs font-bold text-foreground shadow-level-2 backdrop-blur-md"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.6} />
            {completedBefore === 1 ? "1 modulo completato" : `${completedBefore} moduli completati`}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div className="px-4 pt-5 pb-32 animate-fade-up">
      {layer ? createPortal(overlay, layer) : null}
      <div ref={listRef} className="flex flex-col gap-3">
        {modules.map((m) => {
          const isLocked = m.state === "lock";
          const isGen = m.state === "gen";
          const isDone = m.state === "done";
          const isCur = m.state === "cur";
          const pct = m.total > 0 ? Math.round((m.doneCount / m.total) * 100) : 0;

          let badge: React.ReactNode;
          if (isDone) {
            badge = (
              <span className="badge-chip bg-primary text-primary-foreground">Completato</span>
            );
          } else if (isCur) {
            badge = (
              <span className="badge-chip bg-subject-accent text-subject-accent-foreground">
                <Play className="w-3 h-3" fill="currentColor" strokeWidth={0} />
                Riprendi
              </span>
            );
          } else if (isGen) {
            badge = (
              <span className="badge-chip bg-surface-container-high text-muted-foreground">
                <RefreshCw className="w-3 h-3 animate-spin" />
                In generazione
              </span>
            );
          } else if (isLocked) {
            badge = <span className="badge-chip bg-surface-container-high text-muted-foreground">Da sbloccare</span>;
          } else {
            badge = <span className="badge-chip bg-surface-container-high text-foreground">Apri</span>;
          }

          const subtitle = isDone
            ? `${m.doneCount} di ${m.total} lezioni`
            : isCur
              ? `${m.doneCount} di ${m.total} lezioni · continua da dove eri`
              : isGen
                ? "Stiamo costruendo le lezioni…"
                : isLocked
                  ? "Completa il modulo precedente"
                  : `${m.doneCount} di ${m.total} lezioni`;

          return (
            <button
              key={m.index}
              type="button"
              disabled={isLocked}
              onClick={() => onOpenModule(m.index)}
              aria-label={`Modulo ${m.index + 1}: ${m.title}`}
              data-module-row={m.index}
              data-module-state={m.state}
              className={cn(
                "interactive-card flex items-center gap-3.5 rounded-card bg-card border border-border px-4 py-4 text-left shadow-level-1",
                !isLocked && "hover:border-primary/30 hover:bg-surface-container-low",
                isCur && "border-subject-accent ring-2 ring-subject-accent",
                isLocked && "opacity-60 cursor-default",
              )}
            >
              {/* Targa numero */}
              <span
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-button flex items-center justify-center font-display font-extrabold text-base transition-colors duration-200",
                  isDone && "bg-subject-accent text-subject-accent-foreground",
                  isCur && "bg-subject-accent text-subject-accent-foreground",
                  isGen && "bg-surface-container-high text-muted-foreground",
                  isLocked && "bg-surface-container-high text-muted-foreground",
                  !isDone && !isCur && !isGen && !isLocked && "bg-primary text-primary-foreground",
                )}
              >
                {isDone ? (
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                ) : isLocked ? (
                  <Lock className="w-5 h-5" strokeWidth={1.9} />
                ) : (
                  m.index + 1
                )}
              </span>

              {/* Testo */}
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold leading-snug text-foreground">
                  {m.title}
                </span>
                <span className="block text-xs text-muted-foreground mt-1 font-medium">
                  {subtitle}
                </span>
                {(isCur || isGen) && (
                  <span className="block mt-2.5 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-all duration-500",
                        isGen ? "bg-subject-accent" : "bg-subject-accent",
                      )}
                      style={{ width: `${isGen ? (m.genPercent ?? 0) : pct}%` }}
                    />
                  </span>
                )}
              </span>

              {/* Badge */}
              <span className="flex-shrink-0">{badge}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
