import { Navigate, useSearchParams } from "react-router-dom";

import { googleSignInUrl } from "../api/auth";
import { primaryButton, outlinedCard } from "../components/playful/styles";
import { useTranslation } from "../i18n/LanguageProvider";
import type { TranslationKey } from "../i18n/translations";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useAuth } from "./AuthProvider";

const errorMessages: Record<string, TranslationKey> = {
  not_allowed: "login.error.not_allowed",
  cancelled: "login.error.cancelled",
  failed: "login.error.failed",
  not_configured: "login.error.not_configured",
};

/** Google's "G", in its own colours as Google asks for sign-in buttons. */
function GoogleMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
        <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
      </svg>
    </span>
  );
}

/**
 * The planner's front door, in the shell's playful look: the sidebar's blue
 * band with the logo, and one button that goes to Google. Whoever is already
 * signed in goes straight through.
 */
export function LoginPage() {
  const { t, language, toggleLanguage } = useTranslation();
  const { status } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  if (status === "signedIn") {
    return <Navigate to="/" replace />;
  }

  return (
    <ThemeProvider>
      <main className="flex min-h-screen items-center justify-center bg-cream px-margin-mobile py-10 font-playful text-ink">
        <div className={`${outlinedCard} w-full max-w-[440px] overflow-hidden`}>
          <div className="flex items-start justify-between gap-4 border-b-[2.5px] border-ink bg-sidebar px-8 pb-8 pt-7">
            <div>
              <h1 className="playful-outline -rotate-3 font-playful-logo text-[56px] leading-none text-paper [--playful-outline:#1f1d2b]">
                La Bodita
              </h1>
              <p className="mt-4 inline-block -rotate-6 rounded-md border-[2.5px] border-ink bg-butter px-4 py-1 font-playful-display text-xl uppercase leading-tight shadow-[3px_3px_0_rgba(31,29,43,0.2)]">
                {t("login.welcome")}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t("layout.language", { code: language.toUpperCase() })}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-lg transition-colors hover:bg-white/15"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                language
              </span>
              {language.toUpperCase()}
            </button>
          </div>

          <div className="flex flex-col gap-6 px-8 py-8">
            <p className="text-xl">{t("login.body")}</p>
            {error !== null && (
              <p role="alert" className="rounded-2xl border-2 border-ink bg-coral-soft px-4 py-3 text-lg">
                {t(errorMessages[error] ?? "login.error.failed")}
              </p>
            )}
            <a href={googleSignInUrl()} className={`${primaryButton} w-full`}>
              <GoogleMark />
              {t("login.google")}
            </a>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}
