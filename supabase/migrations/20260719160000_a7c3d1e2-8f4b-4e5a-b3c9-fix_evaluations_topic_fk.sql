-- ============================================================
-- FIX: "Da corso" nelle verifiche/compiti non si salvava mai
-- ------------------------------------------------------------
-- Il modulo eventi collega la scadenza a un CORSO intero
-- (tabella study_contexts), ma la chiave esterna di
-- evaluations.topic_id puntava a mini_lessons(id): ogni
-- salvataggio falliva con errore di vincolo.
-- Deciso col prodotto: il collegamento e' al CORSO INTERO
-- (la verifica copre tutto il materiale, non una singola lezione).
-- ============================================================

-- 1) Pulizia difensiva: eventuali topic_id rimasti che non sono
--    corsi validi vengono svuotati (NULL = nessun argomento collegato),
--    cosi' il nuovo vincolo non fallisce mai.
UPDATE public.evaluations
SET topic_id = NULL
WHERE topic_id IS NOT NULL
  AND topic_id NOT IN (SELECT id FROM public.study_contexts);

-- 2) Riallinea la chiave esterna: topic_id ora punta a study_contexts
ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_topic_id_fkey;

ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_topic_id_fkey
  FOREIGN KEY (topic_id)
  REFERENCES public.study_contexts(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.evaluations.topic_id IS
  'Corso collegato alla scadenza (id di study_contexts), scelto nel modulo evento. NULL = argomento libero.';
