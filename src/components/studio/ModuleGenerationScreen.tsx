import { useEffect, useState } from "react";
import { Bell, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";

// 🏭 P10b — LA SALA D'ATTESA DELLA FABBRICA DEI MODULI.
// Si apre quando la fabbrica (server, azione "generateModule") sta costruendo
// un intero vagone di lezioni: barra di avanzamento animata, messaggini che
// cambiano e il banner che rassicura — puoi anche uscire, arriva la notifica.

interface ModuleGenerationScreenProps {
  /** Indice del modulo in lavorazione (0-based: la UI mostra +1). */
  moduleIndex: number;
  /** Lezioni del modulo già tornite (arriva dal polling su generation_progress). */
  generatedCount: number;
  /** Lezioni totali di questo giro di fabbrica. */
  totalLessons: number;
  fileName?: string | null;
  /** Chiude solo la schermata: la fabbrica continua a lavorare in background. */
  onCancel: () => void;
}

const tips = [
  "La fabbrica sta tornendo le tue lezioni… 🏭",
  "Stiamo scrivendo spiegazioni su misura… ✍️",
  "Prepariamo esercizi e quiz per te… 🎯",
  "Controlliamo che ogni slide sia chiara… 🔍",
  "Quasi fatto, gli ultimi ritocchi… ✨",
];

export function ModuleGenerationScreen({
  moduleIndex,
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

  // 🌊 P10c: stesso "caricamento unico" dell'orbe — tra un paletto reale e
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
        <div className="w-24 h-24 rounded-[1.75rem] bg-primary text-primary-foreground flex items-center justify-center shadow-level-3 animate-pulse-soft">
          <Factory className="w-11 h-11 text-primary-foreground" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-card border border-outline-variant/60 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-level-1">
          Modulo {moduleIndex + 1}
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold text-foreground text-center mb-1">
        Sto preparando il modulo {moduleIndex + 1}
      </h2>
      {fileName && (
        <p className="body-small text-primary font-medium mb-6 bg-primary-container px-3 py-1 rounded-full inline-block max-w-[90vw] truncate">
          {fileName}
        </p>
      )}

      {/* Barra di avanzamento */}
      <div className="w-full max-w-xs mb-3">
        <div className="h-3 rounded-full bg-secondary/60 overflow-hidden border border-outline-variant/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">
        Lezione {Math.min(generatedCount, totalLessons)} di {totalLessons}
      </p>
      <p className="body-small text-muted-foreground mb-8 min-h-[1.5rem] text-center transition-opacity">
        {tips[tipIndex]}
      </p>

      {/* Banner notifica: puoi anche uscire */}
      <div className="w-full max-w-sm rounded-2xl bg-card border border-outline-variant/60 shadow-level-1 p-4 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <p className="body-small text-foreground leading-relaxed">
          Puoi anche uscire da questa schermata o chiudere l'app: ti arriva una
          <strong> notifica</strong> quando il modulo è pronto. ✅
        </p>
      </div>

      <Button variant="outline" className="h-12 px-6" onClick={onCancel}>
        Torna al sentiero
      </Button>
    </div>
  );
}
