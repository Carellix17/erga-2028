import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function PdfPagePicker({ file, pages, onChange, disabled }: {
  file: File; pages?: number[]; onChange: (pages: number[] | undefined) => void; disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!expanded || count !== null) return;
    let alive = true;
    void (async () => {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      if (alive) setCount(pdf.getPageCount());
    })().catch(() => { if (alive) setError("Non riesco a leggere le pagine. Puoi caricare il PDF completo oppure riprovare con un PDF non protetto."); });
    return () => { alive = false; };
  }, [file, expanded, count]);
  return <div className="border-t border-border py-2">
    <Button type="button" variant="ghost" disabled={disabled} aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="w-full justify-start whitespace-normal text-left text-sm">
      {expanded ? "Chiudi selezione pagine" : "Scegli le pagine da studiare"}
    </Button>
    {expanded && <>
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : count === null ? <p role="status" className="py-3 text-sm text-muted-foreground">Lettura delle pagine…</p> : <>
        <p className="py-2 text-sm text-muted-foreground">Verranno caricate solo le pagine selezionate. Il PDF originale resta sul dispositivo.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange(undefined)}>Tutte</Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([])}>Nessuna</Button>
        </div>
        <fieldset disabled={disabled} className="mt-2 grid max-h-48 grid-cols-3 overflow-y-auto border border-border">
          <legend className="sr-only">Pagine di {file.name}</legend>
          {Array.from({ length: count }, (_, index) => index + 1).map(page => <label key={page} className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm">
            <input type="checkbox" checked={pages?.includes(page) ?? true} onChange={event => {
              const selected = pages ?? Array.from({ length: count }, (_, index) => index + 1);
              onChange(event.target.checked ? [...selected, page] : selected.filter(value => value !== page));
            }} />
            <span className="font-mono tabular-nums">{page}</span>
          </label>)}
        </fieldset>
        {pages?.length === 0 && <p role="alert" className="mt-2 text-sm text-destructive">Seleziona almeno una pagina.</p>}
      </>}
    </>}
  </div>;
}
