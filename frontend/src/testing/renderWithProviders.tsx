import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { SignedInUser, Wedding } from "../api/types";
import { AuthContext } from "../auth/AuthProvider";
import type { AuthContextValue } from "../auth/AuthProvider";
import { LanguageProvider } from "../i18n/LanguageProvider";
import type { Language } from "../i18n/translations";
import { SearchProvider } from "../search/SearchProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { WeddingContext } from "../wedding/WeddingProvider";
import type { WeddingContextValue } from "../wedding/WeddingProvider";

export const aSignedInUser: SignedInUser = { email: "vicky@example.com", displayName: "Vicky" };

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
  /** Who is signed in; Vicky unless a test says otherwise. */
  auth?: Partial<AuthContextValue>;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route = "/guests", path, wedding = {}, searchTerm = "", language = "en", auth = {} } = options;
  const authValue: AuthContextValue = {
    status: "signedIn",
    user: aSignedInUser,
    signOut: () => Promise.resolve(),
    ...auth,
  };
  const weddingValue: WeddingContextValue = {
    wedding: aWedding,
    isLoading: false,
    error: null,
    saveWedding: () => Promise.resolve(),
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
        <AuthContext.Provider value={authValue}>
          <WeddingContext.Provider value={weddingValue}>
            <ThemeProvider>
              <SearchProvider initialTerm={searchTerm}>{wrapped}</SearchProvider>
            </ThemeProvider>
          </WeddingContext.Provider>
        </AuthContext.Provider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}
