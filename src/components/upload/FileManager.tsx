import { useState } from "react";
import { Trash2, FileText, BookOpen, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFileContextsQuery, useDeleteFileContext, type FileContext } from "@/hooks/useFileContexts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileManagerProps { onFileDeleted: () => void; onSelectFile: (contextId: string) => void; }

export function FileManager({ onFileDeleted, onSelectFile }: FileManagerProps) {
  const [deleteTarget, setDeleteTarget] = useState<FileContext | null>(null);
  const { toast } = useToast();
  const { data: contexts = [], isLoading } = useFileContextsQuery();
  const deleteMutation = useDeleteFileContext();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "File eliminato", description: `"${deleteTarget.file_name}" è stato rimosso insieme alle sue lezioni.` });
      onFileDeleted();
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nell'eliminazione", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const isDeleting = deleteMutation.isPending;

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

  return (
    <div className="space-y-3">
      <h3 className="label-medium text-muted-foreground px-1">I tuoi file ({contexts.length})</h3>
      <div className="space-y-2">
        {contexts.map((context, i) => (
          <div key={context.id}
            className={`flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary/40 hover:shadow-level-1 transition-all duration-300 animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`}
          >
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="title-small truncate">{context.file_name}</p>
              <p className="body-small text-muted-foreground">
                {context.lesson_count > 0 ? `${context.lesson_count} lezioni` : "Nessuna lezione generata"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onSelectFile(context.id)} className="h-8 px-2">
                <BookOpen className="w-4 h-4 mr-1" />Studia
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(context)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo file?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{deleteTarget?.file_name}".
              {deleteTarget?.lesson_count && deleteTarget.lesson_count > 0 && (
                <span className="block mt-2 font-medium text-destructive">Verranno eliminate anche le {deleteTarget.lesson_count} lezioni associate.</span>
              )}
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
