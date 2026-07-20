import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { renderPdfPagesRangeAsBase64, renderPdfPageCropsAsBase64 } from "@/lib/pdfPageRenderer";
import { edgeFetch } from "@/lib/edgeFetch";

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

// Serialize all figure-extraction calls to avoid hammering the edge runtime
// (which returns 503 SUPABASE_EDGE_RUNTIME_ERROR when too many concurrent
// invocations of the same heavy function pile up). Pre-fetch + current
// lesson would otherwise fire in parallel.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.catch(() => undefined);
  return next;
}

// Risposte possibili delle tre fasi di extract-lesson-figures (tipizzazione
// onesta: niente più "any" preesistenti, ripuliti durante il passaggio di P6).
interface DetectedBox {
  pageNum: number;
  figureIndex: number;
  bbox: { x: number; y: number; width: number; height: number };
  description: string;
}

interface ExtractFiguresResponse {
  figures?: LessonFigure[];
  needPages?: { startPage: number; endPage: number };
  detectedBoxes?: DetectedBox[];
}

async function invokeWithRetry(body: Record<string, unknown>): Promise<{ data: ExtractFiguresResponse | null; error: unknown }> {
  try {
    const data = await edgeFetch<ExtractFiguresResponse>("extract-lesson-figures", body);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

async function loadFiguresFor(lessonId: string): Promise<LessonFigure[]> {
  if (figuresCache.has(lessonId)) return figuresCache.get(lessonId)!;
  if (inflight.has(lessonId)) return inflight.get(lessonId)!;

  const promise = (async () => {
    // Phase 1: probe
    const { data, error: fnErr } = await enqueue(() => invokeWithRetry({ lessonId }));
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

      const { data: dataDet, error: fnErr2 } = await enqueue(() =>
        invokeWithRetry({ lessonId, pages }),
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

      // 🚚 P6 — ritaglio in batteria: il PDF viene aperto UNA volta sola per
      // tutte le figure (prima si riapriva da capo per ogni riquadro).
      const cropResults = await renderPdfPageCropsAsBase64(
        pdfBytes,
        detectedBoxes.map((d) => ({ pageNum: d.pageNum, bbox: d.bbox })),
      );
      const crops: {
        pageNum: number;
        figureIndex: number;
        bbox: { x: number; y: number; width: number; height: number };
        description: string;
        b64Crop: string;
      }[] = [];
      detectedBoxes.forEach((det, i) => {
        const r = cropResults[i];
        if (r && r.b64Crop) crops.push({ ...det, b64Crop: r.b64Crop });
      });
      if (crops.length === 0) return [];

      const { data: dataUp, error: fnErr3 } = await enqueue(() =>
        invokeWithRetry({ lessonId, crops }),
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
        // Figure extraction is non-critical: log but don't surface to UI.
        // The lesson itself works fine without [FIG:N] markers.
        console.warn("useLessonFigures (non-blocking):", err);
        setError(null);
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
