import { useState, useCallback } from "react";
import { FileUp, X, FileText, Loader2, Brain, Globe, Search, Camera, ImageIcon, ChevronLeft } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileManager } from "./FileManager";
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";


interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: { name: string; size: number }[], contextId?: string) => void;
  uploadedFiles: { name: string; size: number }[];
  onSelectFile?: (contextId: string) => void;
  onFileDeleted?: () => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles, onSelectFile, onFileDeleted }: UploadSheetProps) {
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

  const handleWebSearch = async () => {
    if (!webTopic.trim() || !currentUser) return;
    setIsSearching(true);
    setUploadStatus("Ricerca sul web...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const searchResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, topic: webTopic.trim(), language: currentLanguage() }),
        }
      );
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(searchData.error || "Errore nella ricerca");

      const contextId = searchData.contextId;

      onUpload([{ name: `🌐 ${webTopic}`, size: searchData.contentLength || 0 }], contextId);
      setWebTopic("");
      onOpenChange(false);
      toast({ title: "Contenuto trovato! 🌐", description: "Ora puoi generare le lezioni dal tab Studio." });
    } catch (error) {
      console.error("Web search error:", error);
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

      for (const file of selectedFiles) {
        setUploadStatus(`Caricamento ${file.name}...`);
        if (file.size > MAX_FILE_SIZE) {
          toast({ title: "File troppo grande", description: `${file.name} supera il limite di 100MB`, variant: "destructive" });
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", currentUser);

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
        toast({ title: "File caricato! 📄", description: "Vai su Studio per generare le lezioni." });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleFileSelect = (contextId: string) => { onSelectFile?.(contextId); onOpenChange(false); };
  const handleFileDeleted = () => { onFileDeleted?.(); };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={open} onOpenChange={isUploading ? () => {} : onOpenChange}>
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

              <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-0">
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
                  <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")} disabled={isUploading}>
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

              <TabsContent value="photos" className="flex-1 overflow-y-auto space-y-4 mt-0 pb-4">
                <Button type="button" variant="ghost" className="w-fit px-2 -ml-1" onClick={() => setLoadingTab("menu")} disabled={isUploading}>
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
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{uploadStatus || "Elaborazione..."}</>
                    ) : selectedImages.length > 0 ? (
                      <><FileUp className="w-5 h-5 mr-2" />Carica {selectedImages.length} foto</>
                    ) : ("Seleziona le foto da analizzare")}
                  </Button>
                  <p className="body-small text-muted-foreground text-center mt-2">📸 Dopo il caricamento potrai generare le lezioni</p>
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
                    <p className="body-small text-muted-foreground">L'AI cercherà sul web e preparerà i contenuti</p>
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
                      <><Globe className="w-5 h-5 mr-2" />Cerca argomento</>
                    )}
                  </Button>

                  <p className="body-small text-muted-foreground text-center">
                    🔍 Dopo la ricerca potrai generare le lezioni
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
