import { Brain, CalendarDays, Check, Clock3, Home as HomeIcon, BookOpen, Play, Sparkles, Target, Timer, User, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhoneTab = "home" | "piano" | "studio";

export function PhoneShell({
  children,
  tab,
  tilt,
  label,
}: {
  children: React.ReactNode;
  tab: PhoneTab | null;
  tilt?: boolean;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "lp-phone-shell relative z-[2] w-[min(100%,300px)] rounded-[36px] bg-[#0A0A0A] p-[9px]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.32)]",
        tilt && "-rotate-[5.5deg] translate-y-2",
      )}
    >
      <div className="relative h-[580px] overflow-hidden rounded-[28px] bg-off-white text-[#111]">
        <div className="absolute left-1/2 top-2 z-30 h-[18px] w-[88px] -translate-x-1/2 rounded-[20px] bg-black" />
        {children}
        {tab && <PhoneTabBar active={tab} />}
      </div>
    </div>
  );
}

function PhoneHeader({ initials = "AL" }: { initials?: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex h-8 items-center gap-1.5 rounded-full bg-neutral-900 pl-1.5 pr-3 text-white">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-white/15">
          <Brain className="h-3 w-3" strokeWidth={2.2} />
        </span>
        <span className="text-[12px] font-bold tracking-tight">Erga</span>
      </div>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
        {initials}
      </span>
    </div>
  );
}

function PhoneTabBar({ active }: { active: PhoneTab }) {
  const items: { id: PhoneTab; label: string; Icon: typeof HomeIcon }[] = [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "piano", label: "Piano", Icon: CalendarDays },
    { id: "studio", label: "Studio", Icon: BookOpen },
  ];
  return (
    <nav className="absolute bottom-2 left-2 right-2 z-20 flex items-center gap-1.5" aria-hidden>
      <div className="grid h-[52px] flex-1 grid-cols-3 items-center rounded-full border border-black/10 bg-white/90 px-1 shadow-sm">
        {items.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <div key={id} className="relative flex flex-col items-center gap-0.5">
              {on && <span className="absolute inset-x-1 inset-y-1 rounded-full bg-neutral-200/80" />}
              <Icon className={cn("relative z-10 h-[16px] w-[16px]", on ? "text-neutral-900" : "text-neutral-600")} strokeWidth={on ? 2.2 : 1.8} />
              <span className={cn("relative z-10 text-[8px] font-semibold", on ? "text-neutral-900" : "text-neutral-600")}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="relative grid h-[52px] w-[52px] place-items-center rounded-full border border-black/10 bg-white/90 shadow-sm">
        <User className="h-4 w-4 text-neutral-700" />
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-neutral-500" />
      </div>
    </nav>
  );
}

export function PhoneHome({
  subject = "Storia",
  title = "La rivoluzione industriale e la società contemporanea",
  startTime = "15:30",
  duration = 5,
  progress = 68,
  tasks = ["Rileggi gli appunti", "Completa 8 esercizi", "Ripassa il vocabolario"],
}: {
  subject?: string;
  title?: string;
  startTime?: string;
  duration?: number;
  progress?: number;
  tasks?: readonly string[];
}) {
  return (
    <div className="lp-phone-view flex min-h-[580px] flex-col gap-2.5 px-2.5 pb-20 pt-8">
      <header className="lp-phone-home-block px-0.5 pt-1">
        <p className="text-[16px] font-extrabold leading-tight tracking-tight text-neutral-900">Buon pomeriggio</p>
        <p className="text-[18px] font-extrabold leading-tight tracking-tight text-neutral-600">Alessandro</p>
        <p className="mt-1 text-[9px] font-medium text-neutral-600">Riprendi da dove avevi lasciato.</p>
      </header>

      <div className="lp-phone-home-block relative overflow-hidden rounded-[18px] bg-[#171417] p-3 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_15%,rgba(196,135,139,0.42),transparent_42%)]" aria-hidden />
        <div className="relative">
          <div className="mb-1.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[8px] font-bold">
              <Sparkles className="h-2.5 w-2.5" aria-hidden /> Prossima lezione
            </span>
            <span className="rounded-full border border-white/30 bg-black/25 px-2 py-0.5 text-[8px] text-white">{subject}</span>
          </div>
          <p className="line-clamp-2 text-[15px] font-extrabold leading-[1.15] tracking-tight">{title}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-neutral-200">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden />Oggi, {startTime}</span>
            <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" aria-hidden />{duration} min</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[8px] font-semibold text-neutral-200">
            <span>Preparazione lezione</span><span className="text-white">{progress}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="lp-phone-progress h-full origin-left rounded-full bg-[#E8C4C6]" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <div className="mt-2.5 flex h-8 items-center justify-center gap-1 rounded-xl bg-white text-[11px] font-bold text-black">
            <Play className="h-3 w-3 fill-current" aria-hidden />
            Inizia lezione · {duration} min
          </div>
        </div>
      </div>

      <div className="lp-phone-home-block">
        <div className="mb-1.5 flex items-end justify-between px-0.5">
          <div><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-neutral-600">Oggi</p><p className="text-[13px] font-extrabold">Piano del giorno</p></div>
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[9px] font-bold">1/{tasks.length}</span>
        </div>
        <div className="rounded-[16px] border border-black/[0.07] bg-white p-2 shadow-sm">
          {tasks.map((task, index) => (
            <div key={task} className="flex min-w-0 items-center gap-2 border-t border-black/[0.06] px-1 py-1.5 first:border-0">
              <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border", index === 0 ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300")}>
                {index === 0 && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />}
              </span>
              <span className={cn("min-w-0 truncate text-[10px] font-semibold", index === 0 && "text-neutral-600 line-through")}>{task}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-phone-home-block rounded-[15px] border border-black/[0.06] bg-white p-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div><p className="text-[8px] font-bold uppercase tracking-wider text-neutral-600">Ritmo di oggi</p><p className="text-[11px] font-extrabold">Obiettivo giornaliero</p></div>
          <Target className="h-4 w-4 text-neutral-700" aria-hidden />
        </div>
        <div className="mt-2 flex items-baseline gap-1"><b className="text-[18px] leading-none">42</b><span className="text-[9px] text-neutral-600">/ 60 min</span></div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-200"><div className="lp-phone-progress h-full origin-left rounded-full bg-neutral-700" style={{ transform: "scaleX(.7)" }} /></div>
      </div>
    </div>
  );
}

export function PhoneStudio() {
  const nodes = [
    { n: "✓", title: "Velocità e spostamento", side: "left", state: "done" },
    { n: "✓", title: "Moto uniforme", side: "right", state: "done" },
    { n: "3", title: "Accelerazione", side: "left", state: "current" },
    { n: "4", title: "Problema guidato", side: "right", state: "locked" },
  ] as const;

  return (
    <div className="lp-phone-view flex min-h-[580px] flex-col gap-2 px-2.5 pb-20 pt-8">
      <PhoneHeader />
      <div className="lp-phone-content-block px-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-600">Modulo 1</p>
        <p className="text-[13px] font-extrabold leading-snug">Le basi della cinematica</p>
        <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
          <span className="text-neutral-600">2 di 4 lezioni</span>
          <span className="font-bold">50%</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200">
          <div className="lp-phone-progress h-full origin-left rounded-full bg-[#C4878B]" style={{ transform: "scaleX(.5)" }} />
        </div>
      </div>

      <div className="lp-phone-content-block relative mt-1 px-1">
        <div className="absolute bottom-7 left-1/2 top-7 w-px -translate-x-1/2 bg-neutral-200" aria-hidden />
        {nodes.map((node) => {
          const label = (
            <div className={cn("max-w-[104px] rounded-xl border bg-white px-2 py-1.5 text-[10px] font-semibold leading-snug shadow-sm", node.state === "current" ? "border-[#C4878B]/60" : "border-black/10")}>
              {node.state === "current" && <span className="mb-1 block text-[7px] font-extrabold uppercase tracking-wider text-[#92545A]">Riprendi</span>}
              {node.title}
            </div>
          );

          return (
            <div key={node.title} className="relative grid min-h-[74px] grid-cols-[1fr_48px_1fr] items-center gap-1">
              <div className="flex justify-end">{node.side === "left" ? label : null}</div>
              <div
                className={cn(
                  "relative z-10 grid h-11 w-11 place-items-center justify-self-center rounded-[14px] text-[13px] font-extrabold",
                  node.state === "done" && "bg-[#C4878B] text-[#1A1012] shadow-sm",
                  node.state === "current" && "border-[3px] border-[#C4878B] bg-white",
                  node.state === "locked" && "border-2 border-neutral-200 bg-neutral-100 text-neutral-600",
                )}
              >
                {node.n}
              </div>
              <div className="flex justify-start">{node.side === "right" ? label : null}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PhonePiano() {
  const mute = new Set([27, 28, 29, 30, 31]);
  const days = [27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  return (
    <div className="lp-phone-view flex min-h-[580px] flex-col gap-2 px-2.5 pb-20 pt-8">
      <PhoneHeader />
      <div className="grid grid-cols-[1.4fr_.8fr] gap-1">
        <div className="grid h-9 place-items-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
          Genera piano
        </div>
        <div className="flex h-9 items-center justify-center gap-1 rounded-full border border-neutral-200 bg-white text-[11px] font-semibold">
          <Timer className="h-3 w-3" /> Focus
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-0.5">
        <span className="grid h-7 place-items-center rounded-full bg-white text-[11px] font-semibold shadow-sm">Mese</span>
        <span className="grid h-7 place-items-center text-[11px] text-neutral-600">Settimana</span>
      </div>
      <p className="text-center text-[12px] font-semibold">agosto 2026</p>
      <div className="grid grid-cols-7 text-center text-[8px] uppercase tracking-wider text-neutral-600">
        {["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className={cn(
              "relative mx-auto grid h-7 w-7 place-items-center rounded-full text-[11px]",
              mute.has(d) && i < 5 && "text-neutral-600",
              d === 19 && i > 10 && "bg-neutral-900 font-bold text-white",
            )}
          >
            {d}
            {(d === 19 || d === 20 || d === 21) && i > 10 && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#C4878B]" />
            )}
          </span>
        ))}
      </div>
      <div className="mt-1 rounded-[14px] border border-black/[0.06] bg-white p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Mercoledì 19</p>
        <p className="mt-0.5 text-[12px] font-bold">Cinematica compressa</p>
        <p className="text-[10px] text-neutral-600">15:10 · Fisica · 18 min</p>
      </div>
    </div>
  );
}

export function PhoneLesson() {
  return (
    <div className="lp-phone-view flex min-h-[580px] flex-col px-2.5 pb-4 pt-8">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="grid h-6 w-6 place-items-center rounded-full text-neutral-600">
          <X className="h-3.5 w-3.5" />
        </span>
        <div className="flex h-1.5 flex-1 gap-0.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={cn("h-full flex-1 rounded-full", i < 3 ? "bg-neutral-900" : "bg-neutral-200")} />
          ))}
        </div>
        <span className="text-[10px] font-semibold text-neutral-600">3/8</span>
      </div>
      <p className="text-center text-[9px] text-neutral-600">
        Lezione 3 di 12 · <span className="font-semibold text-neutral-800">Cinematica</span>
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-neutral-700">
          <Target className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-[13px] font-extrabold leading-tight">Perché ti riguarda</p>
      </div>
      <div className="mt-3 rounded-[16px] border border-neutral-200/70 bg-white p-3.5 shadow-sm">
        <p className="text-[12px] leading-relaxed text-neutral-700">
          Il <strong className="text-neutral-900">moto rettilineo</strong> è ovunque: bus, palla, freno in città.
          Capirlo significa leggere i numeri prima che la verifica te li chieda.
        </p>
        <div className="mt-2.5 flex items-start gap-1.5 rounded-2xl border border-neutral-200/80 bg-off-white px-3 py-2 text-[11px] leading-snug text-neutral-800">
          <Zap className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>In 3 righe capisci <strong>perché</strong> tutto il resto ha senso.</span>
        </div>
      </div>
      <div className="mt-auto flex h-10 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-bold text-white">
        Continua →
      </div>
    </div>
  );
}
