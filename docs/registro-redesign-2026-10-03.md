# Registro del redesign — Erga

**Aperto:** 3 ottobre 2026 · **Fonte di verità grafica:** `DESIGN.md` versione 1.1 (integrato nel pacchetto D0)
**Base di partenza:** commit `f54e237` (stato del repository verificato dalla specifica: Pratica assorbita da Studio, palestra scientifica, otto widget, motori per materia).

Questo è l'**unico registro** dei lavori del redesign: stato dei pacchetti, cosa esiste già, punti aperti.
Chi lavora a un pacchetto aggiorna qui lo stato. La migrazione dell'interfaccia **non è iniziata**: l'app oggi mostra ancora la veste precedente.

---

## 1. Le decisioni vincolanti (dal proprietario)

- **Angoli squadrati** (raggio 0) per l'intero prodotto; cerchi solo nel contenuto (avatar, radio nativi, esagono cognitivo, grafici).
- **Atmosfera astratta e matericità**: composizioni di luce e colore per le card dei corsi, superfici e ombre con profondità controllata.
- **Ubuntu Sans del saluto**: da conservare.
- **Palette ottanio** (`#087F83` e famiglia): base proposta della prima implementazione, non identità definitivamente approvata.
- **Navigazione unificata**: quattro destinazioni con etichette persistenti (Home, Piano, Studio, Core); dock flottante su telefono, rail/sidebar su schermi ampi.
- **Lezioni coinvolgenti**: diagrammi animati e piccole interazioni; varietà funzionale, non carosello di paragrafi identici.

**Non guidano questo redesign** (scelte della veste precedente, da non reintrodurre): rosso lacca, Playfair/Inter/Roboto Mono, ossidiana obbligatoria, immagini sempre in bianco e nero, "mirino laser".

## 2. Stato dei pacchetti

| Pacchetto | Contenuto | Stato |
|---|---|---|
| **D0 — Identità e documentazione** | DESIGN.md 1.1 integrato (frontmatter token del sistema di destinazione), `.impeccable/design.json` allineato (schema 2), AGENTS.md / Matrice / Minilezione riconciliate, questo registro | ✅ **fatto, 3 ottobre 2026** |
| **D1 — Fondamenta** | Audit componenti/stili esistenti; token condivisi (palette, tipografia, geometria, ombre, movimento); componenti base (pulsanti, campi, selettori, dialoghi, toast, skeleton); revisione della policy di `noGreen.test.ts` | ⬜ da fare |
| **D2 — Navigazione e Home** | Dock/rail/sidebar unificati; Home con gerarchia (riprendi → prossimo impegno → strumenti) | ⬜ |
| **D3 — Studio e lezioni** | Cantieri + Banco, mappa percorso (spina + nodi, prerequisiti consigliati) con alternativa Elenco; scene didattiche partendo dagli otto widget esistenti | ⬜ |
| **D4 — Esercizi, interrogazione e Piano** | Ingressi degli strumenti del Banco; calendario squadrato coerente nei due temi | ⬜ |
| **D5 — Core e landing** | Coerenza della schermata Core esistente; landing nella stessa identità, confini degli stili marketing preservati | ⬜ |
| **D6+ — Evoluzioni funzionali separate** | Mappa con dipendenze reali e loro generazione/validazione; nuovi componenti didattici interattivi; aggiunta di impegni in linguaggio naturale (contratto dati + AI/backend); metriche future di Core | ⬜ incarichi separati, mai nel redesign visivo |

**Regola di advancement:** niente riscrittura totale in un colpo solo; migrazione progressiva per pacchetti, componenti condivisi, rimozione degli stili soppiantati senza stratificare override.

## 3. Cosa esiste già nel prodotto (verificato nel repository al commit `f54e237`)

Presenza nel codice **non** significa pubblicato online: i deploy passano da Lovable.

- **Otto widget didattici** costruiti a mano (parabola, retta, proiettile, piano inclinato, pH, gas, mercato offerta/domanda, esecutore di codice in Web Worker) con catalogo JSON condiviso validato e clampato — uniformarli prima di aggiungerne altri.
- **Feedback aptico** già presente (`useHaptics` e utility condivise): consolidarlo, non ricrearlo.
- **Palestra scientifica** (matematica/fisica/chimica): esercizi numerici con tolleranza e virgola decimale, suggerimenti progressivi, soluzione passo-passo, tutor socratico.
- **Strumenti in Studio** (la sezione Pratica non esiste più): chat, esercizi, interrogazione e palestra come strumenti del Banco, raggiungibili anche dalla Home.
- **Motori per materia** (fiume del backend): scientifico (DeepSeek V4 Flash via OpenRouter + formule + widget), letteratura, storia/geografia, filosofia, lingue vive, latino, storia dell'arte; sociali e informatica rinviati a più tardi.
- **KaTeX** con output MathML accessibile; **i18n** it/en; colori materie e routine (informano, non decorano); vetrina marketing isolata (`--lp-*`); fondamenta dati v1/v2 (compatibilità dei percorsi v1 da mantenere).

## 4. Controlli del vecchio stile e loro revisione futura

**Non disattivati in D0.** Restano attivi e verdi finché i rispettivi pacchetti non li affrontano:

- `src/test/noGreen.test.ts` (P24 "cacciatore di verdi"): vieta classi Tailwind green/emerald/teal/lime/sage, hue HSL 60–180 con saturazione, hex della vecchia palette bosco e theme-color verdi; allowlist per il feedback quiz in 6 file. Codifica il **precedente monocromo**, che il redesign sostituisce.
  - **Revisione prevista in D1/D2**, quando l'ottanio (`#087F83`, hue ≈ 184) entra davvero nel codice: distinguere la **marca** (ottanio ammesso) dallo **stato** (verdi ed esiti non previsti restano vietati), conservando i controlli di regressione utili e l'allowlist del feedback quiz. Da concordare col proprietario in quel pacchetto; mai aggirare il test con colori nascosti.
- Token CSS della veste precedente (`--radius-*`, Montserrat, superfici avorio, pillola di navigazione): oggetto dei pacchetti D1–D5, non di D0.

## 5. Punti ancora aperti (proposte da validare, non decisioni)

- Valori completi della palette ottanio (giorno e notte) e contrasti su trasparenze, hover, disabled, focus.
- Ubuntu Sans anche per il testo didattico, dopo confronto su contenuti reali.
- Breakpoint di presentazione della navigazione (<768 dock · 768–1199 rail · ≥1200 sidebar).
- Prerequisiti **consigliati** con possibilità di proseguire: nessun blocco rigido senza decisione di prodotto.
- Intensità delle ombre e durate delle transizioni: da verificare nel prodotto.
- Etichette del toggle del corso: **Percorso/Elenco** (non "Topologia", non il simbolo ☍).

## 6. Note operative

- `PRODUCT.md` non è stato modificato per adattarlo alla grafica (regola del pacchetto D0).
- Nessuna modifica a backend, dati, autenticazione o pagamenti; nessuna migrazione né deploy richiesto da D0.
- I prompt Arena dettagliati per i pacchetti D1+ saranno deliverable successive basati su `DESIGN.md` e su questo registro.
