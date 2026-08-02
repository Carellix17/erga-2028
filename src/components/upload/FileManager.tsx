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
import { cn } from "@/lib/utils";

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
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (contexts.length === 0) return (
    <div className="text-center p-8 text-muted-foreground animate-fade-up">
      <div className="w-16 h-16 rounded-xl bg-surface-container-highest flex items-center justify-center mx-auto mb-3 animate-bounce-in">
        <FolderOpen className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="body-large">Nessun file caricato</p>
    </div>
  );

  // ── VISTA 2: lo scaffale del percorso ──
  if (openContext) {
    const paths = pathsOf(openContext);
    const isWeb = paths.length === 0;
    return (
      <div className="space-y-3 animate-fade-up">
        <div className="flex items-center gap-1 px-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpenContextId(null)} className="h-8 px-2 -ml-1">
            <ChevronLeft className="w-4 h-4 mr-0.5" />Indietro
          </Button>
        </div>
        <div className="px-1">
          <h3 className="title-medium truncate">{openContext.file_name}</h3>
          <p className="body-small text-muted-foreground">
            {isWeb ? "Contenuto dal web" : `${paths.length} ${paths.length === 1 ? "file" : "file"}`}
            {openContext.lesson_count > 0 ? ` · ${openContext.lesson_count} lezioni` : ""}
          </p>
        </div>

        {openContext.new_material_pending && (
          <div className="mx-1 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 animate-fade-up">
            📥 Hai materiale nuovo che non è ancora nelle lezioni: rigenera il percorso
            dal menù ⋯ nella home di Studio per includerlo.
          </div>
        )}

        {isWeb ? (
          <div className="flex items-center gap-3 p-4 mx-1 rounded-2xl bg-surface-container-low border border-outline-variant">
            <div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-tertiary" />
            </div>
            <p className="body-small text-muted-foreground">
              Questo percorso è nato dal web o dall'AI: nessun file nel deposito.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paths.map((path, i) => {
              const name = displayName(path);
              const Icon = iconFor(name);
              return (
                <div
                  key={path}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl bg-card border border-outline-variant/60 shadow-level-1",
                    "transition-all duration-300 animate-fade-up",
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="flex-1 min-w-0 title-small truncate">{name}</p>
                  <Button
                    variant="ghost" size="icon"
                    disabled={isBusy}
                    onClick={() => setDeleteFileTarget({ ctx: openContext, path, isLast: paths.length === 1 })}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
          variant="outline"
          disabled={isBusy}
          onClick={() => attachInputRef.current?.click()}
          className="w-full h-12 rounded-2xl border-dashed"
        >
          {attaching ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aggiunta in corso…</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" />Aggiungi file a questo percorso</>
          )}
        </Button>

        {/* conferma rimozione singolo file */}
        <AlertDialog open={!!deleteFileTarget} onOpenChange={() => setDeleteFileTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Togliere questo file?</AlertDialogTitle>
              <AlertDialogDescription>
                Stai per togliere "{deleteFileTarget ? displayName(deleteFileTarget.path) : ""}" da "{deleteFileTarget?.ctx.file_name}".
                {deleteFileTarget?.isLast ? (
                  <span className="block mt-2 font-medium text-destructive">
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
              <AlertDialogAction onClick={handleRemoveFile} disabled={removeFileMutation.isPending} className="bg-destructive hover:bg-destructive/90">
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
      <h3 className="label-medium text-muted-foreground px-1">I tuoi percorsi ({contexts.length})</h3>
      <div className="space-y-2">
        {contexts.map((context, i) => {
          const nFiles = pathsOf(context).length;
          const isWeb = nFiles === 0;
          return (
            <div
              key={context.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpenContextId(context.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenContextId(context.id); }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-outline-variant/60 shadow-level-1",
                "cursor-pointer hover:shadow-level-2 hover:border-primary/40 active:scale-[0.99]",
                "transition-all duration-300 animate-fade-up",
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                {isWeb ? <Globe className="w-5 h-5 text-primary" /> : <PackageOpen className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="title-small truncate">{context.file_name}</p>
                <p className="body-small text-muted-foreground">
                  {isWeb ? "Web" : `${nFiles} ${nFiles === 1 ? "file" : "file"}`}
                  {context.lesson_count > 0 ? ` · ${context.lesson_count} lezioni` : ""}
                </p>
                {context.new_material_pending && (
                  <p className="body-small font-medium text-amber-700 mt-0.5">📥 Materiale nuovo da includere</p>
                )}
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => { e.stopPropagation(); setDeleteContextTarget(context); }}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteContextTarget} onOpenChange={() => setDeleteContextTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo percorso?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{deleteContextTarget?.file_name}" con tutti i suoi file.
              {deleteContextTarget?.lesson_count && deleteContextTarget.lesson_count > 0 && (
                <span className="block mt-2 font-medium text-destructive">Verranno eliminate anche le {deleteContextTarget.lesson_count} lezioni associate.</span>
              )}
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContext} disabled={deleteMutation.isPending} className="bg-destructive hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
