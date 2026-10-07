import { useEffect, useState } from "react";

export interface KeyboardViewport {
  /** Pixel coperti dalla tastiera: quanto alzare un elemento fissato in basso. */
  inset: number;
  /** Altezza del viewport VISIBILE in px (con la tastiera aperta è quella ridotta). */
  viewportHeight: number | null;
}

/**
 * Il viewport come lo vede il pollice, non il layout.
 *
 * Con la tastiera virtuale aperta, gli elementi fissati in fondo alla
 * pagina restano dov'erano — la finestra di layout non cambia su iOS e il
 * foglio in basso finisce sepolto sotto i tasti. Questo hook legge
 * `window.visualViewport` (che il browser restringe davvero quando la
 * tastiera è aperta) e restituisce:
 *
 *  · `inset` — i pixel da aggiungere a `bottom` per stare sopra la tastiera;
 *  · `viewportHeight` — l'altezza davvero visibile (da usare come
 *    max-height del foglio mentre la tastiera è aperta), null altrimenti.
 *
 * Su desktop (niente visualViewport separato) vale inset 0: nessun effetto.
 * Serve al doc di caricamento materiali perché il suo tasto principale
 * DEVE restare sempre visibile (richiesta del proprietario, 7 ottobre 2026).
 */
export function useKeyboardInset(): KeyboardViewport {
  const [state, setState] = useState<KeyboardViewport>({ inset: 0, viewportHeight: null });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // La finestra di layout non si muove con la tastiera: la differenza
      // tra le due altezze (meno l'eventuale scroll interno del viewport
      // visivo) è esattamente lo spazio rubato dai tasti.
      const layout = document.documentElement.clientHeight;
      const inset = Math.max(0, Math.round(layout - vv.height - vv.offsetTop));
      const viewportHeight = inset > 0 ? Math.round(vv.height) : null;
      setState((prev) =>
        prev.inset === inset && prev.viewportHeight === viewportHeight
          ? prev
          : { inset, viewportHeight },
      );
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
