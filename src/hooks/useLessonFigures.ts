import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LessonFigure {
  id: string;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  url: string;
  description: string;
}

/**
 * Loads (and lazily extracts) figure crops for a lesson.
 * On first call, the edge function renders pages, runs Vision and caches results.
 * Subsequent calls hit the cache and return instantly.
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
        const { data, error: fnErr } = await supabase.functions.invoke("extract-lesson-figures", {
          body: { lessonId },
        });
        if (cancelled) return;
        if (fnErr) throw fnErr;
        const figs = Array.isArray(data?.figures) ? data.figures as LessonFigure[] : [];
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

    return () => { cancelled = true; };
  }, [lessonId]);

  return { figures, loading, error };
}
