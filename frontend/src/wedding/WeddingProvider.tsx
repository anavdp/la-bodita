import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Wedding, WeddingChanges } from "../api/types";
import { listWeddings, updateWedding } from "../api/weddings";

export interface WeddingContextValue {
  wedding: Wedding | null;
  isLoading: boolean;
  /** Why the wedding did not load (an ApiError, usually), or null. */
  error: unknown;
  /** Reads the wedding again, after a failed load. */
  reload: () => void;
  /** Saves Settings and shares the result with every screen; rejects if it could not. */
  saveWedding: (changes: WeddingChanges) => Promise<void>;
}

type WeddingState = Omit<WeddingContextValue, "saveWedding" | "reload">;

export const WeddingContext = createContext<WeddingContextValue | null>(null);

/**
 * Loads the tenant root once, for the whole app: the sidebar needs its name and
 * date, and every screen needs its id to scope what it reads.
 */
export function WeddingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WeddingState>({
    wedding: null,
    isLoading: true,
    error: null,
  });

  // Bumped by reload, so the load below runs again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    listWeddings()
      .then((weddings) => {
        if (active) {
          setState({ wedding: weddings[0] ?? null, isLoading: false, error: null });
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setState({ wedding: null, isLoading: false, error: failure });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    setAttempt((current) => current + 1);
  }, []);

  const weddingId = state.wedding?.id;
  const saveWedding = useCallback(
    async (changes: WeddingChanges) => {
      if (weddingId === undefined) {
        throw new Error("There is no wedding to save");
      }
      const saved = await updateWedding(weddingId, changes);
      setState((current) => ({ ...current, wedding: saved }));
    },
    [weddingId],
  );

  const value = useMemo(() => ({ ...state, reload, saveWedding }), [state, reload, saveWedding]);
  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
}

export function useWedding(): WeddingContextValue {
  const value = useContext(WeddingContext);
  if (value === null) {
    throw new Error("useWedding must be used inside a WeddingProvider");
  }
  return value;
}
