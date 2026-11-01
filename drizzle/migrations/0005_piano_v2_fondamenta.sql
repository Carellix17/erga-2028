-- A. study_events: L-1 della v2 + campi slot (R-1)
ALTER TABLE public.study_events
  ADD COLUMN IF NOT EXISTS notes          text        NULL,
  ADD COLUMN IF NOT EXISTS end_time       text        NULL,
  ADD COLUMN IF NOT EXISTS is_completed   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status         text        NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS completed_at   timestamptz NULL,
  ADD COLUMN IF NOT EXISTS context_id     uuid        NULL REFERENCES public.study_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lesson_from    integer     NULL,
  ADD COLUMN IF NOT EXISTS lesson_to      integer     NULL,
  ADD COLUMN IF NOT EXISTS evaluation_id  uuid        NULL REFERENCES public.evaluations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source         text        NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS original_date  date        NULL,
  ADD COLUMN IF NOT EXISTS original_time  text        NULL,
  ADD COLUMN IF NOT EXISTS move_count     integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version        integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.study_events
  ADD CONSTRAINT study_events_end_time_format CHECK (end_time IS NULL OR end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT study_events_original_time_format CHECK (original_time IS NULL OR original_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT study_events_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
  ADD CONSTRAINT study_events_status_check CHECK (status IN ('planned','done','partial','skipped')),
  ADD CONSTRAINT study_events_source_check CHECK (source IN ('manual','auto','replan','ai')),
  ADD CONSTRAINT study_events_lessons_range CHECK (
    (lesson_from IS NULL AND lesson_to IS NULL) OR
    (lesson_from IS NOT NULL AND lesson_to IS NOT NULL AND lesson_from >= 0 AND lesson_to >= lesson_from));
CREATE INDEX IF NOT EXISTS study_events_user_date_idx ON public.study_events (user_id, event_date);

-- B. Impostazioni del piano (R-10, R-14)
CREATE TABLE IF NOT EXISTS public.planner_settings (
  user_id              text PRIMARY KEY,
  lessons_per_block    integer NOT NULL DEFAULT 3  CHECK (lessons_per_block BETWEEN 1 AND 6),
  short_break_min      integer NOT NULL DEFAULT 5  CHECK (short_break_min BETWEEN 3 AND 15),
  medium_break_min     integer NOT NULL DEFAULT 10 CHECK (medium_break_min BETWEEN 5 AND 20),
  long_break_min       integer NOT NULL DEFAULT 20 CHECK (long_break_min BETWEEN 10 AND 40),
  max_block_min        integer NOT NULL DEFAULT 50 CHECK (max_block_min BETWEEN 20 AND 90),
  daily_limit_school_min  integer NOT NULL DEFAULT 180 CHECK (daily_limit_school_min BETWEEN 30 AND 480),
  daily_limit_free_min    integer NOT NULL DEFAULT 300 CHECK (daily_limit_free_min BETWEEN 30 AND 600),
  ask_before_move      boolean NOT NULL DEFAULT false,
  sound_enabled        boolean NOT NULL DEFAULT true,
  notify_types         jsonb   NOT NULL DEFAULT '{"slot_start":true,"pomodoro":true,"overrun":true,"evening_summary":true}'::jsonb,
  subject_types        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_settings TO authenticated;
GRANT ALL ON public.planner_settings TO service_role;
ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planner_settings own" ON public.planner_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- C. Sessioni del timer (R-5): un solo timer attivo per utente
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  slot_id         uuid NULL REFERENCES public.study_events(id) ON DELETE SET NULL,
  device_id       text NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  phase           text NOT NULL DEFAULT 'focus' CHECK (phase IN ('focus','short_break','long_break')),
  block_index     integer NOT NULL DEFAULT 0,
  phase_ends_at   timestamptz NULL,
  paused_at       timestamptz NULL,
  pauses          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ended_at        timestamptz NULL,
  end_reason      text NULL CHECK (end_reason IN ('finished','interrupted','auto_paused','overrun')),
  version         integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS focus_sessions_one_active ON public.focus_sessions (user_id) WHERE ended_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
GRANT ALL ON public.focus_sessions TO service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "focus_sessions own" ON public.focus_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- D. Tempi reali delle minilezioni (R-4, R-6; velocità)
CREATE TABLE IF NOT EXISTS public.lesson_reading_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  context_id      uuid NULL REFERENCES public.study_contexts(id) ON DELETE CASCADE,
  lesson_order    integer NOT NULL,
  subject         text NULL,
  subject_type    text NULL,
  word_count      integer NOT NULL CHECK (word_count >= 0),
  exercise_count  integer NOT NULL DEFAULT 0,
  active_seconds  integer NOT NULL CHECK (active_seconds BETWEEN 0 AND 14400),
  base_estimate_min numeric(6,2) NOT NULL,
  slot_id         uuid NULL REFERENCES public.study_events(id) ON DELETE SET NULL,
  completed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_reading_logs_user_idx ON public.lesson_reading_logs (user_id, completed_at DESC);
GRANT SELECT, INSERT, DELETE ON public.lesson_reading_logs TO authenticated;
GRANT ALL ON public.lesson_reading_logs TO service_role;
ALTER TABLE public.lesson_reading_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_reading_logs select own" ON public.lesson_reading_logs FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "lesson_reading_logs insert own" ON public.lesson_reading_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "lesson_reading_logs delete own" ON public.lesson_reading_logs FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- E. Pacchetti di modifiche, per Annulla e Cronologia (R-7)
CREATE TABLE IF NOT EXISTS public.plan_changes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  reason      text NOT NULL CHECK (reason IN ('skip','overrun','faster','deadline','routine','ai','manual','generate')),
  status      text NOT NULL DEFAULT 'applied' CHECK (status IN ('proposed','applied','rejected','undone')),
  changes     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  applied_at  timestamptz NULL,
  undone_at   timestamptz NULL
);
CREATE INDEX IF NOT EXISTS plan_changes_user_idx ON public.plan_changes (user_id, created_at DESC);
GRANT SELECT ON public.plan_changes TO authenticated;
GRANT ALL ON public.plan_changes TO service_role;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_changes select own" ON public.plan_changes FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
-- scrittura solo via save-event (service role), come study_events

-- F. Push programmate (R-12)
CREATE TABLE IF NOT EXISTS public.scheduled_pushes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('slot_start','pomodoro_end','break_end','overrun','evening_summary')),
  send_at     timestamptz NOT NULL,
  title       text NOT NULL CHECK (char_length(title) <= 80),
  body        text NOT NULL CHECK (char_length(body) <= 160),
  url         text NOT NULL DEFAULT '/app?tab=piano' CHECK (url LIKE '/%'),
  tag         text NULL,
  focus_session_id uuid NULL REFERENCES public.focus_sessions(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz NULL,
  cancelled_at timestamptz NULL,
  skip_reason text NULL CHECK (skip_reason IN ('daily_cap','quiet_hours','no_subscription','send_error')),
  CONSTRAINT scheduled_pushes_horizon CHECK (send_at <= created_at + interval '2 days'),
  CONSTRAINT scheduled_pushes_timer_kind CHECK ((kind IN ('pomodoro_end','break_end','overrun')) = (focus_session_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS scheduled_pushes_due_idx ON public.scheduled_pushes (send_at) WHERE sent_at IS NULL AND cancelled_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.scheduled_pushes TO authenticated;
GRANT ALL ON public.scheduled_pushes TO service_role;
ALTER TABLE public.scheduled_pushes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_pushes select own" ON public.scheduled_pushes FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "scheduled_pushes insert own" ON public.scheduled_pushes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text AND sent_at IS NULL);
CREATE POLICY "scheduled_pushes cancel own" ON public.scheduled_pushes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text AND sent_at IS NULL) WITH CHECK (user_id = auth.uid()::text AND sent_at IS NULL);

-- G. Eventi non ricavabili dalle altre tabelle (R-15)
CREATE TABLE IF NOT EXISTS public.planner_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     text NOT NULL,
  name        text NOT NULL CHECK (name IN ('push_preprompt_shown','push_preprompt_accepted','push_preprompt_denied','ios_a2hs_shown','replan_shown','replan_rejected')),
  props       jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 512),
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.planner_events TO authenticated;
GRANT ALL ON public.planner_events TO service_role;
ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planner_events insert own" ON public.planner_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- H. Routine: trasporti e giorni senza studio
ALTER TABLE public.user_routines DROP CONSTRAINT IF EXISTS user_routines_kind_check;
ALTER TABLE public.user_routines ADD CONSTRAINT user_routines_kind_check
  CHECK (kind IN ('school','sleep','meal','other','transport','no_study'));

-- I. Funzione per il dispatcher (eseguibile solo da service_role)
CREATE OR REPLACE FUNCTION public.claim_due_pushes(p_limit integer DEFAULT 200)
RETURNS SETOF public.scheduled_pushes LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.scheduled_pushes s SET sent_at = now()
  WHERE s.id IN (SELECT id FROM public.scheduled_pushes
                 WHERE sent_at IS NULL AND cancelled_at IS NULL AND send_at <= now()
                 ORDER BY send_at LIMIT p_limit FOR UPDATE SKIP LOCKED)
  RETURNING s.*;
$$;
REVOKE ALL ON FUNCTION public.claim_due_pushes(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_pushes(integer) TO service_role;

-- J. Pacchetto atomico di modifiche (R-7): tutto o niente, con controllo di versione
CREATE OR REPLACE FUNCTION public.apply_plan_changes(p_user_id text, p_reason text, p_changes jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb; a jsonb; v_id uuid; v_rows int; v_out jsonb := '[]'::jsonb; v_pkg uuid;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    a := c->'after';
    IF c->>'op' = 'insert' THEN
      INSERT INTO study_events (user_id, subject, title, event_date, event_time, end_time, event_type,
                                context_id, lesson_from, lesson_to, evaluation_id, source)
      VALUES (p_user_id, a->>'subject', a->>'title', (a->>'event_date')::date, a->>'event_time', a->>'end_time', 'study',
              NULLIF(a->>'context_id','')::uuid, (a->>'lesson_from')::int, (a->>'lesson_to')::int,
              NULLIF(a->>'evaluation_id','')::uuid, COALESCE(a->>'source','auto'))
      RETURNING id INTO v_id;
      c := jsonb_set(c, '{event_id}', to_jsonb(v_id));
    ELSIF c->>'op' = 'update' THEN
      UPDATE study_events SET
        event_date  = COALESCE((a->>'event_date')::date, event_date),
        event_time  = CASE WHEN a ? 'event_time' THEN a->>'event_time' ELSE event_time END,
        end_time    = CASE WHEN a ? 'end_time'   THEN a->>'end_time'   ELSE end_time END,
        lesson_from = COALESCE((a->>'lesson_from')::int, lesson_from),
        lesson_to   = COALESCE((a->>'lesson_to')::int, lesson_to),
        status      = COALESCE(a->>'status', status),
        is_completed= COALESCE(a->>'status', status) = 'done',
        move_count  = COALESCE((a->>'move_count')::int, move_count),
        original_date = COALESCE(original_date, (a->>'original_date')::date),
        original_time = COALESCE(original_time, a->>'original_time'),
        source      = COALESCE(a->>'source', source),
        version = version + 1, updated_at = now()
      WHERE id = (c->>'event_id')::uuid AND user_id = p_user_id AND version = (c->>'version')::int;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 0 THEN RAISE EXCEPTION 'version_conflict' USING ERRCODE = '40001'; END IF;
    ELSIF c->>'op' = 'delete' THEN
      DELETE FROM study_events WHERE id = (c->>'event_id')::uuid AND user_id = p_user_id
        AND version = (c->>'version')::int AND status <> 'done';
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 0 THEN RAISE EXCEPTION 'version_conflict' USING ERRCODE = '40001'; END IF;
    ELSE RAISE EXCEPTION 'invalid_op';
    END IF;
    v_out := v_out || jsonb_build_array(c);
  END LOOP;
  INSERT INTO plan_changes (user_id, reason, status, changes, applied_at)
  VALUES (p_user_id, p_reason, 'applied', v_out, now()) RETURNING id INTO v_pkg;
  RETURN v_pkg;
END $$;
REVOKE ALL ON FUNCTION public.apply_plan_changes(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plan_changes(text, text, jsonb) TO service_role;

-- K. Consensi
CREATE TABLE IF NOT EXISTS public.user_consents (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('push_notifications','speed_profiling','usage_events','lock_screen_details')),
  granted     boolean NOT NULL,
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 32),
  source      text NOT NULL DEFAULT 'app' CHECK (source IN ('app','onboarding','settings','guardian')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_consents_user_purpose_idx ON public.user_consents (user_id, purpose, created_at DESC);
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_consents select own" ON public.user_consents FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_consents insert own" ON public.user_consents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- L. Cancellazione di tutti i dati del Piano di un utente
CREATE OR REPLACE FUNCTION public.purge_user_planner_data(p_user_id text, p_include_consents boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb := '{}'::jsonb; n int;
BEGIN
  DELETE FROM scheduled_pushes    WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('scheduled_pushes', n);
  DELETE FROM focus_sessions      WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('focus_sessions', n);
  DELETE FROM lesson_reading_logs WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('lesson_reading_logs', n);
  DELETE FROM plan_changes        WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('plan_changes', n);
  DELETE FROM planner_events      WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('planner_events', n);
  DELETE FROM planner_settings    WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('planner_settings', n);
  DELETE FROM study_events        WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('study_events', n);
  IF p_include_consents THEN
    DELETE FROM user_consents     WHERE user_id = p_user_id; GET DIAGNOSTICS n = ROW_COUNT; r := r || jsonb_build_object('user_consents', n);
  END IF;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.purge_user_planner_data(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_planner_data(text, boolean) TO service_role;