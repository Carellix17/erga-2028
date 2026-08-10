import { useState, useCallback, useEffect } from "react";
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

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles, onFileDeleted, initialManageContextId }: UploadSheetProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => ALLOWED_IMAGE_TYPES.includes(f.type));
    if (files.length === 0) return;
    const total = selectedImages.length + files.length;
    if (total > MAX_IMAGES) {
      toast({ title: "Troppi file", description: `Puoi caricare massimo ${MAX_IMAGES} foto alla volta`, variant: "destructive" });
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadImages = async () => {
    if (selectedImages.length === 0 || !currentUser) return;
    setIsUploading(true);
    setUploadStatus("Caricamento immagini...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const formData = new FormData();
      formData.append("uploadType", "images");
      formData.append("contextName", `📷 ${selectedImages.length} foto`);
      selectedImages.forEach((img, i) => formData.append(`image_${i}`, img));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nel caricamento");

      const contextId = data.contextId;
      setUploadStatus("Elaborazione immagini...");

      // Wait for image processing
      const authTokenForPolling = (await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const statusResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForPolling}` },
          body: JSON.stringify({ userId: currentUser, action: "listContexts" }),
        });
        const statusData = await statusResponse.json();
        const context = statusData.contexts?.find((c: { id: string }) => c.id === contextId);
        if (context?.processing_status === "completed") break;
        if (context?.processing_status === "failed") throw new Error(context.error_message || "Errore nell'elaborazione delle immagini");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      onUpload([{ name: `📷 ${selectedImages.length} foto`, size: selectedImages.reduce((s, f) => s + f.size, 0) }], contextId);
      setSelectedImages([]);
      setImagePreviews([]);
      onOpenChange(false);
      toast({ title: "Foto caricate! 📷", description: "Ora puoi generare le lezioni dal tab Studio." });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  // 🎯 P13: crea il contesto dalla voce SCELTA (title) o dal manuale AI (forceAI).
  const createWebContext = async (payload: { title?: string; forceAI?: boolean }) => {
    if (!webTopic.trim() || !currentUser) return;
    setIsSearching(true);
    if (payload.title) setPickingTitle(payload.title);
    setUploadStatus(payload.forceAI ? "Preparazione del manuale AI..." : "Preparazione del contenuto dalla voce scelta...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const searchResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, topic: webTopic.trim(), title: payload.title, forceAI: payload.forceAI, language: currentLanguage() }),
        }
      );
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(searchData.error || "Errore nella ricerca");

      onUpload([{ name: `🌐 ${webTopic}`, size: searchData.contentLength || 0 }], searchData.contextId);
      setWebTopic("");
      setCandidates(null);
      onOpenChange(false);
      const fromWiki = searchData.source === "wikipedia";
      // 🪧 P19 — se le immagini sono state saltate, la macchina racconta IL PERCHE'.
      const wikiSkipReasons: string[] = Array.isArray(searchData.imagesSkippedReasons) ? searchData.imagesSkippedReasons : [];
      const imgNote = searchData.imagesCount
        ? `con ${searchData.imagesCount} immagini vere 📷. `
        : (fromWiki
          ? `nessuna immagine salvata${wikiSkipReasons.length ? ` (${wikiSkipReasons[0].slice(0, 90)})` : " (niente immagini utili nella voce)"}. `
          : "");
      toast({
        title: fromWiki ? "Contenuto da Wikipedia! 🌐" : "Manuale AI pronto 🌐",
        description: fromWiki
          ? `${searchData.pageTitle ? `Voce: «${searchData.pageTitle}», ` : ""}${imgNote}Ora genera le lezioni dal tab Studio.`
          : (payload.forceAI
            ? "Come hai chiesto tu: manuale scritto dall'AI dalla sua conoscenza. Ora genera le lezioni dal tab Studio."
            : "Wikipedia non copre questo tema: l'AI ha scritto dalla sua conoscenza. Ora genera le lezioni dal tab Studio."),
      });
    } catch (error) {
      console.error("Web search error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella ricerca", variant: "destructive" });
    } finally {
      setIsSearching(false);
      setPickingTitle(null);
      setUploadStatus("");
    }
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

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !currentUser) return;
    setIsUploading(true);
    setUploadStatus("Caricamento file...");
    const uploadedFileInfos: { name: string; size: number }[] = [];
    let latestContextId: string | undefined;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // 📚 P17: più file insieme = UN percorso unico che li mescola tutti.
      // Il primo APRE il percorso col nome scelto, gli altri si ALLEGANO.
      const singleCourse = selectedFiles.length >= 2;
      const finalCourseName = courseName.trim() || stripExt(selectedFiles[0]?.name ?? "Il mio percorso");
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatus(singleCourse && i > 0 ? `Aggiungo ${file.name} al percorso...` : `Caricamento ${file.name}...`);
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
      }

      if (uploadedFileInfos.length > 0 && latestContextId) {
        // Skip processing polling — go straight to Studio. Lesson generation
        // will handle the processing state with its own immersive loader.
        onUpload(uploadedFileInfos, latestContextId);
        setSelectedFiles([]);
        onOpenChange(false);
        toast({ title: singleCourse ? "Percorso creato! 📚" : "File caricato! 📄", description: "Vai su Studio per generare le lezioni." });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
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
    <Sheet open={open} onOpenChange={isUploading ? () => {} : onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe max-h-[85vh] bg-surface-container-high border-t border-outline-variant flex flex-col overflow-hidden">
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

          <TabsContent value="loading" className="flex-1 min-h-0 mt-0 overflow-hidden tab-enter">
            <Tabs value={loadingTab} onValueChange={setLoadingTab} className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
              <TabsContent value="menu" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y mt-0 pb-4 tab-enter">
                <div className="space-y-4">
                  <p className="body-medium text-muted-foreground text-center">
                    Scegli come vuoi caricare i tuoi materiali
                  </p>
                  <div className="grid gap-3">
                    <Button type="button" style={{ animationDelay: "80ms" }} onClick={() => setLoadingTab("upload")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40 leaf-rise">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Carica PDF</p>
                        <p className="body-small text-muted-foreground">Appunti, dispense o documenti</p>
                      </div>
                    </Button>
                    <Button type="button" style={{ animationDelay: "160ms" }} onClick={() => setLoadingTab("photos")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40 leaf-rise">
                      <Camera className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Carica foto</p>
                        <p className="body-small text-muted-foreground">Scatta o scegli immagini</p>
                      </div>
                    </Button>
                    <Button type="button" style={{ animationDelay: "240ms" }} onClick={() => setLoadingTab("web")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40 leaf-rise">
                      <Globe className="w-5 h-5 text-primary" />
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
                              <FileText className={cn("w-5 h-5", file.size > MAX_FILE_SIZE ? "text-destructive" : "text-primary")} />
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
                  <p className="body-small text-muted-foreground text-center mt-2">📄 Vai su Studio per generare le lezioni</p>
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
                    <h3 className="label-medium text-muted-foreground">Foto selezionate ({selectedImages.length}/{MAX_IMAGES})</h3>
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
                            <span className="body-small text-xs">{(selectedImages[index]?.size / 1024 / 1024).toFixed(1)}MB</span>
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
                  <p className="body-small text-muted-foreground text-center mt-2">📸 Dopo il caricamento potrai generare le lezioni</p>
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
                    🔍 Dopo la preparazione potrai generare le lezioni
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
  );
}
