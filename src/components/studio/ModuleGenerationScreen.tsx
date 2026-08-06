import { useEffect, useState } from "react";
import { Bell, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";

// 🏭 P10b — LA SALA D'ATTESA DELLA FABBRICA DEI MODULI.
// Si apre quando la fabbrica (server, azione "generateModule") sta costruendo
// un intero vagone di lezioni: barra di avanzamento animata, messaggini che
// cambiano e il cartello che rassicura — puoi anche uscire, arriva la notifica.
// 🌿 P21c ERGA OPAL: vestito sobrio (tondi neutri, niente emoji), motore intatto.

interface ModuleGenerationScreenProps {
  /** Indice del modulo in lavorazione (0-based: la UI mostra +1). */
  moduleIndex: number;
  /** 🏷️ P11d: nome parlante del vagone (titolo AI o derivato), se c'è. */
  moduleTitle?: string | null;
  /** Lezioni del modulo già tornite (arriva dal polling su generation_progress). */
  generatedCount: number;
  /** Lezioni totali di questo giro di fabbrica. */
  totalLessons: number;
  fileName?: string | null;
  /** Chiude solo la schermata: la fabbrica continua a lavorare in background. */
  onCancel: () => void;
}

const tips = [
  "La fabbrica sta tornendo le tue lezioni…",
  "Stiamo scrivendo spiegazioni su misura…",
  "Prepariamo esercizi e quiz per te…",
  "Controlliamo che ogni slide sia chiara…",
  "Quasi fatto, gli ultimi ritocchi…",
];

export function ModuleGenerationScreen({
  moduleIndex,
  moduleTitle,
  generatedCount,
  totalLessons,
  fileName,
  onCancel,
}: ModuleGenerationScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Messaggini rotanti (come nella schermata di generazione del percorso).
  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 3500);
    return () => clearInterval(interval);
  }, []);

  // Obiettivo della barra: mai letteralmente 0% (altrimenti sembra ferma).
  const targetProgress = totalLessons > 0
    ? Math.min(100, Math.max(8, (generatedCount / totalLessons) * 100))
    : 8;

  // 🌊 P10c: stesso "caricamento unico" dell'anello — tra un paletto reale e
  // l'altro l'ago striscia verso il paletto successivo, senza mai fermarsi.
  const capProgress = totalLessons > 0
    ? Math.min(97, ((generatedCount + 1) / totalLessons) * 100)
    : 30;

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        const diff = targetProgress - prev;
        if (diff < -0.3) return targetProgress;
        if (diff >= 0.3) return prev + diff * 0.08;
        if (prev < capProgress) {
          const nudge = Math.max(0.015, (capProgress - prev) * 0.004);
          return Math.min(capProgress, prev + nudge);
        }
        return prev;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [targetProgress, capProgress]);

  return (
    <div className="fixed inset-0 z-[90] bg-background flex flex-col items-center justify-center p-6 animate-fade-up overflow-y-auto">
      {/* Insegna della fabbrica */}
      <div className="relative mb-8 mt-4">
        <div className="w-24 h-24 rounded-full bg-card shadow-level-1 flex items-center justify-center">
          <Factory className="w-10 h-10 text-foreground" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-2 bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[11px] font-bold">
          Modulo {moduleIndex + 1}
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground text-center mb-1">
        Sto preparando il modulo {moduleIndex + 1}
      </h2>
      {moduleTitle && (
        <p className="text-sm text-foreground/80 font-semibold mb-1 text-center max-w-[85vw] truncate">
          «{moduleTitle}»
        </p>
      )}
      {fileName && (
        <p className="text-xs text-foreground font-medium mb-6 bg-secondary px-3 py-1.5 rounded-full max-w-[90vw] truncate">
          {fileName}
        </p>
      )}

      {/* Barra di avanzamento */}
      <div className="w-full max-w-xs mb-3">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1 tabular-nums">
        Lezione {Math.min(generatedCount, totalLessons)} di {totalLessons}
      </p>
      <p className="body-small text-muted-foreground mb-8 min-h-[1.5rem] text-center transition-opacity">
        {tips[tipIndex]}
      </p>

      {/* Cartello notifica: puoi anche uscire */}
      <div className="w-full max-w-sm rounded-[18px] bg-card p-4 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-foreground" strokeWidth={1.75} />
        </div>
        <p className="body-small text-foreground leading-relaxed pt-1.5">
          Puoi anche uscire da questa schermata o chiudere l'app: ti arriva una
          <strong> notifica</strong> quando il modulo è pronto.
        </p>
      </div>

      <Button variant="outline" className="h-12 px-6" onClick={onCancel}>
        Torna alle lezioni
      </Button>
    </div>
  );
}
