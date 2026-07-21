-- 🗂️ Pacco P7 — la chat che cresce: chat per argomento + verbali dei quiz
--
-- 1) CHAT PER ARGOMENTO (stile NotebookLM):
--    ogni conversazione può appartenere a UN documento di studio e avere un
--    "contratto di lavoro" su misura, scritto dall'AI al suo primo avvio.
--    context_id nullo = la chat generale "Tutti i materiali" (quella storica).
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS context_id uuid REFERENCES public.study_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic_title text,
  ADD COLUMN IF NOT EXISTS system_prompt text;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_context
  ON public.chat_conversations(context_id);

-- 2) CRONOLOGIA ESERCIZI: ogni quiz completato lascia un verbale con
--    punteggio e dettaglio domanda-per-domanda (con la spiegazione dell'errore,
--    così il ripasso futuro sa già dove hai inciampato).
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  context_id uuid REFERENCES public.study_contexts(id) ON DELETE SET NULL,
  title text NOT NULL,
  score int NOT NULL,
  total int NOT NULL,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz results" ON public.quiz_results
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Users can insert own quiz results" ON public.quiz_results
  FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Users can delete own quiz results" ON public.quiz_results
  FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

CREATE INDEX idx_quiz_results_user ON public.quiz_results(user_id, created_at DESC);