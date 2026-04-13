import { useState, useCallback } from "react";
import { FileUp, X, FileText, Loader2, Sparkles, Check, Globe, Search, Camera, ImageIcon, ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileManager } from "./FileManager";
import { supabase } from "@/integrations/supabase/client";
import { renderPdfPages } from "@/lib/pdfPageRenderer";

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: { name: string; size: number }[], contextId?: string) => void;
  uploadedFiles: { name: string; size: number }[];
  onSelectFile?: (contextId: string) => void;
  onFileDeleted?: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type UploadStep = "idle" | "uploading" | "processing";

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles, onSelectFile, onFileDeleted }: UploadSheetProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");
  const [currentFileName, setCurrentFileName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("loading");
  const [loadingTab, setLoadingTab] = useState<string>("menu");
  const [webTopic, setWebTopic] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf");
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
    // Generate previews
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
    setGenerationStep("uploading");
    setCurrentFileName(`📷 ${selectedImages.length} foto`);
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
      setGenerationStep("processing");

      // Wait for image processing
      const authTokenForLessons = (await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const statusResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForLessons}` },
          body: JSON.stringify({ userId: currentUser, action: "listContexts" }),
        });
        const statusData = await statusResponse.json();
        const context = statusData.contexts?.find((c: { id: string }) => c.id === contextId);
        if (context?.processing_status === "completed") break;
        if (context?.processing_status === "failed") throw new Error(context.error_message || "Errore nell'elaborazione delle immagini");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Generate lessons
      setGenerationStep("generating");
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForLessons}` },
        body: JSON.stringify({ userId: currentUser, contextId }),
      });

      setGenerationStep("complete");
      await new Promise(resolve => setTimeout(resolve, 1500));

      onUpload([{ name: `📷 ${selectedImages.length} foto`, size: selectedImages.reduce((s, f) => s + f.size, 0) }], contextId);
      setSelectedImages([]);
      setImagePreviews([]);
      setGenerationStep("idle");
      onOpenChange(false);
      toast({ title: "Contenuti pronti! 🎉", description: "Le mini-lezioni sono state generate dalle tue foto." });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
      setGenerationStep("idle");
    } finally {
      setIsUploading(false);
    }
  };

  const handleWebSearch = async () => {
    if (!webTopic.trim() || !currentUser) return;
    setIsSearching(true);
    setGenerationStep("searching");
    setCurrentFileName(`🌐 ${webTopic}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Step 1: Web search
      const searchResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, topic: webTopic.trim() }),
        }
      );
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(searchData.error || "Errore nella ricerca");

      const contextId = searchData.contextId;

      // Step 2: Generate lessons
      setGenerationStep("generating");
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, contextId }),
        }
      );

      setGenerationStep("complete");
      await new Promise(resolve => setTimeout(resolve, 1500));

      onUpload([{ name: `🌐 ${webTopic}`, size: searchData.contentLength || 0 }], contextId);
      setWebTopic("");
      setGenerationStep("idle");
      onOpenChange(false);
      toast({ title: "Contenuti pronti! 🎉", description: "Le mini-lezioni sono state generate dalla ricerca web." });
    } catch (error) {
      console.error("Web search error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella ricerca", variant: "destructive" });
      setGenerationStep("idle");
    } finally {
      setIsSearching(false);
    }
  };

  const cropFigure = async (
    sourceBlob: Blob,
    x: number, y: number, width: number, height: number
  ): Promise<Blob> => {
    const img = await createImageBitmap(sourceBlob);
    const sx = Math.round(img.width * x / 100);
    const sy = Math.round(img.height * y / 100);
    const sw = Math.round(img.width * width / 100);
    const sh = Math.round(img.height * height / 100);
    
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    img.close();
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          canvas.width = 0;
          canvas.height = 0;
          b ? resolve(b) : reject(new Error("Crop failed"));
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const renderAndUploadPageImages = async (file: File, contextId: string, authUserId: string): Promise<{ path: string; description: string }[]> => {
    try {
      console.log("Rendering PDF pages as images...");
      const pages = await renderPdfPages(file);
      console.log(`Rendered ${pages.length} pages`);

      if (pages.length === 0) return [];

      // Step 1: Upload full pages temporarily for AI analysis
      const uploadedPages: { pageNum: number; path: string; blob: Blob }[] = [];
      for (const { pageNum, blob } of pages) {
        const path = `${authUserId}/pages/${contextId}/page_${pageNum}.jpg`;
        const { error } = await supabase.storage
          .from("study-images")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });

        if (error) {
          console.warn(`Failed to upload page ${pageNum}:`, error);
        } else {
          uploadedPages.push({ pageNum, path, blob });
        }
      }

      if (uploadedPages.length === 0) return [];
      console.log(`Uploaded ${uploadedPages.length} pages for analysis`);

      // Step 2: Call AI to identify figures with bounding boxes
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const analyzeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-pdf-figures`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            imagePaths: uploadedPages.map((p) => p.path),
          }),
        }
      );

      if (!analyzeResponse.ok) {
        console.error("Analyze failed:", analyzeResponse.status);
        // Fallback: return full pages
        return uploadedPages.map((p) => ({ path: p.path, description: `Pagina ${p.pageNum}` }));
      }

      const analyzeData = await analyzeResponse.json();
      const results = analyzeData.results || [];

      // Step 3: Crop individual figures and upload
      const figurePaths: { path: string; description: string }[] = [];

      for (const pageResult of results) {
        if (!pageResult.figures || pageResult.figures.length === 0) continue;

        const pageInfo = uploadedPages.find((p) => p.path === pageResult.storagePath);
        if (!pageInfo) continue;

        for (let fi = 0; fi < pageResult.figures.length; fi++) {
          const fig = pageResult.figures[fi];
          try {
            const croppedBlob = await cropFigure(
              pageInfo.blob,
              fig.x, fig.y, fig.width, fig.height
            );

            const figurePath = `${authUserId}/figures/${contextId}/fig_p${pageResult.pageNum}_${fi}.jpg`;
            const { error } = await supabase.storage
              .from("study-images")
              .upload(figurePath, croppedBlob, { contentType: "image/jpeg", upsert: true });

            if (error) {
              console.warn(`Failed to upload figure:`, error);
            } else {
              figurePaths.push({
                path: figurePath,
                description: fig.description || "Figura dal materiale",
              });
            }
          } catch (cropErr) {
            console.warn(`Failed to crop figure ${fi} from page ${pageResult.pageNum}:`, cropErr);
          }
        }
      }

      console.log(`Extracted and uploaded ${figurePaths.length} cropped figures`);

      // If no figures found, return empty (no point showing full pages)
      return figurePaths;
    } catch (err) {
      console.error("Page rendering/analysis error:", err);
      return [];
    }
  };

  const attachImagesToContext = async (contextId: string, figures: { path: string; description: string }[]) => {
    if (figures.length === 0) return;

    const { data: ctx } = await supabase
      .from("study_contexts")
      .select("content")
      .eq("id", contextId)
      .single();

    if (!ctx) return;

    const baseContent = ctx.content.split("\n\n[EXTRACTED_IMAGES]\n")[0];
    const imageMetadata = "\n\n[EXTRACTED_IMAGES]\n" + figures.map((f, i) => `image_${i}: ${f.path} | ${f.description}`).join("\n");

    await supabase
      .from("study_contexts")
      .update({ content: `${baseContent}${imageMetadata}` })
      .eq("id", contextId);

    console.log(`Attached ${figures.length} figure paths to context ${contextId}`);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !currentUser) return;
    setIsUploading(true); setGenerationStep("uploading");
    const uploadedFileInfos: { name: string; size: number }[] = [];
    const uploadedContextIds: string[] = [];
    const fileContextMap: { file: File; contextId: string }[] = [];

    try {
      for (const file of selectedFiles) {
        setCurrentFileName(file.name);
        if (file.size > MAX_FILE_SIZE) {
          toast({ title: "File troppo grande", description: `${file.name} supera il limite di 100MB`, variant: "destructive" });
          continue;
        }

        setGenerationStep("uploading");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", currentUser);

        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Errore nel caricamento");

        uploadedFileInfos.push({ name: file.name, size: file.size });
        if (data.contextId) {
          uploadedContextIds.push(data.contextId as string);
          fileContextMap.push({ file, contextId: data.contextId as string });
        }
        setGenerationStep("processing");
      }

      if (uploadedFileInfos.length > 0 && uploadedContextIds.length > 0) {
        const { data: { session: sessionForLessons } } = await supabase.auth.getSession();
        const authTokenForLessons = sessionForLessons?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const authenticatedUserId = sessionForLessons?.user?.id;

        if (!authenticatedUserId) {
          throw new Error("Sessione utente non valida");
        }

        const waitForContextProcessing = async (contextId: string) => {
          const maxAttempts = 60; const delayMs = 3000;
          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const statusResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
              { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForLessons}` },
                body: JSON.stringify({ userId: currentUser, action: "listContexts" }) });
            const statusData = await statusResponse.json();
            const context = statusData.contexts?.find((c: { id: string }) => c.id === contextId);
            if (context?.processing_status === "completed") return { ok: true };
            if (context?.processing_status === "failed") return { ok: false, error: context.error_message || "Errore durante l'elaborazione del PDF." };
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          return { ok: false, error: "Timeout durante l'elaborazione del PDF." };
        };

        for (const { file, contextId } of fileContextMap) {
          setGenerationStep("processing");

          const imagePromise = renderAndUploadPageImages(file, contextId, authenticatedUserId);
          const processingResult = await waitForContextProcessing(contextId);
          if (!processingResult.ok) {
            toast({ title: "Elaborazione incompleta", description: processingResult.error, variant: "destructive" });
            continue;
          }

          const figures = await imagePromise;
          if (figures.length > 0) {
            await attachImagesToContext(contextId, figures);
          } else {
            console.log("No figures found in PDF - proceeding without images");
          }

          

          setGenerationStep("generating");
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
            { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForLessons}` },
              body: JSON.stringify({ userId: currentUser, contextId }) });
        }

        setGenerationStep("complete");
        await new Promise(resolve => setTimeout(resolve, 1500));
        const latestContextId = uploadedContextIds.at(-1);
        onUpload(uploadedFileInfos, latestContextId); setSelectedFiles([]); setGenerationStep("idle"); onOpenChange(false);
        toast({ title: "Contenuti pronti! 🎉", description: "Le mini-lezioni sono state generate. Buono studio!" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
      setGenerationStep("idle");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (contextId: string) => { onSelectFile?.(contextId); onOpenChange(false); };
  const handleFileDeleted = () => { onFileDeleted?.(); };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStepProgress = () => {
    switch (generationStep) { case "uploading": return 25; case "searching": return 33; case "processing": return 50; case "generating": return 75; case "complete": return 100; default: return 0; }
  };
  const getStepLabel = () => {
    switch (generationStep) { case "uploading": return "Caricamento file..."; case "searching": return "Ricerca sul web..."; case "processing": return "Estrazione testo..."; case "generating": return "Generazione lezioni..."; case "complete": return "Completato!"; default: return ""; }
  };

  if (generationStep !== "idle") {
    const isWebFlow = generationStep === "searching" || isSearching;
    const progressSteps = isWebFlow
      ? [
          { step: "searching", label: "Ricerca", icon: Globe },
          { step: "generating", label: "AI", icon: Sparkles },
          { step: "complete", label: "Fatto", icon: Check },
        ]
      : [
          { step: "uploading", label: "Upload", icon: FileUp },
          { step: "processing", label: "Analisi", icon: FileText },
          { step: "generating", label: "AI", icon: Sparkles },
          { step: "complete", label: "Fatto", icon: Check },
        ];
    const stepOrder = progressSteps.map(s => s.step);

    return (
      <Sheet open={open} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="rounded-t-xl pb-safe h-auto bg-surface-container-high border-t border-outline-variant">
          <SheetDescription className="sr-only">Stato di avanzamento del caricamento e della generazione delle mini-lezioni</SheetDescription>
          <div className="py-8 px-4">
            <div className="flex flex-col items-center text-center mb-8">
              <div className={cn(
                "w-20 h-20 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 shadow-level-3",
                generationStep === "complete" ? "bg-success-container animate-bounce-in" : "bg-primary animate-pulse-soft"
              )}>
                {generationStep === "complete" ? (
                  <Check className="w-10 h-10 text-success animate-pop" />
                ) : generationStep === "searching" ? (
                  <Globe className="w-10 h-10 text-primary-foreground animate-wiggle" />
                ) : (
                  <Sparkles className="w-10 h-10 text-primary-foreground animate-wiggle" />
                )}
              </div>
              <h3 className="font-display text-xl font-bold mb-2 animate-fade-up">
                {generationStep === "complete" ? "Tutto pronto!" : generationStep === "searching" ? "Ricerca in corso..." : "Preparazione contenuti"}
              </h3>
              <p className="text-muted-foreground body-medium max-w-xs">{currentFileName}</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="label-large">{getStepLabel()}</span>
                <span className="text-primary label-large">{getStepProgress()}%</span>
              </div>
              <div className="h-3 m3-progress-track">
                <div
                  className={cn("h-full m3-progress-indicator transition-all duration-700", generationStep === "complete" && "bg-success")}
                  style={{ width: `${getStepProgress()}%`, backgroundColor: generationStep === "complete" ? `hsl(var(--success))` : undefined }}
                />
              </div>
            </div>

            <div className={cn("grid gap-2", `grid-cols-${progressSteps.length}`)}>
              {progressSteps.map(({ step, label, icon: Icon }, i) => {
                const currentIndex = stepOrder.indexOf(generationStep);
                const stepIndex = stepOrder.indexOf(step);
                const isActive = step === generationStep;
                const isComplete = stepIndex < currentIndex;
                return (
                  <div key={step} className={`flex flex-col items-center animate-fade-up animate-stagger-${i + 1}`}>
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-500",
                      isActive && "bg-primary text-primary-foreground scale-110 shadow-level-2 animate-pop",
                      isComplete && "bg-success-container text-success",
                      !isActive && !isComplete && "bg-surface-container-highest text-muted-foreground"
                    )}>
                      <Icon className={cn("w-5 h-5", isActive && step !== "complete" && "animate-pulse-soft")} />
                    </div>
                    <span className={cn("label-small", isActive && "text-primary", isComplete && "text-success", !isActive && !isComplete && "text-muted-foreground")}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe max-h-[85vh] bg-surface-container-high border-t border-outline-variant flex flex-col overflow-hidden">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display text-xl">I tuoi materiali</SheetTitle>
          <SheetDescription className="sr-only">Carica PDF, immagini o contenuti web per generare mini-lezioni</SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={handleMainTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4 p-1.5 h-13 bg-surface-container-highest rounded-xl">
            <TabsTrigger value="loading" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-level-1 transition-all duration-300 text-xs">
              Caricamento
            </TabsTrigger>
            <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-tertiary data-[state=active]:text-tertiary-foreground data-[state=active]:shadow-level-1 transition-all duration-300 text-xs">
              Gestisci
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loading" className="flex-1 mt-0 overflow-hidden">
            <Tabs value={loadingTab} onValueChange={setLoadingTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <TabsContent value="menu" className="flex-1 overflow-y-auto mt-0 pb-4">
                <div className="space-y-4">
                  <p className="body-medium text-muted-foreground text-center">
                    Scegli come vuoi caricare i tuoi materiali
                  </p>
                  <div className="grid gap-3">
                    <Button type="button" onClick={() => setLoadingTab("upload")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Carica PDF</p>
                        <p className="body-small text-muted-foreground">Appunti, dispense o documenti</p>
                      </div>
                    </Button>
                    <Button type="button" onClick={() => setLoadingTab("photos")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40">
                      <Camera className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Carica foto</p>
                        <p className="body-small text-muted-foreground">Scatta o scegli immagini</p>
                      </div>
                    </Button>
                    <Button type="button" onClick={() => setLoadingTab("web")} variant="outline" className="h-16 justify-start gap-3 rounded-xl bg-surface-container border-outline-variant hover:bg-primary-container/40">
                      <Globe className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Ricerca web</p>
                        <p className="body-small text-muted-foreground">Genera lezioni da un argomento</p>
                      </div>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="flex-1 overflow-y-auto space-y-4 mt-0 pb-4">
            <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Torna a Caricamento
            </Button>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-500",
                dragActive ? "border-primary bg-primary-container scale-[1.02] shadow-level-2" : "border-outline-variant hover:border-primary/40 hover:bg-surface-container-low",
                isUploading && "pointer-events-none opacity-50"
              )}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input type="file" accept=".pdf" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-level-2 animate-float">
                <FileUp className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="font-display font-semibold text-lg mb-1">Trascina qui i tuoi PDF</p>
              <p className="body-small text-muted-foreground">oppure tocca per selezionare (max 100MB)</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2 animate-fade-up">
                <h3 className="label-medium text-muted-foreground">File selezionati ({selectedFiles.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
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

            <div className="sticky bottom-0 bg-surface-container-high/95 backdrop-blur-sm pt-3 pb-2 -mx-1 px-1 mt-auto">
              <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading} className="w-full h-14 text-base" size="lg">
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Caricamento...</>
                ) : selectedFiles.length > 0 ? (
                  <><Sparkles className="w-5 h-5 mr-2" />Carica e genera lezioni</>
                ) : ("Seleziona file da caricare")}
              </Button>
              <p className="body-small text-muted-foreground text-center mt-2">✨ Ogni PDF creerà un percorso di studio personalizzato</p>
            </div>
              </TabsContent>

              <TabsContent value="photos" className="flex-1 overflow-y-auto space-y-4 mt-0 pb-4">
            <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Torna a Caricamento
            </Button>
            <div className="relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-500 border-outline-variant hover:border-primary/40 hover:bg-surface-container-low">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading || selectedImages.length >= MAX_IMAGES}
              />
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-level-2 animate-float">
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
                        className="absolute top-1 right-1 w-7 h-7 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
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

            <div className="sticky bottom-0 bg-surface-container-high/95 backdrop-blur-sm pt-3 pb-2 -mx-1 px-1 mt-auto">
              <Button onClick={handleUploadImages} disabled={selectedImages.length === 0 || isUploading} className="w-full h-14 text-base" size="lg">
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Elaborazione...</>
                ) : selectedImages.length > 0 ? (
                  <><Sparkles className="w-5 h-5 mr-2" />Analizza {selectedImages.length} foto e genera lezioni</>
                ) : ("Seleziona le foto da analizzare")}
              </Button>
              <p className="body-small text-muted-foreground text-center mt-2">📸 L'AI estrarrà il testo e creerà le lezioni</p>
            </div>
              </TabsContent>

              <TabsContent value="web" className="flex-1 overflow-y-auto space-y-5 mt-0 pb-4">
            <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Torna a Caricamento
            </Button>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto shadow-level-2">
                <Globe className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-lg">Cerca un argomento</p>
                <p className="body-small text-muted-foreground">L'AI cercherà sul web e creerà un percorso di studio completo</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={webTopic}
                  onChange={(e) => setWebTopic(e.target.value)}
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
                {isSearching ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Ricerca in corso...</>
                ) : (
                  <><Globe className="w-5 h-5 mr-2" />Cerca e genera lezioni</>
                )}
              </Button>

              <p className="body-small text-muted-foreground text-center">
                🔍 Powered by ricerca AI avanzata
              </p>
            </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="manage" className="mt-0">
            <FileManager onFileDeleted={handleFileDeleted} onSelectFile={handleFileSelect} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
