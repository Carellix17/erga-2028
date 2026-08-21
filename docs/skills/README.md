# Skill integrate in Erga

Questa cartella conserva le guide usate dagli assistenti che lavorano sul progetto.
Non viene caricata nell'app e non aumenta il peso delle pagine per gli utenti.

## Skill disponibili

| Skill | Quando usarla | Regola principale |
|---|---|---|
| [Frontend Design](frontend-design/SKILL.md) | Pagine, componenti e stile | Creare un design intenzionale e riconoscibile, non un'interfaccia AI generica. |
| [Scroll Experience](scroll-experience/SKILL.md) | Parallax, sticky, reveal e storytelling | Migliorare lo scroll naturale senza prenderne il controllo. |
| [3D Web Experience](3d-web-experience/SKILL.md) | WebGL, Three.js, R3F e Spline | Usare il 3D soltanto se comunica qualcosa che 2D o SVG non comunicano altrettanto bene. |

Le regole applicative specifiche di Erga sono riassunte nel file [`AGENTS.md`](../../AGENTS.md) alla radice del repository.

## Skill installate tramite CLI

Le skill aggiunte con `skills` e `impeccable` sono conservate in `.agents/skills/` e rese disponibili anche agli harness Claude Code e GitHub Copilot. Comprendono:

- Emil Kowalski motion/design engineering skills;
- Impeccable 4.1.1;
- `design-taste-frontend` da Leonxlnx/taste-skill.

`skills-lock.json` registra le sorgenti e gli hash delle skill installate. `PRODUCT.md` conserva invece la verità di prodotto confermata durante `/impeccable init`.

Le licenze delle skill installate sono conservate in `.agents/skills/_licenses/`: MIT per Emil Kowalski e Taste Skill, Apache 2.0 con NOTICE per Impeccable.

## Precedenza

Le skill sono fonti di progettazione, non obblighi a inserire effetti. In caso di conflitto prevalgono:

1. sicurezza;
2. accessibilità;
3. chiarezza;
4. prestazioni;
5. identità di Erga;
6. effetti visivi.

## Licenza

Le skill originali sono conservate con la licenza fornita dall'utente, disponibile in [`LICENSE.txt`](LICENSE.txt). Le regole specifiche di Erga in `AGENTS.md` sono documentazione interna del progetto.
