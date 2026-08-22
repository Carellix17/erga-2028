import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initAutoContrast } from "@/lib/autoContrast";

createRoot(document.getElementById("root")!).render(<App />);

// P28 — inchiostro a contrasto automatico: lo script osserva il DOM e tiene
// i blocchi marcati `data-auto-contrast` sempre leggibili sul loro fondo
// (vale anche quando cambia corso → colore materia, o cambia il tema).
const disposeAutoContrast = initAutoContrast();
if (import.meta.hot) {
  import.meta.hot.dispose(disposeAutoContrast);
}

// PWA service worker registration with iframe / Lovable preview guards.
// The SW must NEVER register inside the editor preview iframe — it would
// serve stale cached builds and break navigation.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname === "localhost";

if (isPreviewHost || isInIframe) {
  // Clean up any previously registered service workers in preview/iframe contexts
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }
} else if ("serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  }).catch(() => {
    // virtual module only exists in production build; ignore in dev
  });
}
