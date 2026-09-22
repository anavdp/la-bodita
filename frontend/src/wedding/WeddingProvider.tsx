import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { Wedding } from "../api/types";
import { listWeddings } from "../api/weddings";

export interface WeddingContextValue {
  wedding: Wedding | null;
  isLoading: boolean;
  error: string | null;
}

export const WeddingContext = createContext<WeddingContextValue | null>(null);

/**
 * Loads the tenant root once, for the whole app: the sidebar needs its name and
 * date, and every screen needs its id to scope what it reads.
 */
export function WeddingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WeddingContextValue>({
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

  return <WeddingContext.Provider value={state}>{children}</WeddingContext.Provider>;
}

export function useWedding(): WeddingContextValue {
  const value = useContext(WeddingContext);
  if (value === null) {
    throw new Error("useWedding must be used inside a WeddingProvider");
  }
  return value;
}
