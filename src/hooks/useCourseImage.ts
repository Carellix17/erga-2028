import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cleanSubjectTitleForSearch } from "@/lib/courseTitle";
import { fetchCourseImage } from "@/lib/wikipediaImage";

/**
 * 🖼️ P24 — HOOK CENTRALIZZATO per l'immagine di copertina di un corso.
 *
 * Ordine di risoluzione (prima la fonte più affidabile):
 * 1. `cover_image_url` su Supabase (se la colonna esiste e c'è un valore);
 * 2. cache locale `localStorage['course_img_' + courseId]` (evita chiamate ripetute);
 * 3. chiamata asincrona a Wikipedia (titolo pulito con cleanSubjectTitleForSearch),
 *    con salvataggio su localStorage e (best-effort) su Supabase.
 *
 * NON blocca mai la UI: restituisce `coverUrl` che può essere null.
 * Non dipende da useAuth (la sessione si legge via supabase.auth.getSession,
 * quindi funziona anche in test/contesti senza provider).
 */
export function useCourseImage(courseId: string | null | undefined, subjectTitle: string) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !subjectTitle) return;
    let alive = true;

    const resolve = async () => {
      // 1) Supabase (colonna cover_image_url) — best-effort
      try {
        const { data } = await supabase
          .from("study_contexts")
          .select("cover_image_url")
          .eq("id", courseId)
          .maybeSingle();
        if (!alive) return;
        if (data?.cover_image_url) {
          setCoverUrl(data.cover_image_url);
          return;
        }
      } catch {
        // colonna non presente / errore: si prosegue
      }

      // 2) cache locale
      let cached: string | null = null;
      try {
        cached = localStorage.getItem("course_img_" + courseId);
      } catch {
        /* storage non disponibile */
      }
      if (cached) {
        setCoverUrl(cached);
        return;
      }

      // 3) Wikipedia (async, mai bloccante)
      const title = cleanSubjectTitleForSearch(subjectTitle);
      if (!title) return;
      const url = await fetchCourseImage(title);
      if (!alive) return;
      if (url) {
        setCoverUrl(url);
        try {
          localStorage.setItem("course_img_" + courseId, url);
        } catch {
          /* storage non disponibile */
        }
        // best-effort: aggiorna Supabase (solo se autenticato)
        try {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.user) {
            await supabase
              .from("study_contexts")
              .update({ cover_image_url: url })
              .eq("id", courseId);
          }
        } catch {
          /* fallisce in silenzio */
        }
      }
    };

    void resolve();
    return () => {
      alive = false;
    };
  }, [courseId, subjectTitle]);

  return coverUrl;
}
