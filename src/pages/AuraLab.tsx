import { useTheme } from "@/contexts/ThemeContext";
import type { CSSProperties } from "react";

/* ───────────────────────────────────────────────────────────────────────────
   AURA LAB (solo sviluppo, rotta /aura-lab registrata SOLO con import.meta.env.DEV)

   Serve a rivedere l'aura animata attorno ai bordi dei blocchi (P27) in chiaro
   e in scuro SENZA login. Non fa parte dell'app: è un banco di prova per il
   Design System. Ogni blocco qui sotto è un caso reale del selettore in
   src/index.css (card, pannelli, callout, tinte materia, esclusioni, opt-out).
   ─────────────────────────────────────────────────────────────────────────── */

const TINTS = [
  { name: "Terracotta", value: "hsl(18 45% 45%)" },
  { name: "Ocra", value: "hsl(38 55% 36%)" },
  { name: "Mare", value: "hsl(185 38% 35%)" },
  { name: "Violetto", value: "hsl(250 28% 47%)" },
  { name: "Bosco", value: "hsl(145 28% 34%)" },
  { name: "Prugna", value: "hsl(320 28% 44%)" },
];

function tinted(color: string): CSSProperties {
  return { "--ambient-block-ink": color } as CSSProperties;
}

export default function AuraLab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Aura Lab</h1>
            <p className="body-small">
              Banco di prova dell&apos;aura dei blocchi (P27) · solo sviluppo, senza login
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-button border border-border bg-card px-4 py-2 text-sm font-semibold shadow-level-1 transition-colors hover:bg-accent"
          >
            {theme === "dark" ? "☀️ Chiaro" : "🌙 Scuro"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <p className="body-medium max-w-2xl text-muted-foreground">
          L&apos;aura è la sfumatura conica sfocata che <em>gira</em> (28s) e{" "}
          <em>respira</em> (11s) attorno ai bordi dei blocchi. Vale in entrambi i temi:
          la tinta del blocco viene mescolata al fondo della stanza (nero di notte,
          #F2F0EF di giorno). Sotto, un campionario dei casi principali.
        </p>

        {/* ── 1. Blocchi base ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="headline-medium">Blocchi base</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-card border border-border bg-card p-6 shadow-level-1">
              <p className="title-medium">Card neutra</p>
              <p className="body-small mt-1">
                <code>rounded-card</code> + <code>bg-card</code> + <code>shadow-level-1</code>:
                aura neutra della stanza.
              </p>
            </div>
            <div className="glass-panel rounded-card p-6">
              <p className="title-medium">Glass panel</p>
              <p className="body-small mt-1">
                <code>glass-panel</code>: superficie traslucida con la stessa aura.
              </p>
            </div>
            <div className="editorial-focus">
              <p className="title-medium">Editorial focus</p>
              <p className="body-small mt-1">Box d&apos;evidenziazione neutro.</p>
            </div>
            <div className="subject-callout rounded-card border p-6">
              <p className="title-medium">Subject callout</p>
              <p className="body-small mt-1">
                Tinta <code>--subject-accent</code> (accento materia).
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. Tinte materia (inline) ───────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="headline-medium">Tinte materia (inline <code>--ambient-block-ink</code>)</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {TINTS.map((t) => (
              <div
                key={t.name}
                style={tinted(t.value)}
                className="rounded-card border border-border p-6 shadow-level-2"
              >
                <p className="title-medium">{t.name}</p>
                <p className="body-small mt-1">
                  Aura mescolata al fondo: marroncino/nero di notte, marroncino/bianco di giorno.
                </p>
              </div>
            ))}
          </div>
          {/* overflow: hidden → l'aura vive nel box-shadow (filetto + respiro) */}
          <div
            style={tinted("hsl(28 50% 42%)")}
            className="overflow-hidden rounded-card border border-border p-6 shadow-level-2"
          >
            <p className="title-medium">Tinta con overflow nascosto</p>
            <p className="body-small mt-1">
              <code>overflow-hidden</code>: il pseudo-elemento viene tagliato, quindi qui l&apos;aura
              sopravvive solo nel canale <code>box-shadow</code> (filetto colorato animato).
            </p>
          </div>
        </section>

        {/* ── 3. Tinte semantiche ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="headline-medium">Tinte semantiche (famiglia <code>bg-*</code>)</h2>
          <div className="grid gap-6 sm:grid-cols-4">
            <div className="rounded-card border border-border bg-warning/10 p-5 shadow-level-1">
              <p className="title-small">Warning</p>
            </div>
            <div className="rounded-card border border-border bg-success/10 p-5 shadow-level-1">
              <p className="title-small">Success</p>
            </div>
            <div className="rounded-card border border-border bg-destructive/10 p-5 shadow-level-1">
              <p className="title-small">Error</p>
            </div>
            <div className="rounded-card border border-border bg-inverse p-5 text-inverse-on-surface shadow-level-1">
              <p className="title-small">Inverse</p>
            </div>
          </div>
        </section>

        {/* ── 4. Esclusioni (nessuna aura) ────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="headline-medium">Esclusioni (niente aura)</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-card border border-border bg-card p-6 shadow-level-1">
              <p className="title-small mb-3">Campi di testo</p>
              <div className="space-y-3">
                <input
                  className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm"
                  placeholder="input (nessuna aura)"
                />
                <textarea
                  className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm"
                  placeholder="textarea (nessuna aura)"
                  rows={2}
                />
                <select className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm">
                  <option>select (nessuna aura)</option>
                </select>
              </div>
            </div>
            <div className="rounded-card border border-border bg-card p-6 shadow-level-1">
              <p className="title-small mb-3">Testo e righe singole</p>
              <p className="body-medium">
                Un paragrafo <code>&lt;p&gt;</code> non riceve aura.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-9 w-32 rounded-button bg-muted" />
                <div className="h-10 w-24 rounded-button bg-muted" />
                <div className="h-12 w-16 rounded-button bg-muted" />
              </div>
              <p className="body-small mt-3">
                Righe singole (<code>h-9…h-12</code>) e skeleton (<code>.animate-pulse</code>) restano pulite.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. Opt-out ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="headline-medium">Opt-out</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="no-halo rounded-card border border-border bg-card p-6 shadow-level-1">
              <p className="title-small">.no-halo</p>
              <p className="body-small mt-1">Questo blocco rinuncia all&apos;aura.</p>
            </div>
            <div className="no-ambient rounded-card border border-border bg-card p-6 shadow-level-1">
              <p className="title-small">.no-ambient</p>
              <p className="body-small mt-1">Anche questo (e i suoi sottoalberi).</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
