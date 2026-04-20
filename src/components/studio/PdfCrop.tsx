import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfCropProps {
  url: string;
  bbox: { x: number; y: number; width: number; height: number };
  description?: string;
  className?: string;
}

/**
 * Renders a cropped region of a full-page PDF render using CSS positioning.
 * The full page image is loaded but only the bbox region is visible (overflow:hidden + scaled inner img).
 * On click, opens a fullscreen dialog showing the entire page with the figure highlighted.
 */
export function PdfCrop({ url, bbox, description, className }: PdfCropProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // The trick: we put the image inside a container that has overflow:hidden,
  // then scale & translate the image so only the bbox region fills the container.
  // - container has aspect-ratio = bbox.width / bbox.height
  // - image is scaled by 100/bbox.width (horizontally) and 100/bbox.height (vertically)
  // - image is translated by -bbox.x and -bbox.y in % of the SCALED image size
  // Simpler: use CSS clip-path-ish approach with absolute positioning.

  const scaleX = 100 / bbox.width;
  const scaleY = 100 / bbox.height;
  // Use the larger scale to "cover" — but figures are rectangular so use width-based scale and adjust height
  // Cleanest: scale both axes independently (allows non-square crops without distortion since both come from same source)
  const aspect = bbox.width / bbox.height;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full overflow-hidden rounded-xl border border-border bg-surface-container-low shadow-level-1 transition-all duration-300 hover:shadow-level-2 active:scale-[0.98]",
          className,
        )}
        style={{ aspectRatio: aspect }}
        aria-label={description || "Apri figura"}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scaleX}, ${scaleY}) translate(${-bbox.x}%, ${-bbox.y}%)`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
          }}
        >
          <img
            src={url}
            alt={description || "Figura dal materiale"}
            onLoad={() => setLoaded(true)}
            className="block w-full h-full object-cover select-none pointer-events-none"
            style={{ objectPosition: "0 0" }}
            loading="lazy"
            draggable={false}
          />
        </div>
        {!loaded && (
          <div className="absolute inset-0 bg-surface-container animate-pulse" />
        )}
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-level-1">
          <ZoomIn className="w-4 h-4 text-foreground" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 bg-background border-0 overflow-hidden">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-level-2 hover:bg-surface-container-high transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative w-full max-h-[85vh] overflow-auto">
              <img
                src={url}
                alt={description || "Figura dal materiale"}
                className="block w-full h-auto"
              />
              {/* Highlight the figure bbox */}
              <div
                className="absolute pointer-events-none border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${bbox.x}%`,
                  top: `${bbox.y}%`,
                  width: `${bbox.width}%`,
                  height: `${bbox.height}%`,
                }}
              />
            </div>
            {description && (
              <div className="p-4 bg-surface-container-low border-t border-border">
                <p className="body-small text-muted-foreground italic text-center">{description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
