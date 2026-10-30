export type AppScrollTab = "home" | "piano" | "studio" | "core";
export type AppScrollPositions = Record<AppScrollTab, number>;

function tabFromSearch(search: string): AppScrollTab {
  const requestedTab = new URLSearchParams(search).get("tab");
  return requestedTab === "home" || requestedTab === "piano" || requestedTab === "studio" || requestedTab === "core"
    ? requestedTab
    : "home";
}

/**
 * Save the tab being left when browser Back/Forward changes the URL directly.
 * Settings and lesson-overlay POPs keep the same tab and must not replace its
 * saved position with the scroll position of their own screen.
 */
export function saveDepartingAppTabScroll(
  pathname: string,
  search: string,
  activeTab: AppScrollTab,
  scrollTop: number,
  scrollPositions: AppScrollPositions,
): void {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath !== "/app" || tabFromSearch(search) === activeTab) return;
  scrollPositions[activeTab] = Math.max(0, scrollTop);
}

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

/** Riporta l'app a una posizione salvata, sul contenitore giusto. */
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
