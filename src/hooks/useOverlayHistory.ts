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
 */
export function useOverlayHistory(onBack: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeEntryIdRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const onBackRef = useRef(onBack);
  const currentEntryId = getOverlayHistoryId(location.state);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const pushEntry = useCallback(() => {
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
    if (!activeEntryId) return;

    activeEntryIdRef.current = null;
    if (currentEntryId === activeEntryId) navigate(-1);
  }, [currentEntryId, navigate]);

  useEffect(() => {
    const activeEntryId = activeEntryIdRef.current;
    if (!activeEntryId || activeEntryId === currentEntryId) return;

    activeEntryIdRef.current = null;
    onBackRef.current();
  }, [currentEntryId, location.key]);

  return { pushEntry, closeEntry };
}
