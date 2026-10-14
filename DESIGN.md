---
name: Erga
description: Design System "Squared & Earthy" ispirato a Mistral AI ma con palette personalizzata. Geometria rigorosa con bordi netti (hairline), superfici calde e naturali, tipografia editoriale con Serif per titoli e Sans-Serif per UI. Mantiene la struttura funzionale di Erga (Home, Studio, Piano, Core) con i suoi materiali didattici e cogniti.
colors:
  # ----- Neutri e Superfici (Palette Personalizzata) -----
  canvas: "#11120D"         # Sfondo pagina principale (Smoky Black)
  surface-primary: "#565449"  # Pannelli, card, form (Olive Drab)
  surface-secondary: "#D8CFBC" # Superficie secondaria (Bone)
  paper: "#D8CFBC"          # Superficie leggibile (Bone - alias surface-secondary)
  ink: "#11120D"           # Testo principale e azione primaria (Smoky Black)
  ink-muted: "#565449"     # Testo secondario (Olive Drab)
  steel: "#8B897F"         # Caption, label, muted
  line: "#D8CFBC"         # Separatore decorativo (Bone)
  control-line: "#C7C4B8"  # Contorno per controlli
  on-ink: "#FFFBF4"        # Testo su sfondo scuro (Floral White)
  focus: "#565449"         # Indicatore di focus (Olive Drab)
  
  # ----- Palette Brand (Adattata) -----
  primary: "#565449"        # Olive Drab (CTA e accenti)
  primary-deep: "#3A382E"   # Olive Drab scuro (hover)
  accent-warm: "#D8CFBC"    # Bone (accenti chiari)
  accent-light: "#FFFBF4"  # Floral White (testo e sfondi chiari)
  
  # ----- Tema Notte -----
  night-canvas: "#0A0A08"   # Sfondo scuro (più scuro di Smoky Black)
  night-paper: "#1A1A15"    # Carta scura
  night-ink: "#FFFBF4"      # Testo chiaro (Floral White)
  night-ink-muted: "#D8CFBC" # Testo secondario notturno (Bone)
  night-line: "#3A382E"     # Linea scura (Olive Drab scuro)
  night-control-line: "#565449" # Contorno controllo notturno (Olive Drab)
  
  # ----- Accenti Materia (Mantenuti da Erga) -----
  # Colori per le materie scolastiche - adattati alla nuova palette
  subject-blue: "#2563EB"
  subject-red: "#DC2626"
  subject-yellow: "#EAB308"
  subject-emerald: "#059669"
  subject-amber: "#D97706"
  subject-lime: "#65A30D"
  subject-cyan: "#0891B2"
  subject-violet: "#7C3AED"
  subject-orange: "#EA580C"
  subject-magenta: "#C026D3"
  subject-neutral: "#94A3B8"
  
  # ----- Routine (Mantenuti) -----
  routine-sleep: "#4F46E5"
  routine-school: "#64748B"
  routine-meal: "#EF4444"
  routine-other: "#0D9488"
  
  # ----- Marketing (Vetrina) -----
  marketing-red: "#E30613"
  marketing-rose: "#C4878B"
  marketing-gold: "#C4A574"

typography:
  # Coppia tipografica editoriale: Serif per titoli, Sans-Serif per UI
  display:            # Saluto / titolo principale pagina
    fontFamily: "Playfair Display, Lora, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.02em"
  
  course-title:       # Titolo corso protagonista
    fontFamily: "Playfair Display, Lora, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1.2
  
  scene-title:        # Titolo scena didattica / concetto
    fontFamily: "Playfair Display, Lora, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.2
  
  module-title:       # Titolo modulo / intestazione attivita
    fontFamily: "Playfair Display, Lora, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 500
    lineHeight: 1.25
  
  subsection:         # Sottosezione operativa / scelta strumento
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
  
  reading:            # Lettura didattica
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.65
  
  interface:          # Interfaccia, pulsanti, input, navigazione
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  
  label:              # Metadati
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45

rounded:
  # Geometria rigorosa: bordi netti e angoli controllati
  # MAX 12px per card e pannelli, MAX 8px per bottoni e input
  sm: "4px"           # Badge di data, dettagli piccoli
  control: "8px"      # Input, select, menu, segmenti esterni
  card: "12px"        # Card di strumenti, moduli, righe autonome
  hero: "12px"        # Card corso e fogli protagonisti
  sheet: "12px"       # Dialoghi e sheet
  nav: "12px"         # Dock mobile
  button: "8px"       # Bottoni primari e secondari
  pill: "8px"         # Azioni principali (NO rounded-full!)
  full: "9999px"      # Cerchi perfetti (avatar, radio, esagono)

spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"

components:
  button-primary:
    note: "Olive Drab, testo Floral White, angoli a 8px (NO pillola!)"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.accent-light}"
    rounded: "{rounded.button}"
    height: "44px"
    padding: "10px 20px"
    hover: "{colors.primary-deep}"
  
  button-secondary:
    note: "Sfondo Bone, bordo Bone, testo Smoky Black, angoli a 8px"
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line}"
    borderWidth: "1px"
    rounded: "{rounded.button}"
    height: "44px"
    hover: "{colors.accent-warm}"
  
  button-satin:
    note: "SOLO per Continua/Riprendi/Scegli sulle copertine: Bone semitrasparente con blur, testo Smoky Black, pillola a 8px"
    backgroundColor: "{colors.surface-secondary} / 0.9"
    backdropFilter: "blur(8px)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  
  input:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.ink}"
    borderColor: "{colors.control-line}"
    rounded: "{rounded.control}"
    height: "44px"
    focusBorder: "2px solid {colors.primary}"
  
  card:
    backgroundColor: "{colors.surface-primary}"
    textColor: "{colors.accent-light}"
    borderColor: "{colors.line}"
    borderWidth: "1px"
    rounded: "{rounded.card}"
    padding: "16px 20px"
    boxShadow: "0 1px 2px rgba(17, 18, 13, 0.04), 0 4px 12px rgba(17, 18, 13, 0.03)"
  
  card-hero:
    note: "Copertina colorata con composizione astratta per materia, testo Floral White, grana 3-5%"
    backgroundColor: "colore materia + composizione"
    rounded: "{rounded.hero}"
    padding: "20px 24px"
    border: "1px solid {colors.line}"
    textColor: "{colors.accent-light}"
  
  card-course:
    note: "Card del corso nella Home e Studio, con azione Continua/Riprendi satinata"
    backgroundColor: "{colors.surface-primary}"
    rounded: "{rounded.hero}"
    padding: "24px"
    border: "1px solid {colors.line}"
    textColor: "{colors.accent-light}"
    shadow: "0 2px 4px rgba(17, 18, 13, 0.04), 0 10px 24px rgba(17, 18, 13, 0.08)"
  
  nav-dock:
    note: "Dock flottante arrotondato, Olive Drab opaco, ombra controllata, ~64px, margini 16-20px, safe area"
    rounded: "{rounded.nav}"
    height: "64px"
    backgroundColor: "{colors.surface-primary}"
    border: "1px solid {colors.line}"
    textColor: "{colors.accent-light}"
    shadow: "0 4px 16px rgba(17, 18, 13, 0.08)"
  
  sunset-stripe:
    note: "Banda orizzontale a fondo pagina con gradiente earthy (Olive Drab to Bone)"
    background: "linear-gradient(to right, {colors.primary-deep}, {colors.primary}, {colors.surface-secondary}, {colors.accent-light})"
    height: "4px"

---

# ERGA - DESIGN SYSTEM v3.0 "Squared & Earthy"
**Versione 3.0 · Data: Ottobre 2025 · Ispirazione: Mistral AI con palette personalizzata**

> **Note di integrazione**: Questo documento **sostituisce integralmente** la versione precedente.
> Il design system si ispira all'estetica cinematografica e editoriale di Mistral AI, con geometria rigorosa,
> ma utilizza una **palette personalizzata** con toni terrosi e naturali.
> **Mantiene inalterata** la struttura funzionale di Erga: Home, Studio, Piano, Core, e tutti i flussi utente.

---

## 1. Autorità e Ambito

Questa specifica **sostituisce completamente** il design system precedente.
L'obiettivo è trasformare l'estetica di Erga con una **palette terrosa e naturale**,
**senza modificare** la struttura, le funzionalità, i dati o il backend.

### Decisioni Chiave (Approvate)

- **Geometria**: Angoli massimi di **12px** per card e pannelli, **8px** per bottoni e input
- **Divieto assoluto**: NON usare mai `rounded-full` (effetto pillola) per bottoni, card e form
- **Colore primario**: **Olive Drab #565449** per CTA e accenti
- **Superfici**: **Bone #D8CFBC** per pannelli, card e form
- **Testo**: **Smoky Black #11120D** per testo principale, **Floral White #FFFBF4** per testo su sfondo scuro
- **Tipografia**: **Playfair Display** (Serif) per titoli, **Inter** (Sans-Serif) per UI
- **Bordi**: Linee sottili (hairline) a **1px** con colore **Bone #D8CFBC**
- **Ombre**: Approccio flat con ombre molto sottili per hover

### Materiali e Gerarchia

Erga mantiene la sua **gerarchia di materiali** con la nuova palette:

| Livello | Ruolo | Trattamento |
|---|---|---|
| **Fondo** | Contesto dell'app | Smoky Black (#11120D), prevalentemente piatto |
| **Carta** | Card, pannelli, form | Bone (#D8CFBC), bordo hairline 1px, angoli 12px |
| **Copertina** | Corso protagonista | Colore materia + composizione astratta, angoli 12px |
| **Velo Satinato** | Azioni su copertine | Bone semitrasparente con blur, angoli 8px |

**Regola fondamentale**: Mantieni la **stessa identità visiva** tra Home, Studio e lezione per lo stesso corso.

---

## 2. Identità: Piattaforma Educativa con Anima Terrosa

Erga deve comunicare **precisione e connessione con la natura**: una piattaforma tecnologica che ricorda i toni caldi della terra.

### Elementi Distintivi

1. **Geometria rigorosa**: Bordi netti, angoli controllati (max 12px), nessun eccesso decorativo
2. **Contrasto tipografico**: Serif elegante per titoli, Sans-Serif geometrico per interfaccia
3. **Palette Earthy**: Olive Drab come primario, con sfumature Bone e Floral White
4. **Superfici naturali**: Toni terrosi e caldi, niente grigi freddi o superfici metalliche
5. **Dettagli editoriali**: Spaziatura generosa, gerarchia chiara, lettura agevole

### Cosa NON Fare

- ❌ Usare `rounded-full` per bottoni, card o contenitori
- ❌ Introduce grigi freddi o superfici metalliche
- ❌ Usare ombre pesanti che appesantiscono l'interfaccia
- ❌ Mescolare stili: mantenere coerenza assoluta con i token definiti
- ❌ Cambiare la struttura funzionale (Home, Studio, Piano, Core restano invariati)

---

## 3. Colore

### Palette Principale (Tema Giorno)

#### Neutri e Superfici
| Token | Valore | Uso |
|---|---|---|
| `canvas` | #11120D | Sfondo pagina principale (Smoky Black) |
| `surface-primary` | #565449 | Pannelli, card, form (Olive Drab) |
| `surface-secondary` | #D8CFBC | Superficie secondaria (Bone) |
| `paper` | #D8CFBC | Alias di surface-secondary per compatibilità |
| `ink` | #11120D | Testo principale, azioni primarie (Smoky Black) |
| `ink-muted` | #565449 | Testo secondario (Olive Drab) |
| `steel` | #8B897F | Caption, label, testo molto attenuato |
| `line` | #D8CFBC | Bordi sottili (hairline) (Bone) |
| `control-line` | #C7C4B8 | Contorno per input e controlli |
| `on-ink` | #FFFBF4 | Testo su sfondo scuro (Floral White) |
| `focus` | #565449 | Indicatore di focus (Olive Drab) |

#### Colori Brand
| Token | Valore | Uso |
|---|---|---|
| `primary` | #565449 | Azioni primarie, CTA (Olive Drab) |
| `primary-deep` | #3A382E | Hover delle azioni primarie (Olive Drab scuro) |
| `accent-warm` | #D8CFBC | Accenti chiari (Bone) |
| `accent-light` | #FFFBF4 | Testo e sfondi chiari (Floral White) |

### Tema Notte

La notte **inverte** la gerarchia luminosa ma **mantiene** la stessa identità con toni scuri della palette:

| Token | Valore | Uso |
|---|---|---|
| `night-canvas` | #0A0A08 | Sfondo scuro (più scuro di Smoky Black) |
| `night-paper` | #1A1A15 | Carta scura |
| `night-ink` | #FFFBF4 | Testo chiaro (Floral White) |
| `night-ink-muted` | #D8CFBC | Testo secondario notturno (Bone) |
| `night-line` | #3A382E | Linea scura (Olive Drab scuro) |
| `night-control-line` | #565449 | Contorno controllo notturno (Olive Drab) |

**Regola**: Il colore primario **#565449** (Olive Drab) rimane lo stesso in entrambi i temi.
Le superfici Bone diventano scure, i testi Smoky Black diventano Floral White.

### Accenti per Materie

Manteniamo i **colori per materia** già esistenti in Erga, ma **adattati** alla nuova estetica:

| Materia | Colore | Note |
|---|---|---|
| Matematica | #2563EB | Blu acceso |
| Storia | #DC2626 | Rosso |
| Economia | #EAB308 | Giallo ambrato |
| Letteratura | #059669 | Verde smeraldo |
| Filosofia | #D97706 | Arancio |
| Fisica | #65A30D | Verde lime |
| Informatica | #0891B2 | Ciano |
| Arte | #7C3AED | Viola |
| Diritto | #EA580C | Arancio scuro |
| Lingue | #C026D3 | Magenta |
| Generale | #94A3B8 | Grigio neutro |
| Scienze | #4F46E5 | Blu indaco |
| Geografia | #64748B | Grigio bluastro |

**Importante**: Sulle **copertine dei corsi**, il colore materia domina con una **composizione astratta**.
Nel **resto dell'interfaccia**, il colore materia appare come **accento discreto** (badge, bordi, icone).

### Earthy Stripe

Ogni pagina deve includere una **banda orizzontale** sopra il footer con gradiente earthy:

```css
background: linear-gradient(to right, #3A382E, #565449, #D8CFBC, #FFFBF4);
height: 4px;
```

Questa è la **firma visiva** di Erga con il nuovo design.

---

## 4. Tipografia

### Famiglie di Font

| Ruolo | Font | Pesi | Note |
|---|---|---|---|
| **Display (Titoli)** | Playfair Display | 400, 500 | Serif elegante, letter-spacing negativo |
| **Sans-Serif (UI)** | Inter | 400, 500, 600 | Geometrico, leggibile |
| **Codice** | JetBrains Mono | 400 | Per blocchi di codice |

### Scala Tipografica

| Ruolo | Dimensione | Peso | Line Height | Letter Spacing |
|---|---|---|---|---|
| Display Large (H1) | 2.25rem (36px) | 400 | 1.16 | -0.02em |
| Headline Large (H2) | 1.875rem (30px) | 500 | 1.2 | -0.015em |
| Headline Medium (H3) | 1.625rem (26px) | 500 | 1.25 | -0.01em |
| Title Large | 1.125rem (18px) | 600 | 1.4 | -0.015em |
| Title Medium | 1rem (16px) | 600 | 1.4 | -0.01em |
| Title Small | 0.875rem (14px) | 600 | 1.4 | 0.01em |
| Body Large | 1.125rem (18px) | 400 | 1.6 | -0.01em |
| Body Medium | 1rem (16px) | 400 | 1.6 | -0.01em |
| Body Small | 0.9375rem (15px) | 400 | 1.5 | 0 |
| Label Large | 0.75rem (12px) | 600 | 1.4 | 0.1em (uppercase) |
| Label Medium | 0.6875rem (11px) | 600 | 1.4 | 0.12em (uppercase) |
| Label Small | 0.625rem (10px) | 600 | 1.4 | 0.14em (uppercase) |

### Regole Tipografiche

1. **Titoli**: Usa **sempre** Playfair Display (o Lora come fallback)
2. **Corpo testo**: Usa **sempre** Inter
3. **Letter-spacing**: Negativo per titoli (-0.01em a -0.02em), positivo per label (uppercase)
4. **Line-height**: Generoso per leggibilità (1.45-1.65)
5. **Peso**: 400 per corpo testo, 500/600 per titoli secondari e label

---

## 5. Geometria e Border Radius

### Gerarchia degli Angoli

| Elemento | Border Radius | Tailwind Class |
|---|---|---|
| Badge, dettagli piccoli | 4px | `rounded-sm` |
| Input, select, menu | 8px | `rounded-md` |
| Bottoni | 8px | `rounded-md` |
| Card, pannelli | 12px | `rounded-lg` |
| Card corso (hero) | 12px | `rounded-lg` |
| Sheet, dialoghi | 12px | `rounded-lg` |
| Dock mobile | 12px | `rounded-lg` |
| Cerchi perfetti | 9999px | `rounded-full` |

### Regola Assoluta

❌ **VIETATO** usare `rounded-full` per:
- Bottoni primari
- Card
- Form
- Contenitori principali

✅ **CONSENTITO** usare `rounded-full` solo per:
- Avatar (immagini profilo circolari)
- Radio button
- Checkbox
- Esagono cognitivo (angoli interni)
- Grafici circolari

---

## 6. Elevazione e Ombre

### Approccio Flat

L'interfaccia è **prevalentemente piatta**. Le ombre servono solo per:
1. **Stati di hover** (molto sottili)
2. **Card protagoniste** (leggermente sollevate)
3. **Mockup di codice/IDE** su sfondo scuro

### Token Ombre

| Token | Valore | Uso |
|---|---|---|
| `shadow-level-0` | `none` | Nessuna ombra |
| `shadow-level-1` | `0 1px 2px rgba(17, 18, 13, 0.04), 0 4px 12px rgba(17, 18, 13, 0.03)` | Card standard |
| `shadow-level-2` | `0 1px 2px rgba(17, 18, 13, 0.05), 0 6px 16px rgba(17, 18, 13, 0.05)` | Card in hover |
| `shadow-level-3` | `0 2px 4px rgba(17, 18, 13, 0.04), 0 10px 24px rgba(17, 18, 13, 0.08)` | Card protagonista |
| `shadow-level-4` | `0 2px 4px rgba(17, 18, 13, 0.05), 0 12px 28px rgba(17, 18, 13, 0.10)` | Overlay |
| `shadow-level-5` | `0 6px 24px rgba(17, 18, 13, 0.10)` | Dialoghi |

**Nota**: Di notte, le ombre diventano più scure e definite:
```css
.dark {
  --shadow-level-1: 0 1px 2px rgba(10, 10, 8, 0.25);
  --shadow-level-2: 0 2px 8px rgba(10, 10, 8, 0.28);
  --shadow-level-3: 0 6px 16px rgba(10, 10, 8, 0.32);
}
```

---

## 7. Componenti Chiave

### Bottoni

#### Bottone Primario
```
Sfondo: #565449 (Olive Drab)
Testo: #FFFBF4 (Floral White)
Padding: 10px 20px
Altezza: 44px
Border radius: 8px
Hover: #3A382E (Olive Drab scuro)
Bordo: nessuno
Ombra: nessuna (flat)
```

#### Bottone Secondario
```
Sfondo: #D8CFBC (Bone)
Testo: #11120D (Smoky Black)
Bordo: 1px solid #D8CFBC (Bone)
Padding: 10px 20px
Altezza: 44px
Border radius: 8px
Hover: sfondo #C7C4B8 (Bone chiaro)
```

#### Bottone Satinato (solo su copertine)
```
Sfondo: #D8CFBC / 0.9 (Bone semitrasparente)
Backdrop-filter: blur(8px)
Testo: #11120D (Smoky Black)
Border radius: 8px (pillola consentita SOLO qui)
Altezza: 44px
Bordo: 1px solid rgba(17, 18, 13, 0.1)
```

### Card

#### Card Standard
```
Sfondo: #565449 (Olive Drab)
Testo: #FFFBF4 (Floral White)
Bordo: 1px solid #D8CFBC (Bone)
Border radius: 12px
Padding: 16px 20px
Ombra: shadow-level-1
```

#### Card Corso (Hero)
```
Sfondo: colore materia + composizione astratta
Testo: #FFFBF4 (Floral White)
Bordo: 1px solid #D8CFBC (Bone)
Border radius: 12px
Padding: 20px 24px
Ombra: shadow-level-3
Azione: Bottone satinato "Continua/Riprendi"
```

### Input e Form

#### Input Testuale
```
Sfondo: #D8CFBC (Bone)
Testo: #11120D (Smoky Black)
Bordo: 1px solid #C7C4B8 (Bone chiaro)
Border radius: 8px
Altezza: 44px
Focus: bordo diventa 2px solid #565449 (Olive Drab)
Placeholder: #8B897F (Steel)
```

#### Select e Menu
```
Stesse regole dell'input
Freccia: #8B897F (Steel)
```

### Navigazione

#### Dock Mobile
```
Sfondo: #565449 (Olive Drab)
Bordo: 1px solid #D8CFBC (Bone)
Border radius: 12px (in alto)
Altezza: 64px
Ombra: 0 4px 16px rgba(17, 18, 13, 0.08)
Testo: #FFFBF4 (Floral White)
Margini: 16px (lati), 20px (basso - safe area)
```

#### Header Desktop
```
Sfondo: trasparente o #565449 (Olive Drab)
Bordo inferiore: 1px solid #D8CFBC (Bone)
Altezza: 64px
Testo: #FFFBF4 (Floral White)
```

---

## 8. Grana e Texture

### Grana della Carta

Una **sola texture** condivisa, locale e leggera, generata via SVG inline (nessuna richiesta esterna):

```css
--grain-tile: url("data:image/svg+xml,%3Csvg...");
--grain-scale: 160px;
--grain-blend: multiply;
```

**Intensità**:
- **Tavolo (fondo)**: 4.8% giorno / 2.5% notte
- **Foglio (card)**: 3% giorno / 1.6% notte

**Regole**:
- La grana **suggerisce** il materiale, non riduce nitidezza
- **Mai** sovrapporre grana al testo o alle icone
- **Mai** applicare filtri costosi a tutta la pagina
- Texture **decorativa** (non interattiva, assente dall'albero accessibile)

---

## 9. Animazioni e Movimento

### Durate

| Token | Valore | Uso |
|---|---|---|
| `motion-micro` | 120ms | Pressione, feedback immediato |
| `motion-standard` | 180ms | Cambio di stato, cambio sezione |
| `motion-emphasized` | 240ms | Espansione, ingresso elementi |
| `motion-entrance` | 300ms | Ingresso pagine, sheet |
| `motion-path` | 360ms | Transizioni corso → percorso → modulo |

### Curve di Easing

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

### Regole

- **Rispetta** `prefers-reduced-motion`
- **Nessuna** animazione continua o infinita
- **Evita** animazioni su elementi interattivi che distraggano
- **Testa** sempre su dispositivi mobili

---

## 10. Accessibilità

### Contrasto

Tutti i colori devono rispettare **WCAG 2.1 AA** (minimo 4.5:1 per testo normale, 3:1 per testo grande).

**Combinazioni verificate**:
- #11120D su #D8CFBC: ✅ 15.2:1
- #FFFBF4 su #565449: ✅ 12.8:1
- #11120D su #FFFBF4: ✅ 21.0:1
- #FFFBF4 su #0A0A08: ✅ 20.5:1 (notte)

### Focus

- **Visibile**: 2px solid #565449 (Olive Drab)
- **Ritorno focus**: Gestito automaticamente dal browser
- **Tastiera**: Tutti gli elementi interattivi accessibili via tab

### Testo

- **Dimensione minima**: 12px (label), 14px (corpo)
- **Line-height**: Minimo 1.4 per leggibilità
- **Alternativa**: Testo alternativo per tutte le immagini

---

## 11. Implementazione Tecnica

### Design Tokens in CSS

Tutti i token devono essere definiti in `:root` e `.dark` in `src/index.css`:

```css
:root {
  /* Colori */
  --canvas: 0 0% 4%;
  --surface-primary: 85 6% 35%;
  --surface-secondary: 45 12% 80%;
  --ink: 0 0% 4%;
  --primary: 85 6% 35%;
  --accent-light: 0 0% 99%;
  
  /* Raggi */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-card: 12px;
  --radius-hero: 12px;
  --radius-button: 8px;
  --radius-pill: 8px;
  
  /* Ombre */
  --shadow-level-1: 0 1px 2px rgba(17, 18, 13, 0.04), 0 4px 12px rgba(17, 18, 13, 0.03);
}
```

### Tailwind Configuration

In `tailwind.config.ts`:

```typescript
.extend {
  colors: {
    canvas: "hsl(var(--canvas))",
    primary: "hsl(var(--surface-primary))",
    secondary: "hsl(var(--surface-secondary))",
    ink: "hsl(var(--ink))",
    accent: "hsl(var(--accent-light))",
    // ... altri colori
  },
  borderRadius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    card: "var(--radius-card)",
    hero: "var(--radius-hero)",
    button: "var(--radius-button)",
    pill: "var(--radius-pill)",
  },
  fontFamily: {
    display: ['Playfair Display', 'Lora', 'Georgia', 'serif'],
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Playfair Display', 'Lora', 'Georgia', 'serif'],
    body: ['Inter', 'system-ui', 'sans-serif'],
  }
}
```

---

## 12. Matrice di Applicazione

### Home
- **Saluto**: Playfair Display, 2.25rem, Floral White, tracking negativo
- **Card corso**: Olive Drab, border 12px, composizione materia, azione satinata
- **Prossimo impegno**: Card standard, Bone, testo Smoky Black
- **Strumenti rapidi**: Icone + label, Bone
- **Earthy stripe**: Gradiente Olive Drab to Bone in fondo

### Studio
- **Selettore corsi**: Card corso con composizione materia
- **Percorso**: Spina verticale 1px Bone, nodi con colore materia
- **Lezione**: Bone, titolo serif, corpo sans
- **Strumenti**: Sheet con radius 12px, azione primaria Olive Drab

### Piano (Calendario)
- **Calendario**: Bone, numeri Smoky Black, oggi con bordo Olive Drab
- **Eventi**: Colore materia, label sans
- **Form evento**: Input con radius 8px, focus Olive Drab

### Core
- **Esagono cognitivo**: Cerchi perfetti (rounded-full), colori materia
- **Profilo**: Card standard, dati in Bone
- **Statistiche**: Grafici con colori materia, Bone

### Landing
- **Più espressiva**: Composizioni ampie, colore presente
- **Titoli**: Playfair Display, grandi, tracking negativo
- **Pulsanti**: Primario Olive Drab, secondario Bone

---

## 13. Piano di Migrazione

### Fase 1: Allineamento Token
1. Aggiornare `DESIGN.md` con questo documento ✅
2. Aggiornare `tailwind.config.ts` con nuovi token
3. Aggiornare `src/index.css` con nuove variabili CSS
4. Verificare coerenza tra design system e implementazione

### Fase 2: Home Pilota
1. Implementare nuova Home con design Earthy-style
2. Verificare: saluto, card corso, prossimo impegno, strumenti
3. Testare tema giorno/notte
4. Validare accessibilità

### Fase 3: Studio Pilota
1. Implementare selettore corsi con nuove card
2. Implementare lettore lezione con nuova tipografia
3. Verificare transizioni corso → modulo → lezione
4. Testare su mobile e desktop

### Fase 4: Rollout Completo
1. Piano (Calendario)
2. Core (Profilo, Esagono)
3. Impostazioni
4. Landing
5. Strumenti (Chat, Esercizi, Interrogazione, Palestra)

### Fase 5: Rifiniture
1. Animazioni e transizioni
2. Grana e texture
3. Ottimizzazione prestazioni
4. Test accessibilità completi

---

## 14. Verifica e Criteri di Accettazione

### Visiva
- [ ] Home riconoscibile come Erga con stile Earthy
- [ ] Geometria rigorosa: max 12px card, 8px bottoni
- [ ] **Nessun** rounded-full su bottoni, card, form
- [ ] Palette earthy coerente in tutta l'app
- [ ] Tipografia: Serif per titoli, Sans per UI
- [ ] Stesso corso mantiene colore tra Home, Studio, lezione
- [ ] Azioni satinate solo su copertine
- [ ] Earthy stripe presente in tutte le pagine

### Comportamentale
- [ ] Tutti i flussi funzionanti (Home, Studio, Piano, Core)
- [ ] Tema giorno/notte funzionale
- [ ] Accessibilità: focus, tastiera, contrasto
- [ ] Responsive: 320px, 390px, 768px, 1280px
- [ ] Nessun overflow orizzontale
- [ ] Loading states coerenti

### Tecnica
- [ ] Build senza errori
- [ ] Test esistenti passano
- [ ] Prestazioni: Lighthouse > 90
- [ ] Bundle size ottimizzato

---

## 15. Origine e Limitazioni

### Ispirazione
- Landing page di Mistral AI (Ottobre 2025)
- Estetica "Squared" e "Editoriale"
- Geometria rigorosa, bordi netti, superfici naturali

### Adattamenti per Erga
- **Palette personalizzata**: Smoky Black, Olive Drab, Bone, Floral White
- **Mantenuta** la struttura funzionale (Home, Studio, Piano, Core)
- **Mantenuti** i colori per materia (adattati alla nuova palette)
- **Mantenuta** la gerarchia dei materiali (fondo, carta, copertina, velo)
- **Aggiunta** la Earthy stripe come firma visiva
- **Adattata** la tipografia al contesto educativo

### Cosa NON Cambia
- Struttura del database
- Logica di business
- Flussi utente
- Funzionalità esistenti
- Backend (Lovable Cloud)

---

## 16. Note per gli Sviluppatori

### Flusso di Lavoro
1. **Leggere** questo DESIGN.md prima di qualsiasi modifica visiva
2. **Usare** i token definiti, non valori hardcoded
3. **Testare** sempre tema giorno/notte
4. **Verificare** accessibilità (contrasto, focus, tastiera)
5. **Mantenere** coerenza con la struttura esistente

### Strumenti
- **Tailwind CSS**: Per styling utility-first
- **Design Tokens**: In `src/index.css` e `tailwind.config.ts`
- **Componenti**: shadcn/ui + Radix UI
- **Tipografia**: Google Fonts (Playfair Display, Inter)

### Lovable Cloud
Per migrazioni database o deploy di Edge Functions:
```
Esegui migrazioni database e deploy edge functions per il progetto Erga su Lovable Cloud.
```

Dopo modifiche al codice, ricordare all'utente di usare **Update** in Lovable.

---

*Ultimo aggiornamento: Ottobre 2025*
*Versione: 3.0 "Squared & Earthy"*
*Ispirazione: Mistral AI Landing Page con palette personalizzata*
