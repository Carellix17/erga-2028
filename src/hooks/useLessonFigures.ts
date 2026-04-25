import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { renderPdfPagesRangeAsBase64, renderPdfPageCropAsBase64 } from "@/lib/pdfPageRenderer";

export interface LessonFigure {
  id: string;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  url: string;
  description: string;
}

// In-memory cache shared across hook instances (per session) so that
// pre-fetching a lesson's figures (e.g. while the user is on lesson N)
// makes them instantly available when they open lesson N+1.
const figuresCache = new Map<string, LessonFigure[]>();
const inflight = new Map<string, Promise<LessonFigure[]>>();

async function loadFiguresFor(lessonId: string): Promise<LessonFigure[]> {
  if (figuresCache.has(lessonId)) return figuresCache.get(lessonId)!;
  if (inflight.has(lessonId)) return inflight.get(lessonId)!;

  const promise = (async () => {
    // Phase 1: probe
    const { data, error: fnErr } = await supabase.functions.invoke("extract-lesson-figures", {
      body: { lessonId },
    });
    if (fnErr) throw fnErr;

    let figs = Array.isArray(data?.figures) ? (data.figures as LessonFigure[]) : [];
    const needPages = data?.needPages as { startPage: number; endPage: number } | undefined;

    if (figs.length === 0 && needPages) {
      const { data: lessonRow } = await supabase
        .from("mini_lessons")
        .select("context_id")
        .eq("id", lessonId)
        .maybeSingle();
      if (!lessonRow?.context_id) return [];
      const { data: ctx } = await supabase
        .from("study_contexts")
        .select("file_path")
        .eq("id", lessonRow.context_id)
        .maybeSingle();
      if (!ctx?.file_path || !ctx.file_path.toLowerCase().endsWith(".pdf")) return [];
      const { data: blob, error: dlErr } = await supabase.storage
        .from("study-pdfs")
        .download(ctx.file_path);
      if (dlErr || !blob) throw dlErr || new Error("PDF download failed");
      const pdfBytes = new Uint8Array(await blob.arrayBuffer());

      const pages = await renderPdfPagesRangeAsBase64(pdfBytes, needPages.startPage, needPages.endPage);
      if (pages.length === 0) return [];

      const { data: dataDet, error: fnErr2 } = await supabase.functions.invoke(
        "extract-lesson-figures",
        { body: { lessonId, pages } },
      );
      if (fnErr2) throw fnErr2;

      const detectedBoxes = Array.isArray(dataDet?.detectedBoxes)
        ? (dataDet.detectedBoxes as {
            pageNum: number;
            figureIndex: number;
            bbox: { x: number; y: number; width: number; height: number };
            description: string;
          }[])
        : [];
      if (detectedBoxes.length === 0) return [];

      const crops: {
        pageNum: number;
        figureIndex: number;
        bbox: { x: number; y: number; width: number; height: number };
        description: string;
        b64Crop: string;
      }[] = [];
      for (const det of detectedBoxes) {
        const b64Crop = await renderPdfPageCropAsBase64(pdfBytes, det.pageNum, det.bbox);
        if (!b64Crop) continue;
        crops.push({ ...det, b64Crop });
      }
      if (crops.length === 0) return [];

      const { data: dataUp, error: fnErr3 } = await supabase.functions.invoke(
        "extract-lesson-figures",
        { body: { lessonId, crops } },
      );
      if (fnErr3) throw fnErr3;
      figs = Array.isArray(dataUp?.figures) ? (dataUp.figures as LessonFigure[]) : [];
    }

    figuresCache.set(lessonId, figs);
    return figs;
  })().finally(() => {
    inflight.delete(lessonId);
  });

  inflight.set(lessonId, promise);
  return promise;
}

/**
 * Fire-and-forget pre-fetch. Use this to warm the cache (and trigger
 * physical crop+upload) for lessons the user hasn't opened yet, so the
 * gallery + [FIG:N] markers appear instantly when they get there.
 */
export function prefetchLessonFigures(lessonId: string | null | undefined) {
  if (!lessonId || figuresCache.has(lessonId) || inflight.has(lessonId)) return;
  loadFiguresFor(lessonId).catch((err) => {
    console.warn("prefetchLessonFigures failed for", lessonId, err);
  });
}

/**
 * Loads (and lazily extracts) figure crops for a lesson — STRATEGY A.
 * Uses a session-level cache so prefetched figures appear instantly.
 */
export function useLessonFigures(lessonId: string | null | undefined) {
  const [figures, setFigures] = useState<LessonFigure[]>(() =>
    lessonId && figuresCache.has(lessonId) ? figuresCache.get(lessonId)! : [],
  );
  const [loading, setLoading] = useState<boolean>(() => !!lessonId && !figuresCache.has(lessonId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setFigures([]);
      setLoading(false);
      return;
    }

    if (figuresCache.has(lessonId)) {
      setFigures(figuresCache.get(lessonId)!);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const figs = await loadFiguresFor(lessonId);
        if (cancelled) return;
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
