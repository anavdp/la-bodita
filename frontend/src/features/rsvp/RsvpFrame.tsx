import type { ReactNode } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";

const card =
  "organic-shape-1 w-full max-w-xl bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]";

/** The guests' side of the app: one card on the page, with the language switch above it. */
export function RsvpFrame({ children }: { children: ReactNode }) {
  const { t, toggleLanguage } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-background px-4 py-12">
      <div className="flex w-full max-w-xl justify-end">
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded-full border border-primary px-4 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
        >
          {t("rsvp.otherLanguage")}
        </button>
      </div>
      <div className={card}>{children}</div>
    </main>
  );
}
