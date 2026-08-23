# Prompt per agenti esterni (Claude Code, Codex, Cursor, ecc.)

Copia il blocco qui sotto e incollalo come istruzione di sistema / primo messaggio
all'agente esterno che lavora sul repository di Erga.

---

## Contesto del progetto

Erga è una web app React + Vite + TypeScript + Tailwind CSS.
Il backend è **Lovable Cloud** (gestito da Lovable, basato su tecnologia Supabase):
database Postgres, Auth, Storage, Edge Functions.

**Importante — cosa NON puoi fare tu (agente esterno):**
- Non puoi deployare le Edge Function (richiede credenziali di servizio Lovable).
- Non puoi applicare migrazioni SQL al database (stesso motivo).
- Non hai accesso alla dashboard Supabase né alla `SERVICE_ROLE_KEY`.

Le modifiche al **codice sorgente** (`src/`, `supabase/functions/**.ts`,
`supabase/migrations/**.sql`) le scrivi normalmente nel repo. Il **deploy** e
l'**applicazione delle migrazioni** li esegue poi l'agente Lovable, a cui
l'utente incollerà un prompt di handoff che tu gli preparerai (vedi fondo).

## Struttura

```
src/
  components/        # componenti React (UI)
  pages/             # pagine / route
  hooks/             # hook React Query + logica client
  lib/               # utility, edgeFetch, auth
  integrations/supabase/client.ts   # client Supabase (NON MODIFICARE — autogenerato)
  contexts/          # provider (Auth, Theme, Focus, ecc.)
supabase/
  functions/         # Edge Function in Deno/TypeScript
    _shared/         # codice condiviso tra funzioni (auth.ts, ai.ts, vision.ts, ...)
  migrations/        # file .SQL con timestamp (es. 20260814000000_nome.sql)
  config.toml        # autogenerato — NON modificare le impostazioni di progetto
```

## Regole frontend

- Stack: React 18, Vite 5, Tailwind v3, TypeScript 5.
- Import client Supabase: `import { supabase } from "@/integrations/supabase/client"`.
- Non usare `localStorage` per stato utente: tutto passa per la tabella `user_data`
  via l'hook `useUserData` (vedi `src/hooks/useUserData.ts`).
- Material Design 3 Expressive: colori vibranti, angoli arrotondati, animazioni spring.
- Nessuna emoji come icona UI: usare Lucide o SVG.
- Niente nuove dipendenze se CSS/React/librerie già presenti bastano.

## Regole Edge Function (Deno)

- Entrypoint: `supabase/functions/<nome>/index.ts`.
- Import npm via `npm:` specifier (es. `import { z } from "npm:zod"`).
- Codice condiviso in `supabase/functions/_shared/`.
- Valida SEMPRE il JWT: usa `import { requireAuth } from "../_shared/auth.ts"`.
  `user_id` viene dal token, MAI dal body della richiesta.
- Valida l'input con Zod, ritorna 400 su errore.
- CORS: `import { corsHeaders } from "npm:@supabase/supabase-js@2/cors"`
  e includi `corsHeaders` in TUTTE le response (anche errori).
- Chiamate AI: usa la catena di fallback in `supabase/functions/_shared/ai.ts`
  (`callAIText`, `callAIStream`) o `vision.ts` (`callVisionText`).
  Non fare `fetch` diretta ai provider AI nei tuoi endpoint.

## Regole migrazioni SQL

- Nome file: `YYYYMMDDHHMMSS_nome_descrittivo.sql` in `supabase/migrations/`.
- Per ogni `CREATE TABLE public.<nome>`:
  1. `CREATE TABLE ...`
  2. `GRANT` alla tabella (authenticated / service_role, anon solo se serve)
  3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  4. `CREATE POLICY ...` (sempre scoped a `auth.uid()`)
- Mai toccare gli schemi `auth`, `storage`, `realtime`, `vault`.
- I ruoli utente vanno in una tabella `user_roles` separata (mai su profiles).
- Le chiavi AI e i segreti non vanno nel codice: si aggiungono tramite Lovable.

## Handoff per il deploy (cosa preparare per l'agente Lovable)

Quando hai finito di scrivere codice nel repo, prepara per l'utente un prompt
da incollare all'agente Lovable con questa struttura:

```
Sincronizza il repository (branch main) e:
1. Applica queste migrazioni SQL (elenca i file in supabase/migrations/):
   - <nome_file>.sql
2. Deploya queste Edge Function:
   - <nome_funzione>
3. Rigenera i tipi TypeScript Supabase se ci sono nuove tabelle/colonne.
```

Elenca SOLO i file/function realmente modificati o aggiunti. Se una modifica è
solo frontend (`src/`), non serve nessun deploy: la sincronizzazione del repo
è sufficiente perché Lovable aggiornerà l'anteprima automaticamente.

## Sicurezza

- Abilita SEMPRE RLS sulle nuove tabelle.
- `user_id` nei dati deriva sempre dal JWT server-side, mai dal client.
- Non esporre `SERVICE_ROLE_KEY` o segreti nel frontend.
- Messaggi di errore generici al client (no leak di dettagli DB).
