/**
 * 📜 Il "dove scorre l'app": su desktop scorre #app-scroll-view, mentre su
 * mobile lo scroll vive sulla finestra. I helper scelgono il contenitore che
 * è effettivamente scrollabile nel momento della chiamata.
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

/** Sposta l'app in un punto, sul contenitore che sta davvero scorrendo. */
export function setAppScrollTop(top: number): void {
  const el = getScrollContainer();
  if (el) {
    el.scrollTop = top;
  } else if (typeof window !== "undefined") {
    // «instant» esplicito: html è scroll-behavior smooth e una scrollTo
    // implicita animerebbe la finestra (stesso trucco già usato da
    // ModulesOverview). Il cambio scheda deve spostarsi in un colpo solo.
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  }
}

/** Torna in cima (usato ad esempio quando si apre un modulo in Studio). */
export function appScrollToTop(): void {
  setAppScrollTop(0);
}
