-- 🖼️ P24 — Aggiunge il campo cover_image_url alla tabella study_contexts
-- (immagine di copertina del corso, recuperata da Wikipedia).
-- Il campo è OPZIONALE: le card mostrano il fallback a gradiente se assente.

ALTER TABLE public.study_contexts
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN public.study_contexts.cover_image_url IS
  'URL della thumbnail di copertina del corso (Wikipedia PageImages). NULL se non disponibile.';
