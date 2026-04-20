

## Diagnosi

### Problema 1: Doppio caricamento
`UploadSheet.handleUpload()` esegue un flusso pesante dentro il popup: upload PDF → polling per completamento → rendering pagine PDF nel browser → analisi figure con AI → crop e upload immagini. Tutto questo mostra un lungo "Elaborazione PDF..." dentro lo sheet. Poi, dopo aver chiuso lo sheet, l'utente deve cliccare "Genera percorso" in Studio per il secondo caricamento.

### Problema 2: JSON troncato (errore critico)
I log mostrano che `generate-lessons` riceve risposte AI valide (array JSON di titoli), ma il parametro `max_tokens=3000` è troppo basso per documenti lunghi. L'AI produce un array JSON che viene troncato a metà, e `extractJson` non riesce a parsarlo. Questo causa l'errore "Impossibile estrarre JSON dalla risposta AI" ripetutamente.

---

## Piano di intervento

### 1. Semplificare UploadSheet (eliminare doppio caricamento)
**File**: `src/components/upload/UploadSheet.tsx`

Ridurre `handleUpload()` al minimo:
- Upload PDF al backend → ricevere `contextId`
- Polling SOLO per completamento dell'estrazione testo (status `completed`)
- Chiudere lo sheet e passare il `contextId` a Studio
- Spostare la logica di rendering pagine e analisi figure dentro la fase di generazione lezioni (o eliminarla se non necessaria per il flusso base)
- Rimuovere `renderAndUploadPageImages`, `cropFigure`, `attachImagesToContext` dallo sheet

### 2. Correggere il parsing JSON troncato
**File**: `supabase/functions/generate-lessons/index.ts`

- Aumentare `max_tokens` da 3000 a 8000 per la chiamata AI dei titoli
- Migliorare `extractJson` per gestire array JSON troncati: se l'array è incompleto, chiudere le parentesi aperte e tentare il parse degli elementi completi
- Aggiungere logging del contenuto raw quando il parsing fallisce per facilitare il debug futuro

### 3. Deploy e test
- Deployare la edge function aggiornata
- Verificare che il flusso funzioni: upload → chiudi sheet → genera percorso → lezioni create

---

### Dettagli tecnici

**UploadSheet semplificato** - il flusso diventa:
1. Upload file via `upload-pdf` edge function
2. Poll `get-lessons` per `processing_status === "completed"` (estrazione testo)
3. Chiudi sheet, passa `contextId`
4. L'utente clicca "Genera percorso" in Studio (unico punto di generazione)

**extractJson migliorato** - gestione troncamento:
```text
Se l'array JSON è troncato (es. [{...}, {... ), 
rimuovere l'ultimo oggetto incompleto, 
chiudere l'array con ] e parsare.
```

**max_tokens titles**: 3000 → 8000

