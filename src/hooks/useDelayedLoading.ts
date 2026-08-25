import { useEffect, useState } from "react";

/**
 * useDelayedLoading — evita micro-sfarfallii per fetch ultra-veloci (<100ms)
 * Mostra lo skeleton solo se isLoading persiste oltre delay (default 100ms)
 * Se il fetch è velocissimo, non mostra mai lo skeleton → zero flicker
 */
export function useDelayedLoading(isLoading: boolean, delay = 100): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return show;
}
