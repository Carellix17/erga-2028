# Piano: Immagini reali dal PDF nelle mini-lezioni

# Piano: Immagini reali dal PDF nelle mini-lezioni (versione corretta)

## Problema attuale

L'estrazione delle immagini dal PDF tramite ricerca di firme binarie (JPEG/PNG) non funziona perché nei PDF le immagini sono quasi sempre compresse dentro stream (FlateDecode, DCTDecode, etc.) e non appaiono come JPEG/PNG raw. Il bucket `study-images` è vuoto: nessuna immagine è stata mai estratta.

---

## Soluzione proposta

Usare l'AI vision (Gemini) per analizzare le pagine del PDF come immagini e identificare figure/diagrammi, poi salvarle come screenshot delle pagine.

⚠️ **Nota critica**:  
NON tutte le pagine devono essere usate dall’AI.  
È necessario introdurre un **filtro esplicito delle pagine rilevanti**, altrimenti si peggiorano prestazioni e costi.

---

## 1. Modificare `extract-pdf/index.ts` - Aggiungere estrazione immagini via rendering pagine

- Dopo l'estrazione del testo con pdfjs, usare pdfjs per renderizzare ogni pagina come immagine (canvas)
- Alternativa più affidabile: convertire le pagine PDF in immagini usando `pdf-img-convert` o rendering nativo
- Se il rendering pagine non è possibile in Deno:
  - usare un approccio ibrido con AI vision per identificare pagine rilevanti

---

## 2. Approccio pragmatico: AI vision sulle pagine PDF + filtro

1. In `extract-pdf`: dopo aver estratto il testo, usare l'AI vision (Gemini) per:
  - analizzare le pagine
  - identificare **solo quelle con figure/diagrammi significativi**
2. Creare una lista esplicita, ad esempio:
  ```
  relevantPages = [2, 5, 9]
  ```
3.   
Estrarre/renderizzare **solo queste pagine** come immagini  

4.   
Caricarle nel bucket `study-images`  

5.   
Aggiungere i metadati `[EXTRACTED_IMAGES]` contenenti **solo le immagini rilevanti**  


---

## 3. Piano concreto di implementazione

### Step 1 - Migliorare estrazione immagini in `extract-pdf`

-   
Tentare con `page.getOperatorList()` per individuare immagini  

-   
Se non funziona: fallback su rendering pagine  


⚠️ In ogni caso:  
  
👉 NON salvare tutte le pagine  
  
👉 salvare solo quelle filtrate

---

### Step 2 - Approccio con canvas (più robusto)

-   
Usare `pdfjs-serverless` con polyfill canvas (se backend)  


Oppure:

-   
Rendering lato client (preferito)  


Flusso corretto:

1.   
Renderizzare tutte le pagine  

2.   
Analizzarle (AI o logica)  

3.   
Selezionare solo pagine rilevanti  

4.   
Salvare solo quelle  


---

### Step 3 - Approccio più semplice e garantito

-   
In `generate-lessons`:  

  -   
  NON mostrare placeholder se manca immagine  

-   
In `extract-pdf`:  

  -   
  usare Gemini vision per:  

    -   
    identificare figure  

    -   
    restituire pagine rilevanti  

-   
Salvare solo screenshot di quelle pagine  


---

## Decisione: Approccio con rendering pagine PDF + filtro

Il piano più robusto:

1. `extract-pdf/index.ts`:  

  -   
  Dopo estrazione testo:  

    -   
    ottenere lista `relevantPages`  

    -   
    renderizzare e salvare **solo quelle pagine**  

  -   
  aggiungere metadati `[EXTRACTED_IMAGES]` filtrati  

2. `generate-lessons/index.ts`:  

  -   
  usare solo le immagini filtrate nel prompt AI  

3. `FullscreenLesson.tsx`:  

  -   
  mostrare solo immagini rilevanti  

4.   
Ri-processare i PDF esistenti  


---

## Dettaglio tecnico

Problema: Deno non ha canvas nativo

Opzioni:

- `jsr:@aspect/canvas` o `npm:canvas`  

-   
conversione lato client  

-   
servizio esterno  


---

## Implementazione finale scelta (OTTIMIZZATA)

### 1. Frontend (`UploadSheet.tsx`)

-   
Usare pdfjs nel browser per renderizzare ogni pagina  

-   
Analizzare le pagine (con AI o euristiche leggere)  

-   
Creare lista `relevantPages`  

-   
Caricare nel bucket `study-images` **solo le immagini rilevanti**  

-   
Passare i path a `extract-pdf`  


---

### 2. `extract-pdf`

-   
Ricevere:  

  -   
  immagini filtrate  

  -   
  lista pagine rilevanti  

-   
Salvare nei metadati  


---

### 3. `generate-lessons`

-   
Usare solo immagini filtrate  


---

### 4. `FullscreenLesson.tsx`

-   
Mostrare immagini  


---

## File da modificare:

- `UploadSheet.tsx` → rendering + filtro + upload  

- `extract-pdf/index.ts` → gestione immagini filtrate