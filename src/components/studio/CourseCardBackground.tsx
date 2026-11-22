import { resolveCourseCover, type CourseCover } from "@/lib/courseIdentity";

interface CourseCardBackgroundProps {
  /** Nome/titolo del corso: da qui nasce materia, famiglia e composizione. */
  courseName: string;
  /** Chiave materia personalizzata dall'utente (vince sul rilevamento). */
  customKey?: string | null;
}

/**
 * 🎨 V2-01 — COPERTINA ASTRATTA (DESIGN.md 2.1 §4).
 *
 * Non è più un fondo annerito con orb sfocati: è un campo dominante del
 * colore materia con POCHE FORME NETTE, disposte con intenzione, e una
 * grana condivisa molto discreta. Tre varianti di composizione, stabili
 * per corso (layout = hash materia+corso), così la stessa identità viaggia
 * tra Home, Studio, selettore e modulo senza ballare.
 *
 * La famiglia del campo («light» pastello con testo inchiostro, «deep»
 * profondo con testo carta) e il contrasto ≥ 4,5:1 sono garantiti da
 * `resolveCourseCover` (src/lib/courseIdentity.ts) e verificati dai test.
 *
 * Nessuna immagine di copertina: la copertina è composizione astratta del
 * colore materia, non una foto Wikipedia sfocata (identità superata).
 * Nessun blur: le forme sono geometriche e piene; la profondità la fanno
 * i rapporti di tono, non la sfocatura.
 */
export function CourseCardBackground({ courseName, customKey }: CourseCardBackgroundProps) {
  const cover: CourseCover = resolveCourseCover(courseName, customKey);
  const isDeep = cover.family === "deep";

  return (
    <div aria-hidden data-cover-root data-cover-family={cover.family} data-cover-layout={cover.layout} className="absolute inset-0 overflow-hidden">
      {/* 1) CAMPO DOMINANTE — il colore materia, calibrato sul contrasto. */}
      <div data-cover-layer="field" className="absolute inset-0" style={{ backgroundColor: cover.field }} />

      {/* 2) FORME — due o tre elementi per variante, netti, intenzionali. */}
      {cover.layout === 0 && (
        <>
          {/* «Orbita»: grande cerchio tagliato in alto a destra + punto in basso a sinistra. */}
          <div
            data-cover-layer="shape-main"
            className="absolute -right-[28%] -top-[46%] aspect-square w-[86%] rounded-full"
            style={{ backgroundColor: cover.tone, opacity: isDeep ? 0.5 : 0.4 }}
          />
          <div
            data-cover-layer="shape-dot"
            className="absolute bottom-[12%] left-[7%] aspect-square w-[9%] min-w-[18px] rounded-full"
            style={{ backgroundColor: isDeep ? cover.tone : cover.accent, opacity: isDeep ? 0.65 : 0.5 }}
          />
        </>
      )}

      {cover.layout === 1 && (
        <>
          {/* «Orizzonte»: fascia orizzontale in basso + cerchio che attraversa il suo spigolo. */}
          <div
            data-cover-layer="shape-band"
            className="absolute inset-x-0 bottom-0 h-[34%]"
            style={{ backgroundColor: cover.tone, opacity: isDeep ? 0.55 : 0.42 }}
          />
          <div
            data-cover-layer="shape-main"
            className="absolute right-[10%] bottom-[16%] aspect-square w-[34%] rounded-full"
            style={{
              backgroundColor: isDeep ? cover.field : cover.tone,
              opacity: isDeep ? 0.9 : 0.5,
            }}
          />
        </>
      )}

      {cover.layout === 2 && (
        <>
          {/* «Spigolo»: quarto di cerchio che sale dal bordo destro + arco sottile. */}
          <div
            data-cover-layer="shape-main"
            className="absolute -bottom-[38%] -right-[20%] aspect-square w-[78%] rounded-full"
            style={{ backgroundColor: cover.tone, opacity: isDeep ? 0.5 : 0.4 }}
          />
          <div
            data-cover-layer="shape-arc"
            className="absolute left-[9%] top-[14%] h-[46%] w-[46%] rounded-full border-[10px]"
            style={{ borderColor: isDeep ? cover.tone : cover.accent, opacity: isDeep ? 0.4 : 0.3 }}
          />
        </>
      )}

      {/* 3) GRANA — condivisa, molto discreta (3–5%), sotto il testo. */}
      <div data-cover-layer="grain" className="cover-grain absolute inset-0" />
    </div>
  );
}
