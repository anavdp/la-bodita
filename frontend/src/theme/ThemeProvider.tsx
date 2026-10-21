import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

export const themeStorageKey = "la-bodita.theme";

const darkQuery = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Private windows and blocked site data throw on storage: the theme then just isn't remembered. */
function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Not remembered, but still applied for this visit.
  }
}

function systemTheme(): Theme {
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

/**
 * The planner's light/dark theme. Until the couple picks one it follows the
 * system; once they toggle, their choice is remembered on this browser. It is
 * applied as a `dark` class on <html> only while the planner is mounted, so the
 * guests' RSVP pages, which stand outside the shell, always stay light.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [savedTheme, setSavedTheme] = useState<Theme | null>(readSavedTheme);
  const [followedTheme, setFollowedTheme] = useState<Theme>(systemTheme);
  const theme = savedTheme ?? followedTheme;

  useEffect(() => {
    const query = window.matchMedia(darkQuery);
    const follow = (event: { matches: boolean }) => setFollowedTheme(event.matches ? "dark" : "light");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, []);

  // Layout effect, so the first paint is already in the right theme.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    setSavedTheme(next);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return value;
}
