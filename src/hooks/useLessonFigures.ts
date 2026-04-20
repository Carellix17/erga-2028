import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { renderPdfPagesRangeAsBase64 } from "@/lib/pdfPageRenderer";

export interface LessonFigure {
  id: string;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  url: string;
  description: string;
}

/**
 * Loads (and lazily extracts) figure crops for a lesson.
 *
 * Two-phase flow:
 *  1) Call edge function with just lessonId. If cache hit → return.
 *     Otherwise it returns `needPages: { startPage, endPage }`.
 *  2) Client downloads PDF, renders that page range to JPEG base64,
 *     calls the edge function again with the rendered pages.
 *     Edge function runs Vision, uploads pages, caches in lesson_figures.
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
          // Phase 2: render pages client-side and resend
          // Get PDF path from the lesson's context
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

          const bytes = new Uint8Array(await blob.arrayBuffer());
          const pages = await renderPdfPagesRangeAsBase64(
            bytes,
            needPages.startPage,
            needPages.endPage,
          );
          if (cancelled) return;
          if (pages.length === 0) {
            setFigures([]);
            return;
          }

          const { data: data2, error: fnErr2 } = await supabase.functions.invoke(
            "extract-lesson-figures",
            { body: { lessonId, pages } },
          );
          if (cancelled) return;
          if (fnErr2) throw fnErr2;
          figs = Array.isArray(data2?.figures) ? (data2.figures as LessonFigure[]) : [];
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
