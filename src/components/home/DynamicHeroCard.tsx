import { BookOpen, Clock, Brain, Play, ArrowRight, Moon, Sparkles } from "lucide-react";

export type HeroState = "ACTIVE_SESSION" | "CONTEXT_EVENT" | "SPACED_REPETITION";

export interface DynamicHeroCardProps {
  heroState?: HeroState;
  subject?: string;
  lessonTitle?: string;
  retentionText?: string;
  progressPercent?: number;
  badgeText?: string;
  secondaryText?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function DynamicHeroCard({
  heroState = "ACTIVE_SESSION",
  subject = "Matematica",
  lessonTitle = "Equazioni di secondo grado",
  retentionText = "Ritenzione 78% · Ripassa oggi",
  progressPercent = 42,
  badgeText,
  secondaryText,
  onPrimaryAction,
  primaryActionLabel,
  onSecondaryAction,
}: DynamicHeroCardProps) {
  if (heroState === "CONTEXT_EVENT") {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-100 p-5 w-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-7 px-3 rounded-full bg-white border border-slate-200/80 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <Moon className="h-3.5 w-3.5" />
            {badgeText ?? "Pausa programmata"}
          </span>
        </div>
        <h2 className="text-[20px] font-semibold text-slate-900 leading-tight line-clamp-2">
          {secondaryText ?? "Hai saltato l'allenamento di ieri"}
        </h2>
        <p className="mt-2 text-sm text-slate-500 line-clamp-1">
          {retentionText ?? "Riprendi il ritmo con una sessione breve"}
        </p>
        <button
          onClick={onPrimaryAction}
          className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-white text-[14px] font-semibold flex items-center justify-center gap-2"
        >
          {primaryActionLabel ?? "Studia ora"}
          <ArrowRight className="h-4 w-4" />
        </button>
        {onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="mt-2 h-11 w-full rounded-xl bg-white border border-slate-200/80 text-slate-700 text-[14px] font-medium"
          >
            Ricorda più tardi
          </button>
        )}
      </div>
    );
  }

  if (heroState === "SPACED_REPETITION") {
    return (
      <div className="rounded-2xl border border-indigo-200/60 bg-indigo-900 p-5 w-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-7 px-3 rounded-full bg-indigo-800 border border-indigo-700 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-200">
            <Brain className="h-3.5 w-3.5" />
            {badgeText ?? "Consolidamento memoria"}
          </span>
        </div>
        <h2 className="text-[20px] font-semibold text-white leading-tight line-clamp-2">
          {lessonTitle}
        </h2>
        <p className="mt-2 text-sm text-indigo-200 line-clamp-2">
          {retentionText ?? "3 concetti da ripassare per fissare la memoria a lungo termine"}
        </p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-indigo-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
        <button
          onClick={onPrimaryAction}
          className="mt-4 h-11 w-full rounded-xl bg-white text-indigo-900 text-[14px] font-semibold flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {primaryActionLabel ?? "Ripasso rapido"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 px-3 rounded-full bg-white/10 border border-white/10 flex items-center gap-1.5 text-[11px] font-semibold text-white">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{badgeText ?? subject}</span>
        </span>
        <span className="h-7 px-3 rounded-full bg-white border border-slate-200/80 text-slate-600 flex items-center text-[11px] font-semibold">
          <Clock className="h-3 w-3 mr-1" />
          Oggi
        </span>
      </div>
      <h2 className="text-[22px] font-semibold text-white leading-[1.15] line-clamp-2">
        {lessonTitle}
      </h2>
      <p className="mt-2 text-sm text-slate-400 line-clamp-1">
        {retentionText}
      </p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>
      <button
        onClick={onPrimaryAction}
        className="mt-4 h-11 w-full rounded-xl bg-white text-slate-900 text-[14px] font-semibold flex items-center justify-center gap-2"
      >
        <Play className="h-4 w-4 fill-current" />
        {primaryActionLabel ?? "Riprendi Lezione"}
      </button>
      {secondaryText && (
        <p className="mt-3 text-[12px] text-slate-400 text-center line-clamp-1">
          {secondaryText}
        </p>
      )}
    </div>
  );
}
