import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AuthProvider, RequireSignIn } from "./auth/AuthProvider";
import { LoginPage } from "./auth/LoginPage";
import { ComingSoon } from "./components/ComingSoon";
import { AppLayout } from "./components/layout/AppLayout";
import { BudgetPage } from "./features/budget/BudgetPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { ChecklistPage } from "./features/checklist/ChecklistPage";
import { DocumentsPage } from "./features/documents/DocumentsPage";
import { GuestListPage } from "./features/guests/GuestListPage";
import { ItemsPage } from "./features/items/ItemsPage";
import { RsvpLookupPage } from "./features/rsvp/RsvpLookupPage";
import { RsvpPage } from "./features/rsvp/RsvpPage";
import { RsvpThanksPage } from "./features/rsvp/RsvpThanksPage";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { WeddingProvider } from "./wedding/WeddingProvider";

/**
 * Every planner screen sits in the shared shell, behind sign-in: the wedding
 * itself is only loaded once someone is signed in. The guest list, items,
 * checklist, calendar, budget, documents and categories are built; the rest each have their own issue and show a
 * placeholder until then.
 * The RSVP pages are the guests' side, so they stand outside the shell: /rsvp
 * finds a household by name, /rsvp/:token is that household's invitation, and
 * /rsvp/:token/gracias thanks them once they have answered.
 * Most guests read Spanish, so those pages open in Spanish - one language
 * shared by both, so a guest who switches carries it onto their invitation -
 * while the planner keeps its own default.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <LanguageProvider initialLanguage="es">
            <Outlet />
          </LanguageProvider>
        }
      >
        <Route path="/rsvp" element={<RsvpLookupPage />} />
        <Route path="/rsvp/:token" element={<RsvpPage />} />
        <Route path="/rsvp/:token/gracias" element={<RsvpThanksPage />} />
      </Route>
      {/* The planner's side: only the RSVP pages above are reachable without signing in. */}
      <Route
        element={
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireSignIn />}>
          <Route
            element={
              <WeddingProvider>
                <AppLayout />
              </WeddingProvider>
            }
          >
              <Route index element={<Navigate to="/guests" replace />} />
              <Route path="/guests" element={<GuestListPage tab="guests" />} />
              <Route path="/guests/households" element={<GuestListPage tab="households" />} />
              <Route path="/dashboard" element={<ComingSoon titleKey="nav.dashboard" />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/checklist" element={<ChecklistPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/documents" element={<DocumentsPage tab="papers" />} />
              <Route path="/documents/all" element={<DocumentsPage tab="all" />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="*" element={<Navigate to="/guests" replace />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LanguageProvider>
  );
}
