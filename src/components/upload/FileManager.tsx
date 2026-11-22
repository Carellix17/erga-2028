import { useState, useEffect, useRef } from "react";
import {
  Trash2, FileText, Loader2, FolderOpen, ChevronLeft, ChevronRight,
  Plus, FileType2, FileDown, Globe, Image as ImageIcon, PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useFileContextsQuery, useDeleteFileContext, useRemoveFileFromContext,
  type FileContext,
} from "@/hooks/useFileContexts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * 📦 P17 — IL RIPOSTIGLIO DEI MATERIALI, per percorso.
 * Vista 1: l'elenco dei tuoi percorsi (niente tasto "Studia": quello si fa dalla home).
 * Vista 2: toccando un percorso si apre il suo scaffale: i file veri nel deposito,
 * il tasto "+" per aggiungerne altri, e il cestino per toglierne uno.
 * Il cartellino arancione "materiale nuovo" ti ricorda che le lezioni non lo
 * contengono ancora: si rigenera il percorso dal menù ⋯ in Studio.
 */

interface FileManagerProps {
  onFileDeleted: () => void;
  onAttachFiles: (contextId: string, files: File[]) => void | Promise<void>;
  attaching: boolean;
  focusContextId?: string | null;
}

// Il nome di deposito è "utente/1700000000000_appunti_finali.pdf": in vetrina
// mostriamo solo la parte umana.
function displayName(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/^\d+_/, "");
}

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return FileText;
  if (n.endsWith(".docx") || n.endsWith(".doc")) return FileType2;
  if (n.endsWith(".txt") || n.endsWith(".md") || n.endsWith(".markdown")) return FileDown;
  if (/\.(jpe?g|png|webp|heic|heif)$/.test(n)) return ImageIcon;
  return FileText;
}

function pathsOf(ctx: FileContext): string[] {
  return (ctx.file_path ?? "").split(",").filter(Boolean);
}

export function FileManager({ onFileDeleted, onAttachFiles, attaching, focusContextId }: FileManagerProps) {
  const [openContextId, setOpenContextId] = useState<string | null>(null);
  const [deleteContextTarget, setDeleteContextTarget] = useState<FileContext | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<{ ctx: FileContext; path: string; isLast: boolean } | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: contexts = [], isLoading } = useFileContextsQuery();
  const deleteMutation = useDeleteFileContext();
  const removeFileMutation = useRemoveFileFromContext();

  // Il menù ⋯ di Studio manda dritti nello scaffale del percorso scelto
  useEffect(() => {
    if (focusContextId) setOpenContextId(focusContextId);
  }, [focusContextId]);

  const openContext = contexts.find((c) => c.id === openContextId) ?? null;
  const isBusy = deleteMutation.isPending || removeFileMutation.isPending || attaching;

  const handleDeleteContext = async () => {
    if (!deleteContextTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteContextTarget.id);
      toast({ title: "Percorso eliminato", description: `"${deleteContextTarget.file_name}" è stato rimosso insieme alle sue lezioni.` });
      if (openContextId === deleteContextTarget.id) setOpenContextId(null);
      onFileDeleted();
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nell'eliminazione", variant: "destructive" });
    } finally {
      setDeleteContextTarget(null);
    }
  };

  const handleRemoveFile = async () => {
    if (!deleteFileTarget) return;
    const { ctx, path, isLast } = deleteFileTarget;
    try {
      const res = await removeFileMutation.mutateAsync({ contextId: ctx.id, filePath: path });
      const wasDeleted = res?.contextDeleted ?? isLast;
      toast({
        title: "File rimosso",
        description: wasDeleted
          ? `Era l'ultimo file: "${ctx.file_name}" è stato eliminato con le sue lezioni.`
          : `Ricorda: rigenera il percorso dal menù ⋯ per aggiornare le lezioni.`,
      });
      if (wasDeleted) setOpenContextId(null);
      onFileDeleted();
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella rimozione", variant: "destructive" });
    } finally {
      setDeleteFileTarget(null);
    }
  };

  // ── Caricamento / vuoto ──
  if (isLoading && contexts.length === 0) return (
    <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      Caricamento dei materiali…
    </div>
  );

  if (contexts.length === 0) return (
    <div className="material-surface border border-border/40 bg-card p-6">
      <FolderOpen className="mb-3 size-6" aria-hidden="true" />
      <p className="text-base">Nessun file caricato</p>
      <p className="body-small mt-1">Aggiungi i tuoi materiali dalla scheda Caricamento.</p>
    </div>
  );

  // ── VISTA 2: lo scaffale del percorso ──
  if (openContext) {
    const paths = pathsOf(openContext);
    const isWeb = paths.length === 0;
    return (
      <div className="space-y-4">
        <Button type="button" onClick={() => setOpenContextId(null)} className="px-4">
          <ChevronLeft />Indietro
        </Button>
        <div>
          <h3 className="break-words text-xl">{openContext.file_name}</h3>
          <p className="body-small text-muted-foreground">
            {isWeb ? "Contenuto dal web" : `${paths.length} ${paths.length === 1 ? "file" : "file"}`}
            {openContext.lesson_count > 0 ? ` · ${openContext.lesson_count} lezioni` : ""}
          </p>
        </div>

        {openContext.new_material_pending && (
          <div className="material-surface border border-border/40 bg-card px-4 py-3 text-sm">
            Hai aggiunto nuovo materiale. Rigenera il percorso dal menu di Studio per includerlo nelle lezioni.
          </div>
        )}

        {isWeb ? (
          <div className="material-surface flex items-center gap-3 border border-border/40 bg-card p-4">
            <Globe className="size-5 shrink-0" aria-hidden="true" />
            <p className="body-small text-muted-foreground">
              Questo percorso è nato dal web o dall'AI: nessun file nel deposito.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paths.map((path) => {
              const name = displayName(path);
              const Icon = iconFor(name);
              return (
                <div
                  key={path}
                  className="material-surface flex items-center gap-3 border border-border/40 bg-card p-3"
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <p className="min-w-0 flex-1 break-words text-base">{name}</p>
                  <Button
                    type="button"
                    size="icon"
                    aria-label={`Togli ${name}`}
                    disabled={isBusy}
                    onClick={() => setDeleteFileTarget({ ctx: openContext, path, isLast: paths.length === 1 })}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* ➕ aggiungi materiale a QUESTO percorso */}
        <input
          ref={attachInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) await onAttachFiles(openContext.id, files);
          }}
        />
        <Button
          type="button"
          disabled={isBusy}
          onClick={() => attachInputRef.current?.click()}
          className="h-auto min-h-12 w-full whitespace-normal"
        >
          {attaching ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aggiunta in corso…</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" />Aggiungi file a questo percorso</>
          )}
        </Button>

        {/* conferma rimozione singolo file */}
        <AlertDialog open={!!deleteFileTarget} onOpenChange={() => setDeleteFileTarget(null)}>
          <AlertDialogContent className="material-sheet max-h-[85dvh] overflow-y-auto font-sans">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-normal">Togliere questo file?</AlertDialogTitle>
              <AlertDialogDescription className="break-words text-base">
                Stai per togliere "{deleteFileTarget ? displayName(deleteFileTarget.path) : ""}" da "{deleteFileTarget?.ctx.file_name}".
                {deleteFileTarget?.isLast ? (
                  <span className="mt-2 block font-medium text-foreground">
                    È l'ultimo file: il percorso sparirà insieme a tutte le sue lezioni. L'azione non può essere annullata.
                  </span>
                ) : (
                  <span className="block mt-2">
                    Le lezioni esistenti non cambiano. Il cartellino "materiale nuovo" ti ricorderà
                    di rigenerare il percorso per aggiornare il contenuto di partenza.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removeFileMutation.isPending}>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveFile} disabled={removeFileMutation.isPending}>
                {removeFileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Togli"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── VISTA 1: l'elenco dei percorsi ──
  return (
    <div className="space-y-3">
      <h3 className="label-medium">I tuoi percorsi ({contexts.length})</h3>
      <div className="space-y-2">
        {contexts.map((context) => {
          const nFiles = pathsOf(context).length;
          const isWeb = nFiles === 0;
          return (
            <div key={context.id} className="flex items-center gap-2">
              <Button type="button" onClick={() => setOpenContextId(context.id)} className="h-auto flex-1 justify-start gap-3 whitespace-normal px-4 py-3 text-left">
                {isWeb ? <Globe aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-base">{context.file_name}</span>
                  <span className="body-small block">
                    {isWeb ? "Web" : `${nFiles} file`}
                    {context.lesson_count > 0 ? ` · ${context.lesson_count} lezioni` : ""}
                  </span>
                  {context.new_material_pending && (
                    <span className="body-small block">Materiale nuovo da includere</span>
                  )}
                </span>
                <ChevronRight className="text-muted-foreground" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                aria-label={`Elimina ${context.file_name}`}
                onClick={() => setDeleteContextTarget(context)}
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteContextTarget} onOpenChange={() => setDeleteContextTarget(null)}>
        <AlertDialogContent className="material-sheet max-h-[85dvh] overflow-y-auto font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-normal">Eliminare questo percorso?</AlertDialogTitle>
            <AlertDialogDescription className="break-words text-base">
              Stai per eliminare "{deleteContextTarget?.file_name}" con tutti i suoi file.
              {deleteContextTarget?.lesson_count && deleteContextTarget.lesson_count > 0 && (
                <span className="mt-2 block font-medium text-foreground">Verranno eliminate anche le {deleteContextTarget.lesson_count} lezioni associate.</span>
              )}
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContext} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
