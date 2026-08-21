import "./App.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FocusProvider } from "@/contexts/FocusContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import Landing from "./pages/Landing";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";

// La landing resta nel primo caricamento; le aree dell'app vengono scaricate
// solo quando servono. In questo modo chi visita la pagina pubblica non deve
// attendere anche calendario, lettore PDF, esercizi e impostazioni.
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Registrati = lazy(() => import("./pages/Registrati"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const SettingsIndex = lazy(() => import("./pages/settings/SettingsIndex"));
const SettingsAccount = lazy(() => import("./pages/settings/SettingsAccount"));
const SettingsAppearance = lazy(() => import("./pages/settings/SettingsAppearance"));
const SettingsAccessibility = lazy(() => import("./pages/settings/SettingsAccessibility"));
const SettingsTerms = lazy(() => import("./pages/settings/SettingsTerms"));
const SettingsLanguage = lazy(() => import("./pages/settings/SettingsLanguage"));
// AuraLab: banco di prova dell'aura dei blocchi (P27). Caricato e registrato
// SOLO in sviluppo (import.meta.env.DEV): non esiste nella build di produzione.
const AuraLab = lazy(() => import("./pages/AuraLab"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — istantaneo tra le tab
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

// 🗄️ P16: la dispensa nel telefono — lezioni e contesti già scaricati restano
// sul dispositivo 24 ore. Cambiare percorso o riaprire l'app mostra SUBITO
// quello che c'è, e il cloud aggiorna in silenzio sullo sfondo.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "erga-query-dispensa-v1",
});

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      dehydrateOptions: {
        // Solo il dominio "lessons" (liste, contesti, singole lezioni, scorte):
        // le chiavi contengono già l'id utente → niente mescolamenti tra persone.
        shouldDehydrateQuery: (q) => q.queryKey[0] === "lessons",
      },
    }}
  >
    <TooltipProvider>
      <AuthProvider>
        <SaveStatusProvider>
          <ThemeProvider>
            <AccessibilityProvider>
            <FocusProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
            <ErrorBoundary>
          <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registrati" element={<Registrati />} />
            <Route path="/cambia-password" element={<ChangePassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/" element={<Landing />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="/app/impostazioni" element={<ProtectedRoute><SettingsIndex /></ProtectedRoute>} />
            <Route path="/app/impostazioni/account" element={<ProtectedRoute><SettingsAccount /></ProtectedRoute>} />
            <Route path="/app/impostazioni/generale" element={<ProtectedRoute><SettingsAccount /></ProtectedRoute>} />
            <Route path="/app/impostazioni/aspetto" element={<ProtectedRoute><SettingsAppearance /></ProtectedRoute>} />
            <Route path="/app/impostazioni/accessibilita" element={<ProtectedRoute><SettingsAccessibility /></ProtectedRoute>} />
            <Route path="/app/impostazioni/lingua" element={<ProtectedRoute><SettingsLanguage /></ProtectedRoute>} />
            <Route path="/app/impostazioni/termini" element={<ProtectedRoute><SettingsTerms /></ProtectedRoute>} />
            {import.meta.env.DEV && <Route path="/aura-lab" element={<AuraLab />} />}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
            </ErrorBoundary>
              </BrowserRouter>
            </FocusProvider>
            </AccessibilityProvider>
          </ThemeProvider>
        </SaveStatusProvider>
      </AuthProvider>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
