import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetShell } from "./WidgetShell";
import { WIDGET_MAP, widgetTitle, type WidgetSpec } from "@/lib/widgets";
import { currentLanguage } from "@/i18n";

/**
 * 🎛️ Esecutore di codice (metodo PRIMM per l'informatica): lo studente
 * LEGGE un programma, PREDICE cosa stampa, poi lo ESEGUE e lo MODIFICA.
 *
 * Sicurezza: il codice gira in un Web Worker ricavato da un blob — un
 * thread separato SENZA accesso a DOM, localStorage o ai dati dell'app —
 * e viene terminato automaticamente dopo 2,5 secondi (loop infiniti
 * neutralizzati). Le righe di console.log sono limitate a 50.
 */

const DEFAULT_CODE = 'console.log("Ciao da Erga!");\nconsole.log(2 + 2);';

function runCode(code: string): Promise<string[]> {
  return new Promise((resolve) => {
    const workerSrc = `
      self.onmessage = (e) => {
        const logs = [];
        const fmt = (a) => a.map((x) => {
          try { return typeof x === "object" ? JSON.stringify(x) : String(x); }
          catch { return String(x); }
        }).join(" ");
        const cons = {
          log: (...a) => logs.push(fmt(a)),
          error: (...a) => logs.push("✖ " + fmt(a)),
          warn: (...a) => logs.push("⚠ " + fmt(a)),
        };
        try { new Function("console", e.data)(cons); }
        catch (err) { logs.push("✖ " + (err && err.message ? err.message : String(err))); }
        self.postMessage(logs.slice(0, 50));
      };`;

    if (typeof Worker === "undefined") {
      // Ambiente senza Worker (es. test): esecuzione protetta sincrona.
      const logs: string[] = [];
      const fmt = (a: unknown[]) => a.map((x) => String(x)).join(" ");
      const cons = {
        log: (...a: unknown[]) => logs.push(fmt(a)),
        error: (...a: unknown[]) => logs.push("✖ " + fmt(a)),
        warn: (...a: unknown[]) => logs.push("⚠ " + fmt(a)),
      };
      try {
        new Function("console", code)(cons);
      } catch (err) {
        logs.push("✖ " + (err instanceof Error ? err.message : String(err)));
      }
      resolve(logs.slice(0, 50));
      return;
    }

    const blob = new Blob([workerSrc], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    const timer = setTimeout(() => {
      worker.terminate();
      resolve(["⏱ Esecuzione interrotta: troppo lunga"]);
    }, 2500);
    worker.onmessage = (ev: MessageEvent<string[]>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(ev.data || []);
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      resolve(["✖ Errore di esecuzione"]);
    };
    worker.postMessage(code);
  });
}

export function CodeRunnerWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  void WIDGET_MAP.codice;
  const [code, setCode] = useState(() => (spec.code && spec.code.trim() ? spec.code : DEFAULT_CODE));
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const execute = async () => {
    setRunning(true);
    try {
      setOutput(await runCode(code));
    } finally {
      setRunning(false);
    }
  };

  return (
    <WidgetShell title={widgetTitle("codice", lang)} caption={spec.caption}>
      <label className="sr-only" htmlFor="widget-code">Codice da eseguire</label>
      <textarea
        id="widget-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={7}
        className="w-full rounded-xl border-2 border-outline-variant bg-surface-container-lowest p-3 font-mono text-sm text-foreground leading-relaxed focus:outline-none focus:border-primary"
      />
      <div className="pt-2 pb-1">
        <Button onClick={execute} disabled={running} className="h-10 rounded-xl px-4">
          <Play className="w-4 h-4 mr-2" />
          {running ? "…" : (lang === "en" ? "Run" : "Esegui")}
        </Button>
      </div>
      {output.length > 0 && (
        <div className="mb-2 rounded-xl bg-surface-container p-3 font-mono text-xs leading-relaxed text-foreground" aria-live="polite">
          {output.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
