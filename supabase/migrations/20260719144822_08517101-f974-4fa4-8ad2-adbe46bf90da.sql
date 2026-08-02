UPDATE public.evaluations
SET topic_id = NULL
WHERE topic_id IS NOT NULL
  AND topic_id NOT IN (SELECT id FROM public.study_contexts);

ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_topic_id_fkey;

ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_topic_id_fkey
  FOREIGN KEY (topic_id)
  REFERENCES public.study_contexts(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.evaluations.topic_id IS
  'Corso collegato alla scadenza (id di study_contexts), scelto nel modulo evento. NULL = argomento libero.';