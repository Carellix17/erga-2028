import { useState } from "react";
import { CompactHeader, type CompactHeaderProps } from "./CompactHeader";
import { DynamicHeroCard, type HeroState, type DynamicHeroCardProps } from "./DynamicHeroCard";
import { QuickActions, type QuickActionsProps } from "./QuickActions";
import { CognitivePulse, type CognitivePulseProps } from "./CognitivePulse";
import { DailyTimeline, type DailyTimelineProps } from "./DailyTimeline";
import { BottomNav, type HomeTab } from "./BottomNav";

export interface HomeV2Props {
  headerProps?: CompactHeaderProps;
  heroProps?: DynamicHeroCardProps;
  quickActionsProps?: QuickActionsProps;
  cognitiveProps?: CognitivePulseProps;
  timelineProps?: DailyTimelineProps;
  activeTab?: HomeTab;
  onTabChange?: (tab: HomeTab) => void;
  heroState?: HeroState;
  onHeroStateChange?: (state: HeroState) => void;
}

export function HomeV2({
  headerProps,
  heroProps,
  quickActionsProps,
  cognitiveProps,
  timelineProps,
  activeTab = "home",
  onTabChange,
  heroState = "ACTIVE_SESSION",
  onHeroStateChange,
}: HomeV2Props) {
  const [internalHeroState, setInternalHeroState] = useState<HeroState>(heroState);

  const currentHeroState = onHeroStateChange ? heroState : internalHeroState;

  const handleHeroStateChange = (state: HeroState) => {
    if (onHeroStateChange) {
      onHeroStateChange(state);
    } else {
      setInternalHeroState(state);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 overflow-x-clip">
        {/* Ritmo verticale Home: il saluto sta a 8px dal margine superiore
            (metà dei 16px precedenti) e il blocco hero segue a 12px,
            mantenendo i 20px tra gli altri blocchi. */}
        <div className="px-4 pt-2 pb-4">
          <CompactHeader {...headerProps} />

          <div className="mt-3 space-y-3">
            <DynamicHeroCard heroState={currentHeroState} {...heroProps} />
            
            {/* Manual heroState switcher for testing - as per requirements */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(["ACTIVE_SESSION", "CONTEXT_EVENT", "SPACED_REPETITION"] as HeroState[]).map((state) => (
                <button
                  key={state}
                  onClick={() => handleHeroStateChange(state)}
                  className={`h-11 shrink-0 rounded-full px-4 text-[12px] font-medium border whitespace-nowrap ${
                    currentHeroState === state
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200/80"
                  }`}
                >
                  {state === "ACTIVE_SESSION" ? "Sessione" : state === "CONTEXT_EVENT" ? "Pausa" : "Ripasso"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <QuickActions {...quickActionsProps} />

            <CognitivePulse {...cognitiveProps} />

            <DailyTimeline {...timelineProps} />
          </div>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

// Export all sub-components for modular usage
export { CompactHeader } from "./CompactHeader";
export { DynamicHeroCard } from "./DynamicHeroCard";
export { QuickActions } from "./QuickActions";
export { CognitivePulse } from "./CognitivePulse";
export { DailyTimeline } from "./DailyTimeline";
export { BottomNav } from "./BottomNav";
export { HomeBottomNav } from "./HomeBottomNav";
