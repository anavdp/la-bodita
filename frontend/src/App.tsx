import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ComingSoon } from "./components/ComingSoon";
import { AppLayout } from "./components/layout/AppLayout";
import { GuestListPage } from "./features/guests/GuestListPage";
import { RsvpLookupPage } from "./features/rsvp/RsvpLookupPage";
import { RsvpPage } from "./features/rsvp/RsvpPage";
import { RsvpThanksPage } from "./features/rsvp/RsvpThanksPage";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { WeddingProvider } from "./wedding/WeddingProvider";

/**
 * Every planner screen sits in the shared shell. Only the guest list is built so
 * far; the rest each have their own issue and show a placeholder until then.
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
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/guests" replace />} />
        <Route path="/guests" element={<GuestListPage tab="guests" />} />
        <Route path="/guests/households" element={<GuestListPage tab="households" />} />
        <Route path="/dashboard" element={<ComingSoon titleKey="nav.dashboard" />} />
        <Route path="/items" element={<ComingSoon titleKey="nav.items" />} />
        <Route path="/checklist" element={<ComingSoon titleKey="nav.checklist" />} />
        <Route path="/calendar" element={<ComingSoon titleKey="nav.calendar" />} />
        <Route path="/budget" element={<ComingSoon titleKey="nav.budget" />} />
        <Route path="/documents" element={<ComingSoon titleKey="nav.documents" />} />
        <Route path="/categories" element={<ComingSoon titleKey="nav.categories" />} />
        <Route path="*" element={<Navigate to="/guests" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <WeddingProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </WeddingProvider>
    </LanguageProvider>
  );
}
