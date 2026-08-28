import { Settings, User } from "lucide-react";

export interface CompactHeaderProps {
  avatarUrl?: string | null;
  userName?: string;
  streakDays?: number;
  onSettingsClick?: () => void;
  onAvatarClick?: () => void;
  settingsAriaLabel?: string;
  avatarAriaLabel?: string;
}

export function CompactHeader({
  avatarUrl,
  userName = "Studente",
  streakDays = 0,
  onSettingsClick,
  onAvatarClick,
  settingsAriaLabel = "Impostazioni",
  avatarAriaLabel = "Profilo",
}: CompactHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onAvatarClick}
          aria-label={avatarAriaLabel}
          className="h-11 w-11 rounded-full bg-white border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-5 w-5 text-slate-600" />
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="text-sm text-slate-500 leading-none">Ciao,</p>
          <h1 className="text-[17px] font-semibold text-slate-900 leading-tight truncate max-w-[160px] line-clamp-1">
            {userName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {streakDays > 0 && (
          <div className="h-11 min-w-[44px] px-3 rounded-full bg-white border border-slate-200/80 flex items-center justify-center gap-1.5">
            <span aria-hidden="true" className="text-[14px]">🔥</span>
            <span className="text-[13px] font-semibold text-slate-900 tabular-nums">
              {streakDays} giorni
            </span>
          </div>
        )}
        <button
          onClick={onSettingsClick}
          aria-label={settingsAriaLabel}
          className="h-11 w-11 rounded-full bg-white border border-slate-200/80 flex items-center justify-center shrink-0"
        >
          <Settings className="h-5 w-5 text-slate-700" />
        </button>
      </div>
    </header>
  );
}
