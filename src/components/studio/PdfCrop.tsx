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

  // The file at `url` is normally ALREADY cropped (server-side via canvas),
  // and bbox is full-rect {0,0,100,100}. In that case we just render the
  // image at its natural aspect ratio with object-contain.
  // Legacy path: if bbox covers only a sub-region (width<100 or height<100
  // or x>0 or y>0), we still use the scale+translate trick to crop on the fly.
  const isFullRect = bbox.x <= 0.5 && bbox.y <= 0.5 && bbox.width >= 99.5 && bbox.height >= 99.5;
  const scaleX = 100 / bbox.width;
  const scaleY = 100 / bbox.height;
  const cropAspect = bbox.width / bbox.height;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full overflow-hidden rounded-2xl bg-transparent shadow-none ring-1 ring-border/40 transition-all duration-300 active:scale-[0.98]",
          className,
        )}
        style={isFullRect ? undefined : { aspectRatio: cropAspect }}
        aria-label={description || "Apri figura"}
      >
        {isFullRect ? (
          <img
            src={url}
            alt={description || "Figura dal materiale"}
            onLoad={() => setLoaded(true)}
            className="block w-full h-auto max-h-[60vh] rounded-2xl object-cover mx-auto select-none pointer-events-none"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl bg-transparent"
          >
            <img
              src={url}
              alt={description || "Figura dal materiale"}
              onLoad={() => setLoaded(true)}
              className="block w-full h-full rounded-2xl object-cover select-none pointer-events-none"
              style={{
                transform: `scale(${scaleX}, ${scaleY}) translate(${-bbox.x}%, ${-bbox.y}%)`,
                transformOrigin: "0 0",
                objectPosition: "0 0",
              }}
              loading="lazy"
              draggable={false}
            />
          </div>
        )}
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
