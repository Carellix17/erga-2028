-- 🅐 FONDAMENTA — memoria di studio.
-- Estende la tabella lesson_progress (una riga per utente + percorso) con:
--   · completed_lessons: le lezioni completate davvero, nella forma
--     [ {"order": 3, "at": "2026-10-03T14:00:00Z", "correct": 2, "total": 4}, ... ]
--     (order = lesson_order; sostituito se la lezione viene rifatta)
--   · final_test: esito dell'ULTIMO test finale del percorso, nella forma
--     { "score": 80, "correct": 8, "total": 10, "at": "2026-10-03T15:00:00Z" }
-- Le righe esistenti partono con l'elenco vuoto: nessun dato inventato,
-- nessun comportamento cambiato per i percorsi già iniziati.
-- La scrittura avviene solo attraverso l'edge function get-lessons
-- (client privilegiato + verifica dell'utente), come tutto il resto.

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_test JSONB;
