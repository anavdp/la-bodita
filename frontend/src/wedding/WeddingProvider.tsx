import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Wedding, WeddingChanges } from "../api/types";
import { listWeddings, updateWedding } from "../api/weddings";

export interface WeddingContextValue {
  wedding: Wedding | null;
  isLoading: boolean;
  error: string | null;
  /** Saves Settings and shares the result with every screen; rejects if it could not. */
  saveWedding: (changes: WeddingChanges) => Promise<void>;
}

type WeddingState = Omit<WeddingContextValue, "saveWedding">;

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

  useEffect(() => {
    let active = true;

    listWeddings()
      .then((weddings) => {
        if (active) {
          setState({ wedding: weddings[0] ?? null, isLoading: false, error: null });
        }
      })
      .catch((failure: Error) => {
        if (active) {
          setState({ wedding: null, isLoading: false, error: failure.message });
        }
      });

    return () => {
      active = false;
    };
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

  const value = useMemo(() => ({ ...state, saveWedding }), [state, saveWedding]);
  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
}

export function useWedding(): WeddingContextValue {
  const value = useContext(WeddingContext);
  if (value === null) {
    throw new Error("useWedding must be used inside a WeddingProvider");
  }
  return value;
}
