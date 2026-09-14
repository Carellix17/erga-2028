/**
 * 📜 Il "dove scorre l'app":
 * - su DESKTOP (≥768px) l'app shell sigilla la viewport e la colonna del
 *   contenuto (#app-scroll-view) scorre da sola, mentre sidebar e struttura
 *   restano immobili;
 * - su MOBILE lo scroll resta sulla finestra, come sempre.
 *
 * Questo helper capisce chi è il vero contenitore di scroll AL MOMENTO della
 * chiamata, così chi salva/ripristina posizioni o torna in alto non deve
 * conoscere la differenza (e non si rompe nulla nei test jsdom).
 */

function getScrollContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("app-scroll-view");
  // L'elemento è il vero scroller solo se è effettivamente scrollabile
  // (contenuto più alto dei suoi bordi). Su mobile, o con contenuti corti,
  // lo scroll vive nella finestra.
  if (el && el.scrollHeight > el.clientHeight + 1) return el;
  return null;
}

/** Posizione di scroll attuale dell'app (colonna su desktop, finestra su mobile). */
export function getAppScrollTop(): number {
  const el = getScrollContainer();
  if (el) return el.scrollTop;
  return typeof window !== "undefined" ? window.scrollY || 0 : 0;
}

/** Riporta l'app a una posizione salvata, sul contenitore giusto. */
export function setAppScrollTop(top: number): void {
  const el = getScrollContainer();
  if (el) {
    el.scrollTop = top;
  } else if (typeof window !== "undefined") {
    window.scrollTo(0, top);
  }
}

/** Torna in cima (usato ad esempio quando si apre un modulo in Studio). */
export function appScrollToTop(): void {
  setAppScrollTop(0);
}
