alter table public.study_contexts
  add column if not exists module_titles text[];

comment on column public.study_contexts.module_titles
  is 'P11d: titoli AI dei moduli (0-based come il modulo). Fallback client: titolo della prima lezione del modulo.';