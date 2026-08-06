import { FileUp, FileText, Globe, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

// 🌿 P21b ERGA OPAL: il benvenuto si è fatto serio. Niente blob fluttuanti,
// niente icone ruotate che ballano: un tondo, un titolo, la pill-firma e tre
// righine che spiegano cosa sai fare. Vale per Studio, Chat, Piano e Pratica.

const FEATURES = [
  { icon: FileText, title: "PDF e appunti", desc: "Carica documenti e foto delle pagine" },
  { icon: Globe, title: "Ricerca web", desc: "Parti da un argomento, al resto pensa l'AI" },
  { icon: Brain, title: "Mini-lezioni interattive", desc: "Spiegazioni brevi con esercizi su misura" },
] as const;

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-full bg-card shadow-level-1 flex items-center justify-center mb-7">
        <Brain className="w-9 h-9 text-foreground" strokeWidth={1.5} />
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-3">
        Inizia il tuo percorso
      </h2>

      <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-8">
        Carica i tuoi appunti o cerca un argomento sul web. L'AI creerà un piano di studio personalizzato con mini-lezioni interattive.
      </p>

      <Button onClick={onUploadClick} size="lg" className="px-8">
        <FileUp className="w-5 h-5 mr-2" strokeWidth={1.75} />
        Inizia ora
      </Button>

      <div className="mt-12 flex flex-col gap-2.5 w-full max-w-xs text-left">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-center gap-3.5 bg-card rounded-[16px] px-4 py-3">
            <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <f.icon className="w-4 h-4 text-foreground" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
