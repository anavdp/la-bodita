import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface SearchContextValue {
  term: string;
  setTerm: (term: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

interface SearchProviderProps {
  children: ReactNode;
  initialTerm?: string;
}

/**
 * The top bar's search box lives in the shared shell, above the screen it
 * filters, so the term it holds is shared state rather than a screen's own.
 */
export function SearchProvider({ children, initialTerm = "" }: SearchProviderProps) {
  const [term, setTerm] = useState(initialTerm);
  const value = useMemo(() => ({ term, setTerm }), [term]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext);
  if (value === null) {
    throw new Error("useSearch must be used inside a SearchProvider");
  }
  return value;
}
