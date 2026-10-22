import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { Wedding } from "../api/types";
import { LanguageProvider } from "../i18n/LanguageProvider";
import type { Language } from "../i18n/translations";
import { SearchProvider } from "../search/SearchProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { WeddingContext } from "../wedding/WeddingProvider";
import type { WeddingContextValue } from "../wedding/WeddingProvider";

export const aWedding: Wedding = {
  id: 1,
  name: "La Bodita",
  wedding_date: "2026-10-29",
};

interface Options {
  route?: string;
  /** The route pattern to mount the element at, when it reads route params. */
  path?: string;
  wedding?: Partial<WeddingContextValue>;
  /** Seeds the top bar's search box, which screens below it filter by. */
  searchTerm?: string;
  language?: Language;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route = "/guests", path, wedding = {}, searchTerm = "", language = "en" } = options;
  const weddingValue: WeddingContextValue = {
    wedding: aWedding,
    isLoading: false,
    error: null,
    ...wedding,
  };

  const wrapped: ReactNode = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  );

  return render(
    <MemoryRouter initialEntries={[route]}>
      <LanguageProvider initialLanguage={language}>
        <WeddingContext.Provider value={weddingValue}>
          <ThemeProvider>
            <SearchProvider initialTerm={searchTerm}>{wrapped}</SearchProvider>
          </ThemeProvider>
        </WeddingContext.Provider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}
