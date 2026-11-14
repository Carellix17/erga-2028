import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/* ── what this block expects the page to provide ───────

#liq-goo — an SVG filter the stylesheet points at. Mount it once,
   anywhere in the page, inside an <svg width="0" height="0"
   style={{ position: "absolute" }}><defs>…</defs></svg>:

   <filter id="liq-goo" x="-50%" y="-50%" width="200%" height="200%"
           colorInterpolationFilters="sRGB">
     <feGaussianBlur in="SourceGraphic" stdDeviation={7} result="smear" />
     <feColorMatrix
       in="smear"
       type="matrix"
       values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
     />
   </filter>

   This toggle does not reference the filter. The note stays because
   the stylesheet comment still points at it, and the picture assets
   it was built around are not part of this project.
*/

/* ══ Liquid ═══════════════════════════════════════════════
   Three metaball studies: a toggle, a reorderable list, and
   a create menu.

   RECONSTRUCTED. The original file was destroyed; this is
   rebuilt against the surviving stylesheet, which specifies
   the geometry, the layering and the timing exactly. The
   behaviour matches what index.css and the catalog demos
   require. The original's internal reasoning is not
   recoverable and is not reproduced here.

   ── the shared constraint ───────────────────────────────
   Everything on a filtered layer must be OPAQUE. The goo
   filter thresholds alpha, so a translucent fill under it
   disappears. That is why each of these has two layers: an
   opaque blob layer that carries the filter, and an unfiltered
   layer above it carrying the text — antialiased type would
   be eaten by the same threshold. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ══ 1 · Toggle ═══════════════════════════════════════════
   Two blobs, not one. The thumb crosses at once and a smaller
   drop follows it late, so for most of the crossing the pair
   is stretched into a single waisted capsule. They must stay
   OVERLAPPED — a goo bridge across a real gap comes out thin
   and reads as two blobs and a thread. */

const TRACK = 92;
/* ── the droplet, and the air round it ─────────────────────
   36 in a 46 track, so five pixels of track show all the way
   round. It was 40 with three, which is a thumb pressed into
   its slot; five is a droplet sitting in one.

   PAD is the same five, and it has to be: the inset at the
   ends and the inset above and below are the same gap seen
   twice, and at 40/4 they were 3 and 4 — near enough to look
   like a mistake rather than a decision.

   The size is handed to the stylesheet as `--liq-thumb`
   rather than written there as well. The travel maths needs
   it and so does the circle, and two copies of a number that
   must agree is one copy too many. */
const THUMB = 36;
const PAD = (46 - THUMB) / 2;

/* the two ends of the thumb's travel, and the line between */
const SHUT_X = PAD;
const OPEN_X = TRACK - THUMB - PAD;
const MID_X = (SHUT_X + OPEN_X) / 2;

/* 23 is half of the 46px track — the pill it already is. The
   thumb stays round whatever this says: it is a droplet, and
   the whole component is about liquid. */

export function LiquidToggle({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  /* how much the droplet lengthens into its own travel,
     0..100 — the dragging ball's knob, and the same idea */
  stretch = 36,
  /* how fast it crosses, 0..100 */
  speed = 50,
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  stretch?: number;
  speed?: number;
}) {
  /* `checked` is the app. `on` is the droplet, which has to move
     before a save echoes the prop. `expected` is the value we
     asked the app for; while it differs and the control is
     disabled, a save is in flight and the droplet keeps that
     value. When the save ends without the prop catching up, it
     returns. */
  const [on, setOn] = useState(checked);
  const expected = useRef(checked);
  /* held, so the settling spring knows to keep out of the way
     while a finger owns the thumb */
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  heldRef.current = held;
  /* the pointer is over the switch. State and not `:hover`,
     because what it drives is a spring in the same transform
     the position lives in — see the note on `swell`. */
  const [hot, setHot] = useState(false);
  const reduced = usePrefersReducedMotion();
  const onRef = useRef(on);
  onRef.current = on;
  /* A real tap emits pointerup and then click. The pointer
     already settled the gesture, so the click that follows must
     not toggle again. A click with no pointer (a test, or a
     button activation that never went through the pointer) still
     toggles. The ticket lets a missing click expire without
     eating the next one. */
  const swallowClick = useRef(false);
  const swallowTicket = useRef(0);

  useEffect(() => {
    if (heldRef.current) return;
    if (checked === expected.current) return;
    if (disabled) return;
    expected.current = checked;
    setOn(checked);
  }, [checked, disabled]);

  /* ── NO GOO. There is nothing left for it to merge. ──────
     The filter existed to fuse the thumb with the straggler
     running behind it: blur everything, then threshold the
     alpha, and two overlapping circles come out as one waisted
     capsule. With the straggler gone it had one circle to
     work on, and a blur-then-threshold pass over a single
     round shape cannot improve it — it can only soften the
     edge, which is exactly what it was doing. That is the
     answer to "why does the dot look low definition": it was
     being rasterised, blurred nine pixels and re-cut at a
     contrast of 19, every frame, for no gain.

     A plain DOM circle with a border-radius is drawn by the
     browser at device resolution and stays crisp at any zoom
     the wall or the canvas asks for. The stretch is a CSS
     transform now rather than a deformation the filter had to
     carry, so nothing here needs the pass. */
  const rail = useRef<HTMLButtonElement | null>(null);
  const grip = useRef<{ id: number; grab: number | null; moved: boolean } | null>(null);

  /* ── ONE POSITION, WRITTEN TWO WAYS ──────────────────────
     The thumb's x is a motion value rather than a prop, which
     is what lets a finger and a spring both drive it without
     one of them having to know about the other: a drag writes
     it directly, a release animates it, and nothing re-renders
     either way.

     The straggler is a SPRING FOLLOWING that value. It used to
     be the same target with a delay on it, which is a good
     description of a click and a poor one of a drag — a delay
     means the drop sets off late and arrives at a place the
     thumb left; a spring means it is always chasing wherever
     the thumb is now, and it stretches by exactly as much as
     you are moving. Drag slowly and the pair stays one shape;
     flick and the goo necks out behind it. */
  const x = useMotionValue<number>(checked ? OPEN_X : SHUT_X);

  /* ── ONE BODY. STRETCH, NOT A TRAIL. ─────────────────────
     There was a second, smaller blob running behind this one
     on a lagging spring, and the goo between them necked into
     a thread — which is what a trail IS, and what it looks
     like: a droplet dragging a tail, or at speed two separate
     circles. The dragging ball had the same thing and lost it
     for the same reason; its note is the long version.

     What replaces it is the ball's own answer. The ONE body
     lengthens along its direction of travel and thins across
     it, so the elasticity is in the shape of the thing moving
     rather than in something left behind — and there is
     nothing to leave behind, because there is nothing behind
     it.

     Area is kept: scaleY is 1/scaleX, so the thumb is the same
     amount of droplet whatever it is doing. */
  const vel = useVelocity(x);
  const eased = useSpring(vel, { stiffness: 380, damping: 34, mass: 0.6 });
  /* ── the divisor is the whole tuning ─────────────────────
     The thumb's peak speed on a 44px crossing is about 150px
     a second, so dividing by 1400 asked it to reach 1400 to
     mean anything: measured, the stretch peaked at 1.039 —
     arithmetically present and invisible. 600 puts the peak at
     about 1.09 at the default, which is the ball's own kind of
     give, and the cap at 0.4 leaves the top of the knob
     somewhere to go. */
  const lengthen = (v: number) =>
    1 + Math.min(0.4, Math.abs(v) / 600) * (clamp(stretch, 0, 100) / 100);

  /* ── the hover swell goes in the SAME transform ──────────
     It was the CSS `scale` property, on the reasoning that
     `scale` is its own property and would compose with
     whatever the transform was doing. It composes, but not
     independently: the individual transform properties apply
     BEFORE `transform`, so `scale: 1.035` scaled the
     coordinate system that `translateX(51px)` then moved
     through — 51 became 52.8, and the droplet drifted toward
     the end of the track it was already sitting at.

     It only showed on the ON state, and the arithmetic says
     why: the error is the translate times 3.5%, and the
     translate is 5 when the switch is off and 51 when it is
     on. Measured at 51 — the right margin should have gone
     5 to 4.37 and went to 2.58 instead.

     Multiplied into scaleX and scaleY here, it is a swell
     about the droplet's own centre and the position is
     untouched. The stretch stays area-preserving inside it. */
  const swell = useSpring(!reduced && hot ? 1.035 : 1, {
    stiffness: 380,
    damping: 34,
    mass: 0.6,
  });
  /* Reduced motion drops the stretch and the swell. The calm
     value is a motion input so the transform recomputes when
     the preference flips, not on the next drag. */
  const calm = useMotionValue(reduced ? 1 : 0);
  useEffect(() => {
    calm.set(reduced ? 1 : 0);
  }, [calm, reduced]);
  const wide = useTransform([eased, swell, calm], ([v, s, c]: number[]) => (c ? 1 : lengthen(v) * s));
  const tall = useTransform([eased, swell, calm], ([v, s, c]: number[]) => (c ? 1 : s / lengthen(v)));

  /* ── how the thumb lands when it is let go ───────────────
     Bounce is the damping and Speed is the stiffness, so both
     knobs are properties of one spring rather than of a curve.

     SOFTER THAN IT WAS. At 220/20 the default zeta was 0.71
     and the crossing was quick with a visible snap at the end
     — a switch throwing itself to the other side. 170/21.5 is
     zeta 0.87: it still arrives with a hint of give, and the
     hint is the whole of it. The dragging ball is the
     reference, and what makes that one feel gentle is not a
     slow spring but the absence of a hard stop; the same
     applies here, and the goo doing the necking is the other
     half of it.

     Damping is a constant now. It was the Bounce knob, and a
     switch is not a thing anybody wants a bounce dial on: the
     whole range from dead to lively is the difference between
     a control that works and one that is showing off, and 21.5
     is the answer. Speed still moves, because how fast a
     switch crosses is a real question. */
  const settle = useMemo(
    () => ({
      type: "spring" as const,
      stiffness: 170 - (50 - speed) * 1.1,
      damping: 21.5,
      mass: 0.9,
    }),
    [speed],
  );

  /* Rest is wherever `on` says, and it is only ever applied
     when nothing is holding the thumb. The cleanup stopping
     the animation is what makes grabbing it mid-flight work:
     `held` turning true tears down the settle and leaves the
     value exactly where the spring had got to. Reduced motion
     puts the droplet down where it belongs, with no spring. */
  useEffect(() => {
    if (held) return;
    const target = on ? OPEN_X : SHUT_X;
    if (reduced) {
      x.set(target);
      return;
    }
    const run = animate(x, target, settle);
    return () => run.stop();
  }, [on, held, x, settle, reduced]);

  /* the component is drawn at whatever fraction the card
     allows, so a client delta has to be divided back out
     before it means anything in the track's own units */
  const local = (clientX: number) => {
    const el = rail.current;
    if (!el) return 0;
    const b = el.getBoundingClientRect();
    const k = b.width / (el.offsetWidth || b.width) || 1;
    return (clientX - b.left) / k;
  };

  const commit = (next: boolean) => {
    if (disabled || next === onRef.current) return;
    onRef.current = next;
    expected.current = next;
    setOn(next);
    onCheckedChange?.(next);
  };

  const armSwallow = () => {
    swallowClick.current = true;
    const ticket = ++swallowTicket.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (swallowTicket.current === ticket) swallowClick.current = false;
      });
    });
  };

  const down = (e: ReactPointerEvent) => {
    if (disabled) return;
    /* ── NO OFFSET YET. It is taken at the first MOVE. ──────
       This used to decide here: grabbed on the thumb it kept
       the offset you took hold of, and grabbed anywhere else
       it set the offset to half a thumb so the droplet "came
       to the finger and centred under it". It did not come —
       it TELEPORTED. `x.set()` is a hard write with no spring
       behind it, so the first pointermove after an off-thumb
       press moved the droplet the whole way in a single frame.
       Measured: pressed at 80 with the droplet at 5, it went
       46px between two frames.

       Taking the offset at the first move instead means that
       move produces no displacement at all and every one after
       it tracks the delta — so a drag always starts from where
       the droplet actually is. There is no press anywhere on
       this control that can make it jump.

       What it costs: an off-thumb press-and-drag no longer
       brings the droplet under your finger, it moves it by how
       far you dragged. On a 92px track you are never far from
       the thumb, and a 46px teleport is the worse of the
       two. */
    grip.current = { id: e.pointerId, grab: null, moved: false };
    setHeld(true);
    /* it throws if the id is not a live pointer — a synthetic
       event from a test or a rehearsal is exactly that — and
       the drag is perfectly usable without it, so it must not
       take the grab down with it */
    try { rail.current?.setPointerCapture(e.pointerId); } catch { /* not live */ }
  };

  const move = (e: ReactPointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId || disabled) return;
    const at = local(e.clientX);
    /* the offset, taken from where the droplet IS — see the
       note in `down`. The first move therefore asks for
       exactly the position it already has. */
    if (g.grab === null) g.grab = at - x.get();
    const next = clamp(at - g.grab, SHUT_X, OPEN_X);
    if (Math.abs(next - x.get()) > 0.4) g.moved = true;
    x.set(next);
    /* the continuous voice, pitched to where it has got to and
       floored so a fast sweep is a rise and not a rattle */
    /* it flips as it passes the middle rather than on release,
       so the track answers under your finger */
    commit(next > MID_X);
  };

  const up = (e: ReactPointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    /* ── AND THE RELEASE IS GUARDED TOO ────────────────────
       `releasePointerCapture` throws if the pointer was never
       captured — which is now possible, because the capture in
       `down` is itself guarded and can quietly fail. Unguarded
       it threw before `setHeld(false)`, and a switch left
       `held` never settles: the rest spring is torn down while
       held, so the droplet stopped wherever the drag ended and
       stayed there. Caught in a test, where the synthetic
       pointer made the capture fail every time — but a real
       pointer that is gone by the time the handler runs does
       the same thing. */
    try { rail.current?.releasePointerCapture?.(e.pointerId); } catch { /* never captured */ }
    armSwallow();
    /* A press that never travelled is a CLICK, and a click
       toggles — the switch has to keep working as a switch. */
    if (!g.moved) commit(!onRef.current);
    setHeld(false);
  };

  return (
    <div className="liq-well" style={{ "--liq-thumb": `${THUMB}px` } as CSSProperties}>
      <button
        ref={rail}
        id={id}
        type="button"
        className="liq-sw"
        data-on={on}
        role="switch"
        aria-checked={on}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        disabled={disabled && !held}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerEnter={() => { if (!disabled) setHot(true); }}
        onPointerLeave={() => setHot(false)}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          commit(!onRef.current);
        }}
        /* the keyboard still gets a plain switch */
        onKeyDown={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          e.preventDefault();
          armSwallow();
          commit(!onRef.current);
        }}
      >
        <span className="liq-sw-blobs" aria-hidden="true">
          <motion.span className="liq-thumb" style={{ x, scaleX: wide, scaleY: tall }} />
        </span>
      </button>
    </div>
  );
}
