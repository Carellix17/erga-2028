import "@testing-library/jest-dom";
import i18n from "@/i18n";

// Nei test forziamo l'italiano: jsdom dichiara "en-US" nel navigator
// e il rilevatore di lingua prenderebbe l'app in inglese.
void i18n.changeLanguage("it");

// Alcuni file di test dichiarano `// @vitest-environment node` (es.
// pdfSelection.test.ts, che lavora solo su File e Uint8Array): lì `window`
// non esiste. Senza questa guardia il setup si interrompe, il file non si
// carica e i suoi test non vengono mai eseguiti.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

// P42: jsdom non ha ResizeObserver, usato da @radix-ui/react-use-size (Slider)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

// jsdom non implementa HTMLElement.scrollTo; il fallback conserva le coordinate usate dai test.
if (typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.scrollTo !== "function") {
  HTMLElement.prototype.scrollTo = function (options?: ScrollToOptions | number, y?: number) {
    if (typeof options === "number") {
      this.scrollLeft = options;
      this.scrollTop = y ?? 0;
    } else if (options) {
      if (options.left != null) this.scrollLeft = options.left;
      if (options.top != null) this.scrollTop = options.top;
    }
  };
}
