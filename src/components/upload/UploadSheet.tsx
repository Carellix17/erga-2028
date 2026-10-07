import { useState, useCallback, useEffect, useRef } from "react";
import { FileUp, X, FileText, Loader2, Brain, Globe, Search, Camera, ImageIcon, ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileManager } from "./FileManager";
import { useQueryClient } from "@tanstack/react-query";
import { fileContextsKey } from "@/hooks/useFileContexts";
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";
import { WikiCandidatePicker, type WikiCandidate } from "./WikiCandidatePicker";
import { compressImages, formatBytes } from "@/lib/imageCompression";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { UnifiedPipelineLoader, type PipelinePhase } from "./UnifiedPipelineLoader";
import { useGenerationUsage, FREE_LIMIT_MESSAGE } from "@/hooks/useGenerationUsage";


interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: { name: string; size: number }[], contextId?: string) => void;
  uploadedFiles: { name: string; size: number }[];
  onSelectFile?: (contextId: string) => void;
  onFileDeleted?: () => void;
  initialManageContextId?: string | null;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;
/** Limite morbido per singola foto DOPO la compressione (stesso valore lato server). */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles, onFileDeleted, initialManageContextId }: UploadSheetProps) {
  // La tastiera non può più seppellire il tasto principale: il foglio si
  // alza di `inset` px e si restringe all'altezza davvero visibile
  // (richiesta del proprietario: il tasto SI DEVE sempre vedere).
  const keyboard = useKeyboardInset();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageBytes, setImageBytes] = useState<{ original: number; compressed: number }>({ original: 0, compressed: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [activeTab, setActiveTab] = useState<string>("loading");
  const [loadingTab, setLoadingTab] = useState<string>("menu");
  const [webTopic, setWebTopic] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  // 🎯 P13 IL PICKER DELLE VOCI: i candidati mostrati dopo la ricerca
  // (null = ancora nessuna ricerca; pickingTitle = carta in creazione).
  const [candidates, setCandidates] = useState<WikiCandidate[] | null>(null);
  const [pickingTitle, setPickingTitle] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isAttaching, setIsAttaching] = useState(false);
  const [courseName, setCourseName] = useState("");
  // ── PIPELINE UNICA (decisione del proprietario, 7 ottobre 2026) ────────
  // Dal tocco su «Carica» alle prime lezioni pronte l'utente vede UN solo
  // caricamento (UnifiedPipelineLoader). Dentro ci stanno compressione
  // delle foto, caricamento, analisi del materiale e generazione del
  // percorso: nessuno spinner a catena, nessun bottone intermedio.
  const [pipeline, setPipeline] = useState<{ phase: PipelinePhase; progress: number; courseName: string | null; skipped: boolean } | null>(null);
  const usageQuery = useGenerationUsage();
  const usageLimitReached = !!usageQuery.data && !usageQuery.data.unlimited && usageQuery.data.remaining <= 0;
  // Le foto scelte, lette fresche al tocco su «Carica» (l'ottimizzazione
  // silenziosa potrebbe averne appena aggiunte alla selezione).
  const selectedImagesRef = useRef<File[]>([]);
  useEffect(() => { selectedImagesRef.current = selectedImages; }, [selectedImages]);
  // La coda dell'ottimizzazione silenziosa delle foto: una alla volta.
  const compressQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // 🎯 P17: il menù ⋯ di Studio manda dritti nello scaffale di QUEL percorso
  useEffect(() => {
    if (open && initialManageContextId) setActiveTab("manage");
  }, [open, initialManageContextId]);

  const handleMainTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "loading") setLoadingTab("menu");
  };

  const MAX_IMAGES = 20;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(isDocFile);
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  // 📄 P17: il lettore universale — PDF, DOCX, TXT e MD (per tipo o per estensione)
  const isDocFile = (f: File) => {
    const n = f.name.toLowerCase();
    return f.type === "application/pdf" || f.type.startsWith("text/") ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.(pdf|txt|md|markdown|docx)$/.test(n);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isDocFile);
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));

  // 📷 P3: ogni foto viene ricodificata PRIMA dell'upload (lato lungo 2000 px,
  // JPEG 0.82, orientamento EXIF corretto). Mostriamo peso prima/dopo.
  const handleImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []).filter(f => ALLOWED_IMAGE_TYPES.includes(f.type));
    input.value = "";
    if (files.length === 0) return;
    const total = selectedImages.length + files.length;
    if (total > MAX_IMAGES) {
      toast({ title: "Troppi file", description: `Puoi caricare massimo ${MAX_IMAGES} foto alla volta`, variant: "destructive" });
      return;
    }

    // OTTIMIZZAZIONE SILENTE (decisione del proprietario, 7 ottobre 2026):
    // l'ottimizzazione non è più un caricamento a sé stante — le
    // foto si preparano in coda, in sordina; se l'utente tocca «Carica»
    // prima che la coda sia svuotata, ci pensa il caricamento unico.
    const run = (async () => {
      await compressQueueRef.current;
      const all = await compressImages(files);
      // Scarta solo le foto troppo pesanti: le altre restano selezionate.
      const tooBig = all.filter(r => r.compressedBytes > MAX_IMAGE_BYTES);
      const results = all.filter(r => r.compressedBytes <= MAX_IMAGE_BYTES);
      if (tooBig.length > 0) {
        const names = tooBig.map(r => `«${r.file.name}»`).join(", ");
        toast({
          title: tooBig.length === 1 ? "Foto troppo grande" : "Alcune foto sono troppo grandi",
          description: `${names} ${tooBig.length === 1 ? "supera" : "superano"} gli 8 MB anche dopo la compressione: ${tooBig.length === 1 ? "non è stata aggiunta" : "non sono state aggiunte"}. Scattala di nuovo con una risoluzione più bassa.`,
          variant: "destructive",
        });
      }
      if (results.length === 0) return;

      setSelectedImages(prev => [...prev, ...results.map(r => r.file)]);
      setImageBytes(prev => ({
        original: prev.original + results.reduce((s, r) => s + r.originalBytes, 0),
        compressed: prev.compressed + results.reduce((s, r) => s + r.compressedBytes, 0),
      }));
      for (const r of results) {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(r.file);
        });
        setImagePreviews(prev => [...prev, preview]);
      }
    })();
    compressQueueRef.current = run;
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const removed = prev[index];
      if (removed) setImageBytes(b => ({ original: b.original, compressed: Math.max(0, b.compressed - removed.size) }));
      return prev.filter((_, i) => i !== index);
    });
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Il contesto come lo vede la pipeline: stato di elaborazione e generazione.
  const fetchPipelineContext = async (contextId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ userId: currentUser, action: "listContexts" }),
    });
    const data = await response.json();
    return (data.contexts ?? []).find((c: { id: string }) => c.id === contextId) ?? null;
  };

  // A fine corsa: pulisce la selezione e chiude il doc. L'app è già sul
  // nuovo percorso in Studio (onUpload porta lì appena il contesto esiste).
  const finishPipeline = () => {
    setSelectedFiles([]);
    setSelectedImages([]);
    setImagePreviews([]);
    setImageBytes({ original: 0, compressed: 0 });
    setCourseName("");
    setWebTopic("");
    setCandidates(null);
    onOpenChange(false);
  };

  /**
   * LA PIPELINE UNICA — un solo caricamento alla vista dell'utente, che
   * dentro comprende TUTTI i processi (richiesta del proprietario, 7
   * ottobre 2026): compressione delle foto, caricamento del materiale,
   * analisi e generazione del percorso (schema + prime lezioni). La
   * sequenza è quella del bottone «Genera percorso» di Studio, solo
   * orchestrata: l'utente non vede mai un passaggio.
   */
  const runUnifiedPipeline = async (opts: {
    courseName: string;
    /** Nota mostrata nel toast finale (es. «contenuto da Wikipedia»). */
    finalNote?: () => string;
    /** Fase MATERIALE: prepara e carica, chiama onUpload appena il contesto
     *  esiste. Risponde con l'id del contesto, oppure null se il caricamento
     *  non è partito (errore già notificato: il doc resta aperto). */
    material: () => Promise<string | null>;
  }) => {
    if (!currentUser) return;
    setPipeline({ phase: "material", progress: 4, courseName: opts.courseName, skipped: false });
    let contextId: string | null = null;
    try {
      contextId = await opts.material();
      if (!contextId) { setPipeline(null); return; }

      // Fase ANALISI: foto e PDF lavorano nel server; documenti di testo e
      // contenuti web sono già pronti e questo giro dura un istante.
      setPipeline((p) => (p ? { ...p, phase: "analysis", progress: Math.max(p.progress, 38) } : p));
      let analyzed = false;
      for (let attempt = 0; attempt < 90; attempt++) {
        const ctx = await fetchPipelineContext(contextId);
        if (ctx?.processing_status === "completed") { analyzed = true; break; }
        if (ctx?.processing_status === "failed") throw new Error(ctx.error_message || "Non sono riuscito a leggere il materiale.");
        setPipeline((p) => (p ? { ...p, progress: Math.min(58, p.progress + 0.7) } : p));
        await sleep(2000);
      }
      if (!analyzed) throw new Error("L'analisi del materiale sta impiegando troppo: riprova tra poco dal bottone «Genera percorso».");

      // Limite del piano Free: lo stesso identico messaggio di Studio.
      if (usageLimitReached) {
        toast({ title: "Limite raggiunto", description: FREE_LIMIT_MESSAGE, variant: "destructive" });
        return; // il finally chiude il doc e atterra sul corso
      }

      // Fase GENERAZIONE: la stessa chiamata del bottone «Genera percorso».
      setPipeline((p) => (p ? { ...p, phase: "generation", progress: Math.max(p.progress, 62) } : p));
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId: currentUser, contextId, language: currentLanguage() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione");

      // Il server genera in background: si aspetta la fine (schema + prime lezioni).
      let generated = false;
      for (let attempt = 0; attempt < 240; attempt++) {
        const ctx = await fetchPipelineContext(contextId);
        const status = ctx?.generation_status;
        if (status === "completed") { generated = true; break; }
        if (status === "failed") throw new Error("La generazione non è riuscita: rilanciala dal bottone «Genera percorso».");
        const prog = ctx?.generation_progress;
        if (prog?.totalLessons && typeof prog.generatedCount === "number" && prog.totalLessons > 0) {
          const ratio = Math.min(1, prog.generatedCount / prog.totalLessons);
          setPipeline((p) => (p ? { ...p, progress: Math.max(p.progress, Math.min(97, 62 + ratio * 35)) } : p));
        } else {
          setPipeline((p) => (p ? { ...p, progress: Math.min(72, p.progress + 0.4) } : p));
        }
        await sleep(2500);
      }
      if (!generated) throw new Error("La generazione sta impiegando troppo: trovi il percorso in Studio tra poco.");

      setPipeline((p) => (p ? { ...p, progress: 100 } : p));
      await sleep(450);
      const note = opts.finalNote?.() ?? "";
      toast({ title: "Percorso pronto! 🎉", description: note ? `${opts.courseName} — ${note}` : opts.courseName });
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella preparazione del percorso", variant: "destructive" });
    } finally {
      // Il materiale è caricato: in ogni caso l'utente atterra sul corso in
      // Studio, dove la generazione si può rilanciare dal bottone che c'è già.
      if (contextId) finishPipeline();
      setPipeline(null);
    }
  };


  // 📷 FOTO — un tocco e via: la pipeline unica comprime (se la coda
  // silenziosa non ha ancora finito), carica, aspetta l'analisi e genera.
  const handleUploadImages = () => {
    if (selectedImages.length === 0 || !currentUser) return;
    void runUnifiedPipeline({
      courseName: `📷 ${selectedImages.length} foto`,
      material: async () => {
        await compressQueueRef.current;
        const images = selectedImagesRef.current;
        if (images.length === 0) return null;
        setIsUploading(true);
        setUploadStatus("Caricamento immagini...");
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const formData = new FormData();
          formData.append("uploadType", "images");
          formData.append("contextName", `📷 ${images.length} foto`);
          images.forEach((img, i) => formData.append(`image_${i}`, img));

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-pdf`, {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
            body: formData,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Errore nel caricamento");

          const contextId = data.contextId as string;
          setPipeline((p) => (p ? { ...p, progress: 35 } : p));
          // Il percorso esiste: l'app ci scivola sopra mentre il velo copre.
          onUpload([{ name: `📷 ${images.length} foto`, size: images.reduce((sum, f) => sum + f.size, 0) }], contextId);
          return contextId;
        } catch (error) {
          console.error("Image upload error:", error);
          toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
          return null;
        } finally {
          setIsUploading(false);
          setUploadStatus("");
        }
      },
    });
  };

  // 🎯 P13: la voce SCELTA (title) o il manuale AI (forceAI) entrano anche
  // loro nella pipeline unica: preparazione del contenuto + percorso.
  const createWebContext = (payload: { title?: string; forceAI?: boolean }) => {
    if (!webTopic.trim() || !currentUser) return;
    const topic = webTopic.trim();
    let webNote = "";
    void runUnifiedPipeline({
      courseName: `🌐 ${topic}`,
      finalNote: () => webNote,
      material: async () => {
        setIsSearching(true);
        if (payload.title) setPickingTitle(payload.title);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const searchResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ userId: currentUser, topic, title: payload.title, forceAI: payload.forceAI, language: currentLanguage() }),
            }
          );
          const searchData = await searchResponse.json();
          if (!searchResponse.ok) throw new Error(searchData.error || "Errore nella ricerca");

          const fromWiki = searchData.source === "wikipedia";
          webNote = fromWiki
            ? `contenuto vero da Wikipedia${searchData.imagesCount ? ` (${searchData.imagesCount} immagini)` : ""}`
            : "manuale scritto dall'AI dalla sua conoscenza";
          setPipeline((p) => (p ? { ...p, progress: 35 } : p));
          onUpload([{ name: `🌐 ${topic}`, size: searchData.contentLength || 0 }], searchData.contextId);
          setWebTopic("");
          setCandidates(null);
          return searchData.contextId as string;
        } catch (error) {
          console.error("Web search error:", error);
          toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella ricerca", variant: "destructive" });
          return null;
        } finally {
          setIsSearching(false);
          setPickingTitle(null);
          setUploadStatus("");
        }
      },
    });
  };

  // 🎯 P13: prima si CERCANO le voci candidate; la creazione parte al tocco sulla carta.
  const handleWebSearch = async () => {
    if (!webTopic.trim() || !currentUser) return;
    setIsSearching(true);
    setUploadStatus("Cerco le voci su Wikipedia...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "search", topic: webTopic.trim(), language: currentLanguage() }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Errore nella ricerca");
      setCandidates(data.candidates ?? []);
    } catch (error) {
      console.error("Web candidates error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella ricerca", variant: "destructive" });
    } finally {
      setIsSearching(false);
      setUploadStatus("");
    }
  };

  // 📄 DOCUMENTI — stesso patto: un tocco e la pipeline unica fa tutto.
  // 📚 P17: più file insieme = UN percorso unico che li mescola tutti
  // (il primo APRE il percorso col nome scelto, gli altri si ALLEGANO).
  const handleUpload = () => {
    if (selectedFiles.length === 0 || !currentUser) return;
    const singleCourse = selectedFiles.length >= 2;
    const finalCourseName = courseName.trim() || stripExt(selectedFiles[0]?.name ?? "Il mio percorso");
    void runUnifiedPipeline({
      courseName: finalCourseName,
      material: async () => {
        setIsUploading(true);
        const uploadedFileInfos: { name: string; size: number }[] = [];
        let latestContextId: string | undefined;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            if (file.size > MAX_FILE_SIZE) {
              toast({ title: "File troppo grande", description: `${file.name} supera il limite di 100MB`, variant: "destructive" });
              continue;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("userId", currentUser);
            if (singleCourse) {
              if (i > 0 && latestContextId) formData.append("contextId", latestContextId);
              else formData.append("contextName", finalCourseName);
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-pdf`, {
              method: "POST",
              headers: { Authorization: `Bearer ${authToken}` },
              body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore nel caricamento");

            uploadedFileInfos.push({ name: file.name, size: file.size });
            if (data.contextId) latestContextId = data.contextId as string;
            setPipeline((p) => (p ? { ...p, progress: Math.min(35, 15 + (20 * (i + 1)) / selectedFiles.length) } : p));
          }

          if (uploadedFileInfos.length === 0 || !latestContextId) return null;
          onUpload(uploadedFileInfos, latestContextId);
          return latestContextId;
        } catch (error) {
          console.error("Upload error:", error);
          toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
          return null;
        } finally {
          setIsUploading(false);
          setUploadStatus("");
        }
      },
    });
  };


  const handleFileDeleted = () => { onFileDeleted?.(); };

  const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

  // ➕ P17 — l'addetto alle aggiunte: carica file DENTRO un percorso esistente
  const handleAttachFiles = async (contextId: string, files: File[]) => {
    if (!currentUser || files.length === 0) return;
    setIsAttaching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast({ title: "File troppo grande", description: `${file.name} supera il limite di 100MB`, variant: "destructive" });
          continue;
        }
        setUploadStatus(`Aggiunta di ${file.name}...`);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", currentUser);
        formData.append("contextId", contextId);
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Errore con ${file.name}`);
      }
      toast({
        title: "Materiale aggiunto 📥",
        description: files.length === 1
          ? "Rigenera il percorso per includerlo nelle lezioni."
          : `${files.length} file aggiunti: rigenera per includerli.`,
      });
      qc.invalidateQueries({ queryKey: fileContextsKey(currentUser) });
      onFileDeleted?.();
    } catch (error) {
      console.error("Attach error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nell'aggiunta", variant: "destructive" });
    } finally {
      setIsAttaching(false);
      setUploadStatus("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
    <Sheet open={open} onOpenChange={isUploading ? () => {} : onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl pb-safe max-h-[85dvh] bg-surface-container-high border-t border-outline-variant flex flex-col overflow-hidden"
        style={{
          bottom: keyboard.inset,
          ...(keyboard.inset > 0 && keyboard.viewportHeight ? { maxHeight: keyboard.viewportHeight } : {}),
        }}
      >
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle className="font-display text-xl">I tuoi materiali</SheetTitle>
          <SheetDescription className="sr-only">Carica PDF, immagini o contenuti web per generare mini-lezioni</SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={handleMainTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4 p-1.5 h-13 bg-surface-container-highest rounded-xl shrink-0">
            <TabsTrigger value="loading" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-level-1 transition-all duration-300 text-xs">
              Caricamento
            </TabsTrigger>
            <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-tertiary data-[state=active]:text-tertiary-foreground data-[state=active]:shadow-level-1 transition-all duration-300 text-xs">
              Gestisci
            </TabsTrigger>
          </TabsList>

          {/* FIX «tasto invisibile»: questo pannello è un contenitore FLEX
              (prima era block e il Tabs interno, con h-full, si dimensionava
              sul CONTENUTO invece che sullo spazio disponibile: con 2+ file
              la lista sforava il max-h del foglio e la CTA finiva sotto lo
              schermo, clippata da overflow-hidden). */}
          <TabsContent value="loading" className="flex flex-1 flex-col min-h-0 mt-0 overflow-hidden tab-enter">
            <Tabs value={loadingTab} onValueChange={setLoadingTab} className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <TabsContent value="menu" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y mt-0 pb-4 tab-enter">
                <div className="space-y-4">
                  <p className="body-medium text-muted-foreground text-center">
                    Scegli come vuoi caricare i tuoi materiali
                  </p>
                  <div className="grid gap-3">
                    <Button type="button" style={{ animationDelay: "80ms" }} onClick={() => setLoadingTab("upload")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40 leaf-rise">
                      <FileText className="w-5 h-5 text-brand-deep" />
                      <div className="text-left">
                        <p className="font-medium">Carica PDF</p>
                        <p className="body-small text-muted-foreground">Appunti, dispense o documenti</p>
                      </div>
                    </Button>
                    <Button type="button" style={{ animationDelay: "160ms" }} onClick={() => setLoadingTab("photos")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40 leaf-rise">
                      <Camera className="w-5 h-5 text-brand-deep" />
                      <div className="text-left">
                        <p className="font-medium">Carica foto</p>
                        <p className="body-small text-muted-foreground">Scatta o scegli immagini</p>
                      </div>
                    </Button>
                    <Button type="button" style={{ animationDelay: "240ms" }} onClick={() => setLoadingTab("web")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40 leaf-rise">
                      <Globe className="w-5 h-5 text-brand-deep" />
                      <div className="text-left">
                        <p className="font-medium">Ricerca web</p>
                        <p className="body-small text-muted-foreground">Contenuti reali da Wikipedia, o un manuale AI</p>
                      </div>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-0 tab-enter">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y space-y-4 pb-4 pr-1">
                  <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")} disabled={isUploading}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Torna a Caricamento
                  </Button>
                  <div
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                      dragActive ? "border-primary bg-primary-container scale-[1.02] shadow-level-2" : "border-outline-variant hover:border-primary/40 hover:bg-surface-container-low",
                      isUploading && "pointer-events-none opacity-50"
                    )}
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  >
                    <input type="file" accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                    <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-level-2">
                      <FileUp className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <p className="font-display font-semibold text-lg mb-1">Trascina qui i tuoi documenti</p>
                    <p className="body-small text-muted-foreground">PDF, DOCX, TXT o MD — tocca per selezionare (max 100MB)</p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2 animate-fade-up">
                      <h3 className="label-medium text-muted-foreground">File selezionati ({selectedFiles.length})</h3>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className={cn(
                            "flex items-center gap-3 p-4 rounded-xl transition-all duration-300 animate-scale-in",
                            file.size > MAX_FILE_SIZE ? "bg-error-container border border-destructive/30" : "bg-secondary-container"
                          )}>
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                              file.size > MAX_FILE_SIZE ? "bg-destructive/20" : "bg-primary-container"
                            )}>
                              <FileText className={cn("w-5 h-5", file.size > MAX_FILE_SIZE ? "text-destructive" : "text-brand-deep")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="body-medium font-medium truncate block">{file.name}</span>
                              <span className={cn("body-small", file.size > MAX_FILE_SIZE ? "text-destructive" : "text-muted-foreground")}>
                                {formatFileSize(file.size)}{file.size > MAX_FILE_SIZE && " — Troppo grande!"}
                              </span>
                            </div>
                            <button onClick={() => removeFile(index)} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors" disabled={isUploading}>
                              <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFiles.length >= 2 && (
                    <div className="pt-1 animate-fade-up">
                      <label htmlFor="course-name" className="label-small text-muted-foreground">Nome del percorso unico</label>
                      <Input
                        id="course-name"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder={stripExt(selectedFiles[0]?.name ?? "Il mio percorso")}
                        className="mt-1"
                        disabled={isUploading}
                      />
                      <p className="body-small text-muted-foreground mt-1">
                        📚 I {selectedFiles.length} file finiranno in UN percorso che li studia tutti insieme.
                      </p>
                    </div>
                  )}
                </div>

                <div className="shrink-0 bg-surface-container-high pt-3 pb-2 border-t border-outline-variant/40">
                  <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading} className="w-full h-14 text-base" size="lg">
                    {isUploading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{uploadStatus || "Caricamento..."}</>
                    ) : selectedFiles.length > 0 ? (
                      <><FileUp className="w-5 h-5 mr-2" />Carica {selectedFiles.length > 1 ? `${selectedFiles.length} file` : "file"}</>
                    ) : ("Seleziona file da caricare")}
                  </Button>
                  <p className="body-small text-muted-foreground text-center mt-2">📄 Un tocco e il percorso si prepara da solo</p>
                </div>
              </TabsContent>

              <TabsContent value="photos" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y space-y-4 mt-0 pb-4 tab-enter">
                <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")} disabled={isUploading}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Torna a Caricamento
                </Button>
                <div className="relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 border-outline-variant hover:border-primary/40 hover:bg-surface-container-low">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading || selectedImages.length >= MAX_IMAGES}
                  />
                  <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-level-2">
                    <Camera className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="font-display font-semibold text-lg mb-1">Carica le tue foto</p>
                  <p className="body-small text-muted-foreground">Appunti, lavagna, libro — max {MAX_IMAGES} foto (JPG, PNG)</p>
                </div>

                {selectedImages.length > 0 && (
                  <div className="space-y-3 animate-fade-up">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="label-medium text-muted-foreground">Foto selezionate ({selectedImages.length}/{MAX_IMAGES})</h3>
                      <p className="body-small text-muted-foreground tabular-nums">
                        {selectedImages.length} foto → ~{formatBytes(imageBytes.compressed)}
                        {imageBytes.original > imageBytes.compressed && (
                          <span className="text-muted-foreground/70"> (da {formatBytes(imageBytes.original)})</span>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative rounded-xl overflow-hidden aspect-square animate-scale-in bg-surface-container">
                          <img src={preview} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-7 h-7 bg-background shadow-level-1 rounded-full flex items-center justify-center"
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-background shadow-level-1 rounded-full px-2 py-0.5">
                            <span className="body-small text-xs">{formatBytes(selectedImages[index]?.size ?? 0)}</span>
                          </div>
                        </div>
                      ))}
                      {selectedImages.length < MAX_IMAGES && (
                        <label className="relative rounded-xl border-2 border-dashed border-outline-variant aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleImageInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="body-small text-muted-foreground text-xs">Aggiungi</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 bg-surface-container-high pt-3 pb-2 -mx-1 px-1 mt-auto">
                  <Button onClick={handleUploadImages} disabled={selectedImages.length === 0 || isUploading} className="w-full h-14 text-base" size="lg">
                    {isUploading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{uploadStatus || "Elaborazione..."}</>
                    ) : selectedImages.length > 0 ? (
                      <><FileUp className="w-5 h-5 mr-2" />Carica {selectedImages.length} foto</>
                    ) : ("Seleziona le foto da analizzare")}
                  </Button>
                  <p className="body-small text-muted-foreground text-center mt-2">📸 Un tocco e il percorso si prepara da solo</p>
                </div>
              </TabsContent>

              <TabsContent value="web" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y space-y-5 mt-0 pb-4 tab-enter">
                <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Torna a Caricamento
                </Button>
                <div className="text-center space-y-3 leaf-rise">
                  <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto shadow-level-2">
                    <Globe className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg">Scegli un argomento</p>
                    <p className="body-small text-muted-foreground">Se Wikipedia copre il tema useremo i suoi contenuti reali (con fonte e immagini); altrimenti prepareremo un manuale AI — e te lo diremo</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={webTopic}
                      onChange={(e) => { setWebTopic(e.target.value); if (candidates !== null) setCandidates(null); }}
                      placeholder="Es: La Rivoluzione Francese, Derivate, DNA..."
                      className="pl-10 h-14 text-base rounded-xl bg-surface-container border-outline-variant"
                      onKeyDown={(e) => { if (e.key === "Enter" && webTopic.trim()) handleWebSearch(); }}
                      disabled={isSearching}
                    />
                  </div>

                  <Button
                    onClick={handleWebSearch}
                    disabled={!webTopic.trim() || isSearching}
                    className="w-full h-14 text-base"
                    size="lg"
                  >
                    {isSearching && pickingTitle === null ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Ricerca in corso...</>
                    ) : (
                      <><Search className="w-5 h-5 mr-2" />Cerca le voci</>
                    )}
                  </Button>

                  {/* 🎯 P13: il picker delle voci — niente più roulette del primo risultato */}
                  {candidates !== null && (
                    <WikiCandidatePicker
                      candidates={candidates}
                      pickingTitle={pickingTitle}
                      disabled={isSearching}
                      onPick={(title) => { void createWebContext({ title }); }}
                      onManualAI={() => { void createWebContext({ forceAI: true }); }}
                    />
                  )}

                  <p className="body-small text-muted-foreground text-center">
                    🔍 Scegli la voce: il percorso si prepara da solo
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="manage" className="flex-1 min-h-0 mt-0 overflow-y-auto overscroll-contain touch-pan-y tab-enter">
            <FileManager onFileDeleted={handleFileDeleted} onAttachFiles={handleAttachFiles} attaching={isAttaching} focusContextId={initialManageContextId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>

    {/* IL CARICAMENTO UNICO — un velo pieno che copre tutto (doc compreso)
        dal tocco su «Carica» fino al percorso pronto. È l'unico stato di
        caricamento che l'utente vede, come chiesto dal proprietario. */}
    {pipeline && !pipeline.skipped && (
      <UnifiedPipelineLoader
        phase={pipeline.phase}
        progress={pipeline.progress}
        courseName={pipeline.courseName}
        onSkip={() => {
          onOpenChange(false);
          setPipeline((p) => (p ? { ...p, skipped: true } : p));
        }}
      />
    )}
    </>
  );
}
