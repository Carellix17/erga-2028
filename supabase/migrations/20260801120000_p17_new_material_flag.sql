-- 📦 P17: il cartellino "c'è materiale nuovo non ancora nelle lezioni".
-- Si accende quando aggiungi (o togli) file a un percorso esistente,
-- si spegne quando rigeneri il percorso.
alter table public.study_contexts
  add column if not exists new_material_pending boolean not null default false;
