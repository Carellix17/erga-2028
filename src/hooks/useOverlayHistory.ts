import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const OVERLAY_HISTORY_STATE_KEY = "__ergaOverlayHistoryId";

type LocationStateRecord = Record<string, unknown>;

function getOverlayHistoryId(state: unknown): string | null {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return null;
  const value = (state as LocationStateRecord)[OVERLAY_HISTORY_STATE_KEY];
  return typeof value === "string" ? value : null;
}

function copyLocationState(state: unknown): LocationStateRecord {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return {};
  return { ...(state as LocationStateRecord) };
}

/**
 * Gives a transient fullscreen overlay its own browser-history entry without
 * changing the URL. Back closes the overlay first; an explicit close consumes
 * that entry so the next Back continues to the previous app location.
 *
 * If the overlay is reopened before that explicit-close POP settles, the new
 * open is queued and receives a fresh entry after the close completes. This
 * keeps the pending Back from being mistaken for a Back on the reopened view.
 */
export function useOverlayHistory(onBack: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeEntryIdRef = useRef<string | null>(null);
  const closingEntryIdRef = useRef<string | null>(null);
  const reopenAfterCloseRef = useRef(false);
  const sequenceRef = useRef(0);
  const onBackRef = useRef(onBack);
  const currentEntryId = getOverlayHistoryId(location.state);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const pushEntry = useCallback(() => {
    if (closingEntryIdRef.current) {
      reopenAfterCloseRef.current = true;
      return;
    }
    if (activeEntryIdRef.current) return;

    const entryId = `${Date.now()}-${++sequenceRef.current}`;
    activeEntryIdRef.current = entryId;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { state: { ...copyLocationState(location.state), [OVERLAY_HISTORY_STATE_KEY]: entryId } },
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const closeEntry = useCallback(() => {
    const activeEntryId = activeEntryIdRef.current;
    if (!activeEntryId || closingEntryIdRef.current === activeEntryId) return;

    // A browser Back may already have moved away from the overlay while React
    // is waiting to run its location effect. Let that POP close the UI once.
    if (currentEntryId !== activeEntryId) {
      activeEntryIdRef.current = null;
      return;
    }

    closingEntryIdRef.current = activeEntryId;
    navigate(-1);
  }, [currentEntryId, navigate]);

  useEffect(() => {
    const closingEntryId = closingEntryIdRef.current;
    if (closingEntryId) {
      if (currentEntryId === closingEntryId) return;

      closingEntryIdRef.current = null;
      if (activeEntryIdRef.current === closingEntryId) activeEntryIdRef.current = null;

      if (reopenAfterCloseRef.current) {
        reopenAfterCloseRef.current = false;
        pushEntry();
      }
      return;
    }

    const activeEntryId = activeEntryIdRef.current;
    if (!activeEntryId || activeEntryId === currentEntryId) return;

    activeEntryIdRef.current = null;
    onBackRef.current();
  }, [currentEntryId, location.key, pushEntry]);

  return { pushEntry, closeEntry };
}
