-- Esito del controllo età. La data di nascita non ha una colonna:
-- si calcola nella edge function e si scarta.
-- Reversibile: DROP TABLE public.user_age_checks;
-- Non tocca user_profiles.age: quella colonna resta finché il CEO non dà un OK separato.

CREATE TABLE public.user_age_checks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_14_plus boolean NOT NULL,
  is_under_18 boolean NOT NULL,
  age_checked_on date NOT NULL,
  parent_ack boolean,
  parent_ack_at timestamptz,
  parent_ack_text_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_age_checks_only_passed CHECK (is_14_plus = true),
  CONSTRAINT user_age_checks_parent_ack_shape CHECK (
    (
      is_under_18 = false
      AND parent_ack IS NULL
      AND parent_ack_at IS NULL
      AND parent_ack_text_version IS NULL
    )
    OR (
      is_under_18 = true
      AND parent_ack = true
      AND parent_ack_at IS NOT NULL
      AND parent_ack_text_version = 'v1-2026-11-19'
    )
  )
);

COMMENT ON TABLE public.user_age_checks IS
  'Esito del controllo dei 14 anni. Non contiene la data di nascita.';

GRANT SELECT ON TABLE public.user_age_checks TO authenticated;
GRANT ALL ON TABLE public.user_age_checks TO service_role;

ALTER TABLE public.user_age_checks ENABLE ROW LEVEL SECURITY;

-- Lo studente legge solo il proprio esito. Non può scriverlo:
-- i flag li imposta la edge function con il service role.
CREATE POLICY user_age_checks_select_own
  ON public.user_age_checks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_age_checks_set_updated_at
  BEFORE UPDATE ON public.user_age_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
