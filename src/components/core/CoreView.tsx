import { useState } from "react";
import { Hexagon, BookOpen, CalendarClock, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CognitiveHexagonEditor } from "./CognitiveHexagonEditor";
import { SubjectsInterestsEditor } from "./SubjectsInterestsEditor";
import { WeeklyRoutineEditor } from "./WeeklyRoutineEditor";
import { AccountSettings } from "./AccountSettings";

type CoreTab = "esagono" | "materie" | "routine" | "account";

const CORE_TABS: { id: CoreTab; label: string; icon: typeof Hexagon }[] = [
  { id: "esagono", label: "Esagono", icon: Hexagon },
  { id: "materie", label: "Materie", icon: BookOpen },
  { id: "routine", label: "Routine", icon: CalendarClock },
  { id: "account", label: "Account", icon: UserCircle2 },
];

interface CoreViewProps {
  /** Apre il questionario cognitivo iniziale (gestito dalla schermata principale). */
  onOpenCognitive?: () => void;
}

/**
 * Core — il centro della personalizzazione dello studente.
 * Riunisce in un unico posto Esagono Cognitivo, materie, interessi,
 * routine settimanale e account, prima sparsi su schermate diverse.
 */
export function CoreView({ onOpenCognitive }: CoreViewProps = {}) {
  const [activeTab, setActiveTab] = useState<CoreTab>("esagono");

  return (
    <div className="px-4 pt-4 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-5 animate-fade-up">
      {/* Intestazione */}
      <header className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-pill bg-primary flex items-center justify-center shrink-0 shadow-level-1">
          <Hexagon className="w-5 h-5 text-primary-foreground" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="title-large font-display font-bold text-foreground">Core</h1>
          <p className="body-small text-muted-foreground">
            Chi sei, come studi, quando sei libero: il centro della tua Erga.
          </p>
        </div>
      </header>

      {/* Schede */}
      <div
        role="tablist"
        aria-label="Sezioni del Core"
        className="flex gap-1.5 overflow-x-auto rounded-pill bg-surface-container-low border border-outline-variant/60 p-1.5 scrollbar-none"
      >
        {CORE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`core-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`core-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                // Freccia sinistra/destra per spostarsi tra le schede da tastiera
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = CORE_TABS.findIndex((t) => t.id === activeTab);
                const delta = e.key === "ArrowRight" ? 1 : -1;
                const next = CORE_TABS[(i + delta + CORE_TABS.length) % CORE_TABS.length];
                setActiveTab(next.id);
                document.getElementById(`core-tab-${next.id}`)?.focus();
              }}
              className={cn(
                "relative flex-1 min-w-[88px] flex items-center justify-center gap-1.5 h-11 px-3 rounded-pill label-large font-semibold transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="coreActiveTab"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-pill bg-primary shadow-level-1"
                  aria-hidden="true"
                />
              )}
              <Icon className="relative z-10 w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pannelli */}
      <div
        role="tabpanel"
        id="core-panel-esagono"
        aria-labelledby="core-tab-esagono"
        hidden={activeTab !== "esagono"}
      >
        {activeTab === "esagono" && (
          <CognitiveHexagonEditor onOpenDiagnostic={onOpenCognitive ?? (() => {})} />
        )}
      </div>
      <div
        role="tabpanel"
        id="core-panel-materie"
        aria-labelledby="core-tab-materie"
        hidden={activeTab !== "materie"}
      >
        {activeTab === "materie" && <SubjectsInterestsEditor />}
      </div>
      <div
        role="tabpanel"
        id="core-panel-routine"
        aria-labelledby="core-tab-routine"
        hidden={activeTab !== "routine"}
      >
        {activeTab === "routine" && <WeeklyRoutineEditor />}
      </div>
      <div
        role="tabpanel"
        id="core-panel-account"
        aria-labelledby="core-tab-account"
        hidden={activeTab !== "account"}
      >
        {activeTab === "account" && <AccountSettings />}
      </div>
    </div>
  );
}
