import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusContextValue {
  status: SaveStatus;
  reportSaving: () => void;
  reportSaved: () => void;
  reportError: (message?: string) => void;
  errorMessage: string | null;
}

const SaveStatusContext = createContext<SaveStatusContextValue | null>(null);

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inflight = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearIdleTimer = () => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = undefined;
    }
  };

  const reportSaving = useCallback(() => {
    inflight.current += 1;
    clearIdleTimer();
    setErrorMessage(null);
    setStatus("saving");
  }, []);

  const reportSaved = useCallback(() => {
    inflight.current = Math.max(0, inflight.current - 1);
    if (inflight.current === 0) {
      setStatus("saved");
      clearIdleTimer();
      idleTimer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }, []);

  const reportError = useCallback((message?: string) => {
    inflight.current = Math.max(0, inflight.current - 1);
    setErrorMessage(message ?? "Errore di salvataggio");
    setStatus("error");
    clearIdleTimer();
    idleTimer.current = setTimeout(() => setStatus("idle"), 4000);
  }, []);

  useEffect(() => () => clearIdleTimer(), []);

  return (
    <SaveStatusContext.Provider value={{ status, reportSaving, reportSaved, reportError, errorMessage }}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus() {
  const ctx = useContext(SaveStatusContext);
  if (!ctx) throw new Error("useSaveStatus must be used within SaveStatusProvider");
  return ctx;
}