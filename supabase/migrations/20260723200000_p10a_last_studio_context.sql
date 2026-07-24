-- 🧭 P10a: l'app si ricorda (nel cloud) l'ultimo PERCORSO VISTO in Studio,
-- non solo l'ultimo generato. Segnalibro condiviso fra tutti i dispositivi.
--
-- Punta a study_contexts.id del percorso aperto per ultimo.
-- Nessuna FK voluta: se il percorso viene eliminato, il segnalibro resta un
-- semplice id "scaduto" che il client ignora e sovrascrive al prossimo giro.

alter table public.user_profiles
  add column if not exists last_studio_context_id uuid;

comment on column public.user_profiles.last_studio_context_id
  is 'P10a: segnalibro "ultimo percorso visto" in Studio (study_contexts.id). Sync fra dispositivi.';
