alter table public.study_contexts
  add column if not exists new_material_pending boolean not null default false;