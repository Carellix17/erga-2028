import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { renderPdfPagesRangeAsBase64, renderPdfPageCropAsBase64 } from "@/lib/pdfPageRenderer";

export interface LessonFigure {
  id: string;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  url: string;
  description: string;
}

/**
 * Loads (and lazily extracts) figure crops for a lesson — STRATEGY A.
 *
 * Three-phase flow with the edge function:
 *  1) PROBE: send only lessonId. Cache hit → return. Otherwise we get
 *     needPages: { startPage, endPage }.
 *  2) DETECTION: client downloads the PDF, renders the requested page range
 *     and sends FULL pages to Vision. Edge function returns detectedBoxes.
 *  3) CROP & UPLOAD: client physically crops each bbox via Canvas (no Deno
 *     image lib involved!) and uploads the real cropped JPEGs to the edge
 *     function, which stores them in study-images and inserts the rows.
 */
export function useLessonFigures(lessonId: string | null | undefined) {
  const [figures, setFigures] = useState<LessonFigure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setFigures([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Phase 1: cache probe
        const { data, error: fnErr } = await supabase.functions.invoke("extract-lesson-figures", {
          body: { lessonId },
        });
        if (cancelled) return;
        if (fnErr) throw fnErr;

        let figs = Array.isArray(data?.figures) ? (data.figures as LessonFigure[]) : [];
        const needPages = data?.needPages as { startPage: number; endPage: number } | undefined;

        if (figs.length === 0 && needPages) {
          // === Resolve PDF path ===
          const { data: lessonRow } = await supabase
            .from("mini_lessons")
            .select("context_id")
            .eq("id", lessonId)
            .maybeSingle();
          if (!lessonRow?.context_id) {
            setFigures([]);
            return;
          }
          const { data: ctx } = await supabase
            .from("study_contexts")
            .select("file_path")
            .eq("id", lessonRow.context_id)
            .maybeSingle();
          if (!ctx?.file_path || !ctx.file_path.toLowerCase().endsWith(".pdf")) {
            setFigures([]);
            return;
          }
          const { data: blob, error: dlErr } = await supabase.storage
            .from("study-pdfs")
            .download(ctx.file_path);
          if (dlErr || !blob) throw dlErr || new Error("PDF download failed");
          const pdfBytes = new Uint8Array(await blob.arrayBuffer());

          // === Phase 2: render full pages → Vision detection ===
          const pages = await renderPdfPagesRangeAsBase64(
            pdfBytes,
            needPages.startPage,
            needPages.endPage,
          );
          if (cancelled) return;
          if (pages.length === 0) {
            setFigures([]);
            return;
          }

          const { data: dataDet, error: fnErr2 } = await supabase.functions.invoke(
            "extract-lesson-figures",
            { body: { lessonId, pages } },
          );
          if (cancelled) return;
          if (fnErr2) throw fnErr2;

          const detectedBoxes = Array.isArray(dataDet?.detectedBoxes)
            ? (dataDet.detectedBoxes as {
                pageNum: number;
                figureIndex: number;
                bbox: { x: number; y: number; width: number; height: number };
                description: string;
              }[])
            : [];

          if (detectedBoxes.length === 0) {
            setFigures([]);
            return;
          }

          // === Phase 3: physical crop in browser Canvas ===
          const crops: {
            pageNum: number;
            figureIndex: number;
            bbox: { x: number; y: number; width: number; height: number };
            description: string;
            b64Crop: string;
          }[] = [];

          for (const det of detectedBoxes) {
            const b64Crop = await renderPdfPageCropAsBase64(pdfBytes, det.pageNum, det.bbox);
             if (!b64Crop) {
               console.warn("Figure crop failed", { lessonId, pageNum: det.pageNum, bbox: det.bbox });
               continue;
             }
            crops.push({
              pageNum: det.pageNum,
              figureIndex: det.figureIndex,
              bbox: det.bbox,
              description: det.description,
              b64Crop,
            });
          }
          if (cancelled) return;
          if (crops.length === 0) {
             setError("Figure rilevate, ma ritaglio non riuscito");
            setFigures([]);
            return;
          }

          // === Send the real crops back for upload + DB persistence ===
          const { data: dataUp, error: fnErr3 } = await supabase.functions.invoke(
            "extract-lesson-figures",
            { body: { lessonId, crops } },
          );
          if (cancelled) return;
          if (fnErr3) throw fnErr3;
          figs = Array.isArray(dataUp?.figures) ? (dataUp.figures as LessonFigure[]) : [];
        }

        setFigures(figs);
      } catch (err) {
        if (cancelled) return;
        console.error("useLessonFigures error:", err);
        setError(err instanceof Error ? err.message : "Errore");
        setFigures([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  return { figures, loading, error };
}
