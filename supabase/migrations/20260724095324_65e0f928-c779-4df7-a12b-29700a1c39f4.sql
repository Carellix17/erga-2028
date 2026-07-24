alter table public.user_profiles
  add column if not exists last_studio_context_id uuid;

comment on column public.user_profiles.last_studio_context_id
  is 'P10a: segnalibro "ultimo percorso visto" in Studio (study_contexts.id). Sync fra dispositivi.';