import { Navigate, Link } from "react-router-dom";
import { Brain } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DemoFlow } from "@/components/demo/DemoFlow";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 animate-pulse" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-dot-grid relative overflow-hidden">
      {/* Subtle ambient orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[420px] h-[420px] rounded-full bg-tertiary/8 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto px-5 sm:px-8 h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg text-slate-900">Erga</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/login"
            className="px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition"
          >
            Accedi
          </Link>
          <Link
            to="/registrati"
            className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Registrati
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 pt-8 sm:pt-16 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">
            Il tuo assistente di studio
          </p>
          <h1 className="font-display font-semibold text-4xl sm:text-6xl leading-[1.05] text-slate-900 tracking-tight">
            Studia qualsiasi cosa.
            <br />
            <span className="text-slate-400">In tre slide.</span>
          </h1>
          <p className="mt-5 text-slate-500 text-base sm:text-lg leading-relaxed">
            Trasforma i tuoi materiali in sessioni di apprendimento attivo.
            Mappa le tue competenze e colma le lacune in tempo reale.
          </p>
        </div>

        <DemoFlow />
      </main>

      <footer className="relative z-10 pb-8 text-center text-xs text-slate-400">
        Erga · Impara meglio, non di più.
      </footer>
    </div>
  );
}