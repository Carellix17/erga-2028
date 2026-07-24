-- 🏷️ P11d: titoli parlanti dei MODULI di lezione (2-5 parole, inventati dall'AI
-- alla generazione del percorso, es. "Le basi della cellula").
-- Indice 0-based: module_titles[0] = titolo del modulo delle lezioni 0-3, ecc.
-- I percorsi nati prima di questa colonna derivano il titolo dalla prima
-- lezione del modulo, lato client: nessun backfill necessario.

alter table public.study_contexts
  add column if not exists module_titles text[];

comment on column public.study_contexts.module_titles
  is 'P11d: titoli AI dei moduli (0-based come il modulo). Fallback client: titolo della prima lezione del modulo.';
