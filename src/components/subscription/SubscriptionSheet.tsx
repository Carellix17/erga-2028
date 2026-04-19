import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Crown, Check, BookOpen, Brain, Calendar,
  MessageCircle, FileUp, Camera, Globe, Mic, BarChart3,
  Zap, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "./SubscriptionBadge";

interface SubscriptionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: PlanTier;
}

interface Feature {
  icon: React.ElementType;
  label: string;
  description: string;
  available: boolean;
}

const betaFeatures: Feature[] = [
  { icon: FileUp, label: "Caricamento PDF", description: "Carica PDF fino a 100MB per generare lezioni", available: true },
  { icon: Camera, label: "Caricamento foto", description: "Scatta o carica fino a 20 foto come materiale di studio", available: true },
  { icon: Globe, label: "Ricerca web", description: "Genera lezioni da qualsiasi argomento cercando sul web", available: true },
  { icon: BookOpen, label: "Mini-lezioni AI", description: "Lezioni personalizzate generate dall'intelligenza artificiale", available: true },
  { icon: Brain, label: "Esercizi mirati", description: "Quiz, vero/falso e scelta multipla generati dall'AI", available: true },
  { icon: MessageCircle, label: "Chat AI", description: "Chatta con l'AI per approfondire qualsiasi argomento", available: true },
  { icon: Mic, label: "Input vocale", description: "Parla per scrivere messaggi nella chat", available: true },
  { icon: Calendar, label: "Piano di studio", description: "Pianifica verifiche e interrogazioni con suggerimenti AI", available: true },
  { icon: BarChart3, label: "Interrogazione simulata", description: "Simula un'interrogazione orale con feedback AI", available: true },
  { icon: Zap, label: "Generazione illimitata", description: "Genera lezioni ed esercizi senza limiti", available: true },
];

const plans = [
  {
    tier: "beta" as PlanTier,
    name: "Piano Beta",
    price: "Gratis",
    priceNote: "Per i beta tester",
    icon: Sparkles,
    gradient: "from-primary via-secondary to-tertiary",
    badgeText: "Attivo",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    features: betaFeatures,
    isCurrent: true,
  },
  {
    tier: "pro" as PlanTier,
    name: "Piano Pro",
    price: "Prossimamente",
    priceNote: "",
    icon: Crown,
    gradient: "from-warning via-warning to-secondary",
    badgeText: "Coming soon",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    features: [
      ...betaFeatures,
      { icon: Lock, label: "Funzionalità esclusive", description: "Nuove feature riservate agli utenti Pro", available: true },
    ],
    isCurrent: false,
  },
];

export function SubscriptionSheet({ open, onOpenChange, currentTier }: SubscriptionSheetProps) {
  const currentPlan = plans.find(p => p.tier === currentTier) || plans[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe max-h-[90vh] bg-surface-container-high border-t border-outline-variant flex flex-col overflow-hidden">
        <SheetHeader className="mb-2">
          <SheetTitle className="font-display text-xl">Il tuo abbonamento</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-6 space-y-6">
          {/* Current plan card */}
          <div className={cn(
            "relative rounded-2xl p-5 overflow-hidden",
            "bg-gradient-to-br", currentPlan.gradient,
            "shadow-level-3"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-level-1">
                  <currentPlan.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-lg text-white">{currentPlan.name}</h3>
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">
                      {currentPlan.badgeText}
                    </Badge>
                  </div>
                  <p className="text-white/80 text-sm">{currentPlan.price}</p>
                </div>
              </div>
              <p className="text-white/70 body-small">
                Hai accesso a tutte le funzionalità di Erga come beta tester. Grazie per il tuo supporto! 🎉
              </p>
            </div>
          </div>

          {/* Features list */}
          <div>
            <h3 className="font-display font-semibold text-base mb-3 px-1">Le tue funzionalità</h3>
            <div className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <div
                  key={feature.label}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl transition-all duration-300",
                    "bg-surface-container hover:bg-surface-container-highest",
                    `animate-fade-up`
                  )}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    feature.available ? "bg-primary-container" : "bg-muted"
                  )}>
                    <feature.icon className={cn(
                      "w-4.5 h-4.5",
                      feature.available ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{feature.label}</span>
                      {feature.available && (
                        <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-muted-foreground body-small mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade section */}
          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-secondary flex items-center justify-center shadow-level-1">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">Piano Pro</h3>
                <p className="text-muted-foreground body-small">Prossimamente disponibile</p>
              </div>
            </div>
            <Button disabled className="w-full h-12 rounded-xl opacity-60" size="lg">
              <Crown className="w-4 h-4 mr-2" />
              Disponibile a breve
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
