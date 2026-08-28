import { Check, Clock, BookOpen, ClipboardCheck, CalendarDays } from "lucide-react";

export interface TimelineTask {
  id: string;
  title: string;
  time?: string | null;
  subject?: string;
  isCompleted?: boolean;
  kind?: "study" | "test" | "assignment" | "evaluation";
}

export interface DailyTimelineProps {
  tasks?: TimelineTask[];
  onTaskClick?: (taskId: string) => void;
  onSeeAll?: () => void;
  title?: string;
  eyebrow?: string;
}

export function DailyTimeline({
  tasks = [],
  onTaskClick,
  onSeeAll,
  title = "Oggi",
  eyebrow = "Piano",
}: DailyTimelineProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{eyebrow}</p>
        <h3 className="mt-1 text-[16px] font-semibold text-slate-900">Nessuna attività oggi</h3>
        <p className="mt-1 text-sm text-slate-500">Goditi una pausa o importa nuovo materiale</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{eyebrow}</p>
          <h3 className="mt-1 text-[16px] font-semibold text-slate-900">{title}</h3>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 text-[13px] font-medium"
          >
            Vedi tutto
          </button>
        )}
      </div>

      <div className="px-2 pb-2">
        {tasks.map((task, index) => (
          <button
            key={task.id}
            onClick={() => onTaskClick?.(task.id)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left ${index !== tasks.length - 1 ? "border-b border-slate-100" : ""}`}
          >
            <span className={`h-11 w-11 rounded-full border flex items-center justify-center shrink-0 ${task.isCompleted ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200/80 text-slate-600"}`}>
              {task.isCompleted ? (
                <Check className="h-5 w-5" />
              ) : task.kind === "study" ? (
                <BookOpen className="h-4 w-4" />
              ) : task.kind === "test" || task.kind === "evaluation" ? (
                <ClipboardCheck className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[14px] font-medium leading-snug truncate ${task.isCompleted ? "text-slate-400 line-through" : "text-slate-900"}`}>
                {task.title}
              </span>
              <span className="mt-1 flex items-center gap-2 text-[12px] text-slate-500">
                {task.subject && <span className="truncate max-w-[100px]">{task.subject}</span>}
                {task.time && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.time}
                    </span>
                  </>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
