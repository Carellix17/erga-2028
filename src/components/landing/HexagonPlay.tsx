import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type HexKey = "log" | "mem" | "foc" | "voc" | "ans" | "app";

export type HexScores = Record<HexKey, number>;

const VERTS: { key: HexKey; label: string; angle: number; copy: string }[] = [
  { key: "log", label: "Logica", angle: -90, copy: "Come strutturi e deduci. Se salti i passaggi, Erga te li impone. Se ti perdi nei lemmi, ti riporta al nesso." },
  { key: "mem", label: "Memoria", angle: -30, copy: "Ritenzione e richiamo. Il ritorno arriva quando stai per dimenticare — non dopo la verifica." },
  { key: "foc", label: "Focus", angle: 30, copy: "Durata utile, non quella che dichiari. Se alle 17 hai allenamento, Focus chiude netto e sposta il resto a dopo cena." },
  { key: "voc", label: "Lessico", angle: 90, copy: "Precisione delle parole. Quanto glossario, quali termini ti tiene addosso per l’orale." },
  { key: "ans", label: "Calma", angle: 150, copy: "Ansia da verifica e carico. Alza la leva: i blocchi diventano tappe da 10–15 minuti, con pause vere." },
  { key: "app", label: "Pratica", angle: 210, copy: "Quanto impari facendo. Vertice alto: più problemi. Basso: più schema, poi un esercizio solo." },
];

const CX = 200;
const CY = 200;
const MAX_R = 140;
const MIN_R = 28;

const DEFAULT_SCORES: HexScores = { log: 62, mem: 70, foc: 58, voc: 55, ans: 48, app: 64 };

function polar(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function scoreToR(score: number) {
  return MIN_R + (Math.max(0, Math.min(100, score)) / 100) * (MAX_R - MIN_R);
}

function projectScore(px: number, py: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = px - CX;
  const dy = py - CY;
  const proj = dx * Math.cos(rad) + dy * Math.sin(rad);
  const r = Math.max(MIN_R, Math.min(MAX_R, proj));
  return Math.round(((r - MIN_R) / (MAX_R - MIN_R)) * 100);
}

function labelPos(angle: number) {
  const p = polar(angle, MAX_R + 28);
  return p;
}

export type PlanItem = {
  time: string;
  title: string;
  desc: string;
  tag: string;
  tone: "red" | "gold" | "ink" | "rose";
  pause?: boolean;
};

const DAYS = [
  { id: "lun", label: "Lun", n: 17 },
  { id: "mar", label: "Mar", n: 18 },
  { id: "mer", label: "Mer", n: 19 },
  { id: "gio", label: "Gio", n: 20 },
  { id: "ven", label: "Ven", n: 21 },
  { id: "sab", label: "Sab", n: 22 },
  { id: "dom", label: "Dom", n: 23 },
] as const;

function buildDayPlan(day: string, ansia: number, tempo: number, scores: HexScores): PlanItem[] {
  const tense = ansia >= 50 || scores.ans < 40;
  const busy = tempo >= 50 || scores.foc < 40;
  const practice = scores.app >= 65;
  const memory = scores.mem < 45;

  if (day === "sab" || day === "dom") {
    return [
      { time: "10:30", title: "Richiamo breve", desc: "Sei minuti. Tre carte, poi chiudi.", tag: "Memoria", tone: "rose" },
    ];
  }
  if (day === "lun" || day === "gio") {
    return [
      { time: "16:20", title: day === "lun" ? "Mappa del capitolo" : "Schema dei casi", desc: "Un blocco corto per non arrivare indietro a mercoledì.", tag: "Logica", tone: "ink" },
    ];
  }
  if (day === "ven") {
    return [
      { time: "15:40", title: "Ripasso attivo", desc: memory ? "Flashcard distanziate, niente rilettura." : "Quiz lampo su ciò che è rimasto debole.", tag: "Memoria", tone: "gold" },
    ];
  }
  if (day === "mar") {
    return [
      { time: "16:00", title: practice ? "Problema guidato" : "Esempio svolto + uno tuo", desc: practice ? "Un esercizio da compito, passo-passo." : "Prima lo vedi fatto, poi lo rifai tu.", tag: "Pratica", tone: "gold" },
    ];
  }

  // mercoledì — verifica
  if (tense && busy) {
    return [
      { time: "15:00", title: "Micro 1 · concetto", desc: "10 min. Poi respiri.", tag: "Calma", tone: "rose" },
      { time: "15:12", title: "Pausa", desc: "3 min. Trasparente, non negoziabile.", tag: "Calma", tone: "ink", pause: true },
      { time: "15:16", title: "Micro 2 · quiz", desc: "10 min. Solo le formule della verifica.", tag: "Memoria", tone: "gold" },
      { time: "15:28", title: "Pausa", desc: "3 min.", tag: "Calma", tone: "ink", pause: true },
      { time: "15:32", title: "Micro 3 · problema", desc: "12 min. Ultimo blocco prima della borsa.", tag: "Pratica", tone: "rose" },
      { time: "15:48", title: "Stop · allenamento 17:00", desc: "Doccia, tragitto, campo. Zero debito nascosto.", tag: "Calma", tone: "red" },
      { time: "21:15", title: "Richiamo breve", desc: "5 min. Tre carte. Poi basta.", tag: "Memoria", tone: "gold" },
    ];
  }
  if (tense) {
    return [
      { time: "15:10", title: "Micro-tappa · definizione", desc: "10 minuti. Niente altro sullo schermo.", tag: "Calma", tone: "rose" },
      { time: "15:22", title: "Pausa trasparente", desc: "3 minuti. Finestra, acqua.", tag: "Calma", tone: "ink", pause: true },
      { time: "15:26", title: "Quiz lampo · 6 domande", desc: "12 minuti. Gli errori tornano subito.", tag: "Memoria", tone: "gold" },
      { time: "15:40", title: "Pausa", desc: "4 minuti. Il carico si abbassa, non tu.", tag: "Calma", tone: "ink", pause: true },
      { time: "15:45", title: "Problema spezzato", desc: "12 minuti. Un esercizio, due checkpoint.", tag: "Pratica", tone: "rose" },
      { time: "16:00", title: "Richiamo attivo", desc: "5 minuti. Solo i buchi di oggi.", tag: "Memoria", tone: "red" },
    ];
  }
  if (busy) {
    return [
      { time: "15:05", title: "Cinematica compressa", desc: "18 minuti. Il nucleo della verifica, nient’altro.", tag: "Focus", tone: "ink" },
      { time: "15:28", title: "Quiz essenziale", desc: "8 minuti. Formule che cadono sempre.", tag: "Memoria", tone: "rose" },
      { time: "15:40", title: "Un problema, poi zaino", desc: "15 minuti. Fine netta alle 15:55.", tag: "Pratica", tone: "gold" },
      { time: "15:55", title: "Stop · campo alle 17:00", desc: "Cambio, bus, allenamento. Erga ha già chiuso.", tag: "Calma", tone: "red" },
      { time: "21:10", title: "Richiamo dopo cena", desc: "6 minuti. Non è debito: è un fermo-immagine.", tag: "Memoria", tone: "rose" },
    ];
  }
  return [
    { time: "15:10", title: "Blocco unico · Cinematica", desc: "25 minuti. Concetto + un problema. Poi stop.", tag: "Focus", tone: "ink" },
    { time: "15:40", title: "Quiz formule", desc: "8 minuti. Solo ciò che cade in verifica.", tag: "Memoria", tone: "rose" },
    { time: "16:00", title: practice ? "Problema guidato" : "Esempio + variante", desc: practice ? "Un esercizio da compito in classe, passo-passo." : "Prima lo schema, poi un esercizio solo.", tag: "Pratica", tone: "gold" },
    { time: "16:35", title: "Chiusura", desc: "3 minuti. Cosa resta per domani. Fine.", tag: "Calma", tone: "red" },
  ];
}

function statusCopy(ansia: number, tempo: number, scores: HexScores) {
  const tense = ansia >= 50 || scores.ans < 40;
  const busy = tempo >= 50 || scores.foc < 40;
  if (tense && busy) return { t: "Piano spezzato + 17:00.", d: "Micro-tappe fino alle 15:48. Allenamento salvo. Richiamo dopo cena." };
  if (tense) return { t: "Piano anti-ansia.", d: "Blocchi da 10–15 minuti, pause vere. Nessun muro da un’ora." };
  if (busy) return { t: "Piano compresso.", d: "Chiudi alle 15:55. In campo alle 17. Sei minuti dopo cena." };
  return { t: "Piano calmo.", d: "Un blocco solo. Il pomeriggio resta largo." };
}

function lessonFor(scores: HexScores, active: HexKey) {
  const short = scores.foc < 45 || scores.ans < 40;
  const simple = scores.voc < 45;
  const exampleFirst = scores.app < 45;
  const recap = scores.mem < 45;
  const deep = scores.log > 75 && scores.foc > 60;

  const title = simple ? "🎯 Perché ti serve" : "🎯 Perché ti riguarda";
  let body = "";
  let box = "";

  if (exampleFirst) {
    body = short
      ? "Un’auto frena. In 4 secondi si ferma. Quello è moto rettilineo: una linea, un tempo, una velocità."
      : "Pensa a un’auto che frena al semaforo. In pochi secondi la velocità scende a zero. È lo stesso schema della verifica: uno spostamento, un tempo, una formula.";
    box = "💡 Prima l’esempio, poi la regola. Così la applichi subito.";
  } else if (simple) {
    body = short
      ? "Moto rettilineo = muoversi su una linea. Velocità = spazio ÷ tempo."
      : "Moto rettilineo vuol dire muoversi su una linea dritta. La parola velocità qui significa solo: quanto spazio fai in un certo tempo.";
    box = "📌 Velocità = spazio ÷ tempo. Tienila così.";
  } else if (deep) {
    body = "Il moto rettilineo uniforme è il caso in cui lo spostamento è proporzionale al tempo. Se la velocità cambia, entra l’accelerazione: il nesso causa-effetto che la verifica vuole sentire.";
    box = "📊 v costante → s = vt. v che cambia → a = Δv/Δt.";
  } else {
    body = short
      ? "Il moto rettilineo è ovunque: bus, palla, freno. Capirlo chiude la verifica in meno tempo."
      : "Il moto rettilineo è ovunque: bus, palla, freno in città. Capirlo significa leggere i numeri prima che la verifica te li chieda.";
    box = recap
      ? "🧭 Ripeti: linea dritta · spazio · tempo. Poi stop."
      : "⚡ In 3 righe capisci perché tutto il resto ha senso.";
  }

  const hint = VERTS.find((v) => v.key === active)?.label ?? "Calma";
  return { title, body, box, hint };
}

export function HexagonPlay() {
  const [scores, setScores] = useState<HexScores>(DEFAULT_SCORES);
  const [active, setActive] = useState<HexKey>("ans");
  const [ansia, setAnsia] = useState(18);
  const [tempo, setTempo] = useState(12);
  const [day, setDay] = useState<(typeof DAYS)[number]["id"]>("mer");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragKey = useRef<HexKey | null>(null);

  const points = VERTS.map((v) => {
    const p = polar(v.angle, scoreToR(scores[v.key]));
    return `${p.x},${p.y}`;
  }).join(" ");

  const lesson = useMemo(() => lessonFor(scores, active), [scores, active]);
  const items = useMemo(() => buildDayPlan(day, ansia, tempo, scores), [day, ansia, tempo, scores]);
  const status = statusCopy(ansia, tempo, scores);

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: CX, y: CY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: CX, y: CY };
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  };

  const onPointerDown = (key: HexKey, e: React.PointerEvent) => {
    e.preventDefault();
    dragKey.current = key;
    setActive(key);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragKey.current) return;
    const key = dragKey.current;
    const vert = VERTS.find((v) => v.key === key);
    if (!vert) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const next = projectScore(x, y, vert.angle);
    setScores((s) => ({ ...s, [key]: next }));
  };

  const onPointerUp = () => {
    dragKey.current = null;
  };

  const ansiaLabel = ansia < 34 ? "Basso" : ansia < 67 ? "Medio" : "Alto";
  const tempoLabel = tempo < 34 ? "Pomeriggio libero" : tempo < 67 ? "Impegni in vista" : "Campo alle 17:00";

  return (
    <>
      <div className="lp-hex-layout">
        <div className="lp-reveal">
          <p className="lp-eyebrow">Il cuore</p>
          <h2 className="lp-h2">L’Esagono cognitivo.</h2>
          <p className="lp-lead" style={{ margin: "1rem 0 1.6rem" }}>
            Non sei un voto. Sei sei forze. Trascina un vertice: la minilezione a lato e il piano sotto si riscrivono.
          </p>
          <div className="lp-panel">
            <p className="lp-kicker">Minilezione · {lesson.hint} {scores[active]}/100</p>
            <h3 style={{ fontSize: "1.35rem", letterSpacing: "-0.03em", marginBottom: "0.55rem" }}>{lesson.title}</h3>
            <p style={{ color: "#C7C7CC", lineHeight: 1.6 }}>{lesson.body}</p>
            <div
              style={{
                marginTop: "0.85rem",
                borderRadius: 14,
                padding: "0.65rem 0.8rem",
                background: "rgba(196,135,139,0.14)",
                border: "1px solid rgba(196,135,139,0.22)",
                color: "#E8C4C6",
                fontSize: "0.88rem",
              }}
            >
              {lesson.box}
            </div>
            <div className="lp-verts" role="tablist" aria-label="Vertici dell'esagono">
              {VERTS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  role="tab"
                  aria-selected={active === v.key}
                  className={active === v.key ? "is-on" : undefined}
                  onClick={() => setActive(v.key)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-reveal">
          <svg
            ref={svgRef}
            viewBox="0 0 400 400"
            role="img"
            aria-label="Esagono cognitivo: trascina i vertici"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ width: "100%", height: "auto", maxWidth: 520, touchAction: "none", display: "block", marginInline: "auto" }}
          >
            <g fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1">
              <polygon points="200,50 330,125 330,275 200,350 70,275 70,125" />
              <polygon points="200,90 300,148 300,252 200,310 100,252 100,148" />
              <polygon points="200,130 270,170 270,230 200,270 130,230 130,170" />
            </g>
            <g stroke="rgba(255,255,255,.08)" strokeWidth="1">
              {VERTS.map((v) => {
                const end = polar(v.angle, MAX_R);
                return <line key={v.key} x1={CX} y1={CY} x2={end.x} y2={end.y} />;
              })}
            </g>
            <polygon points={points} fill="rgba(255,255,255,.06)" stroke="#F2F2F7" strokeWidth="1.6" />
            {VERTS.map((v) => {
              const p = polar(v.angle, scoreToR(scores[v.key]));
              const lab = labelPos(v.angle);
              const on = active === v.key;
              return (
                <g key={v.key}>
                  <text x={lab.x} y={lab.y} fontSize="12" fill="#A1A1A6" textAnchor="middle" dominantBaseline="middle">
                    {v.label}
                  </text>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={on ? 9 : 7}
                    fill={on ? "#C4A574" : "#F2F2F7"}
                    style={{ cursor: "grab" }}
                    tabIndex={0}
                    role="slider"
                    aria-label={`${v.label}: ${scores[v.key]}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={scores[v.key]}
                    onPointerDown={(e) => onPointerDown(v.key, e)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                        e.preventDefault();
                        setActive(v.key);
                        setScores((s) => ({ ...s, [v.key]: Math.min(100, s[v.key] + 5) }));
                      }
                      if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        setActive(v.key);
                        setScores((s) => ({ ...s, [v.key]: Math.max(0, s[v.key] - 5) }));
                      }
                    }}
                  />
                </g>
              );
            })}
          </svg>
          <p className="lp-small" style={{ textAlign: "center", marginTop: "0.4rem", color: "#86868B" }}>
            Trascina un punto verso il bordo per alzarlo. Tastiera: frecce.
          </p>
        </div>
      </div>

      <div className="lp-bridge lp-reveal">
        <div className="lp-ctrls">
          <div className="lp-ctrl">
            <div className="lp-ctrl-top">
              <label htmlFor="sl-ansia">Ansia / carico di lavoro</label>
              <span>{ansiaLabel}</span>
            </div>
            <input id="sl-ansia" type="range" min={0} max={100} value={ansia} onChange={(e) => setAnsia(Number(e.target.value))} aria-valuetext={ansiaLabel} />
            <div className="lp-ctrl-ends"><span>Basso</span><span>Alto</span></div>
          </div>
          <div className="lp-ctrl">
            <div className="lp-ctrl-top">
              <label htmlFor="sl-tempo">Tempo libero / impegni</label>
              <span>{tempoLabel}</span>
            </div>
            <input id="sl-tempo" type="range" min={0} max={100} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} aria-valuetext={tempoLabel} />
            <div className="lp-ctrl-ends"><span>Libero</span><span>Campo alle 17:00</span></div>
          </div>
        </div>
        <div className="lp-bridge-actions">
          <button
            type="button"
            className="lp-btn lp-btn-red"
            onClick={() => {
              setAnsia(82);
              setTempo(100);
              setActive("ans");
              setDay("mer");
            }}
          >
            Simula imprevisto: allenamento alle 17:00
          </button>
          <p className="lp-plan-status" aria-live="polite">
            <strong>{status.t} </strong>
            {status.d}
          </p>
        </div>
        <StudyTimeline dark day={day} onDay={setDay} items={items} />
      </div>
    </>
  );
}

export function StudyTimeline({
  dark,
  day,
  onDay,
  items,
}: {
  dark?: boolean;
  day: string;
  onDay: (id: (typeof DAYS)[number]["id"]) => void;
  items: PlanItem[];
}) {
  return (
    <div className={cn("lp-timeline", dark && "dark")}>
      <div className="lp-week" role="tablist" aria-label="Giorni della settimana">
        {DAYS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={day === d.id}
            className={day === d.id ? "is-on" : undefined}
            onClick={() => onDay(d.id)}
          >
            <small>{d.label}</small>
            <strong>{d.n}</strong>
          </button>
        ))}
      </div>
      {items.map((it) => (
        <div key={`${it.time}-${it.title}`} className={cn("lp-tl-row", it.pause && "is-pause")}>
          <time>{it.time}</time>
          <div>
            <strong>{it.title}</strong>
            <div className="desc">{it.desc}</div>
            <div className={`lp-pill-tag ${it.tone}`}>{it.tag}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { DAYS, buildDayPlan };
