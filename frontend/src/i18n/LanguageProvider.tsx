import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { translations } from "./translations";
import type { Language, TranslationKey } from "./translations";

type Replacements = Record<string, string | number>;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, values?: Replacements) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, values?: Replacements): string {
  if (values === undefined) {
    return template;
  }
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({ children, initialLanguage = "en" }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const toggleLanguage = useCallback(
    () => setLanguage((current) => (current === "en" ? "es" : "en")),
    [],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (key, values) => interpolate(translations[language][key], values),
    }),
    [language, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (value === null) {
    throw new Error("useTranslation must be used inside a LanguageProvider");
  }
  return value;
}
