-- ============================================================
-- Anti-abuso per la funzione "generate-lessons-demo"
-- ------------------------------------------------------------
-- La demo pubblica non richiede login: chiunque su Internet puo'
-- chiamarla. Ogni chiamata consuma crediti AI a pagamento.
-- Questa tabella conta quante generazioni demo ha fatto ogni
-- visitatore (identificato da un'impronta SHA-256 del suo IP,
-- quindi l'IP reale NON viene salvato) in una finestra di 24h.
-- ============================================================

-- 1) Tabella dei conteggi
CREATE TABLE IF NOT EXISTS public.demo_rate_limits (
  ip_hash      text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demo_rate_limits IS
  'Contatore anti-abuso per le generazioni demo anonime (per hash IP, finestra mobile 24h).';

-- 2) Attiva RLS: nessuna policy => NESSUN utente (anon/authenticated)
--    puo' leggere o scrivere questa tabella dalle API.
--    Solo il backend (service_role, che scavalca RLS) ci accede.
ALTER TABLE public.demo_rate_limits ENABLE ROW LEVEL SECURITY;

-- 3) Funzione atomica "conta e incrementa":
--    - se la finestra di 24h e' scaduta, riparte da 1
--    - altrimenti incrementa
--    Restituisce il conteggio attuale: il backend confronta col limite.
--    E' atomica (una sola scrittura) => due richieste simultanee
--    non possono "sgattaiolare" entrambe sotto il limite.
CREATE OR REPLACE FUNCTION public.check_and_increment_demo_usage(
  p_ip_hash text,
  p_window interval DEFAULT '24 hours'
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.demo_rate_limits (ip_hash, window_start, request_count)
  VALUES (p_ip_hash, now(), 1)
  ON CONFLICT (ip_hash) DO UPDATE SET
    request_count = CASE
      WHEN demo_rate_limits.window_start < now() - p_window THEN 1
      ELSE demo_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN demo_rate_limits.window_start < now() - p_window THEN now()
      ELSE demo_rate_limits.window_start
    END
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$;

-- 4) Solo il backend (service_role) puo' eseguirla:
--    revoca esplicita a tutti gli altri ruoli esposti via API.
REVOKE EXECUTE ON FUNCTION public.check_and_increment_demo_usage(text, interval) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_demo_usage(text, interval) TO service_role;

-- 5) Pulizia opzionale dei record piu' vecchi di 7 giorni
--    (evita che la tabella cresca all'infinito).
CREATE OR REPLACE FUNCTION public.cleanup_demo_rate_limits()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.demo_rate_limits
  WHERE window_start < now() - interval '7 days';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_demo_rate_limits() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_demo_rate_limits() TO service_role;
