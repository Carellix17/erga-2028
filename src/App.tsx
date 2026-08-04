import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FocusProvider } from "@/contexts/FocusContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Registrati from "./pages/Registrati";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import SettingsIndex from "./pages/settings/SettingsIndex";
import SettingsAccount from "./pages/settings/SettingsAccount";
import SettingsAppearance from "./pages/settings/SettingsAppearance";
import SettingsAccessibility from "./pages/settings/SettingsAccessibility";
import SettingsTerms from "./pages/settings/SettingsTerms";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";

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
            <Route path="/app/impostazioni/aspetto" element={<ProtectedRoute><SettingsAppearance /></ProtectedRoute>} />
            <Route path="/app/impostazioni/accessibilita" element={<ProtectedRoute><SettingsAccessibility /></ProtectedRoute>} />
            <Route path="/app/impostazioni/termini" element={<ProtectedRoute><SettingsTerms /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
