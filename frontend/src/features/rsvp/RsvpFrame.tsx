import type { ReactNode } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";

const card =
  "organic-shape-1 w-full max-w-xl bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]";

interface RsvpFrameProps {
  children: ReactNode;
  /** A wide photo above the card; decorative, so screen readers skip it. */
  picture: string;
}

/** The guests' side of the app: a photo and one card, with the language switch above them. */
export function RsvpFrame({ children, picture }: RsvpFrameProps) {
  const { t, toggleLanguage } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-gradient-to-br from-primary-fixed via-background to-tertiary-fixed px-4 py-12">
      <div className="flex w-full max-w-xl justify-end">
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded-full border border-primary bg-surface-container-lowest px-4 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
        >
          {t("rsvp.otherLanguage")}
        </button>
      </div>
      <img
        src={picture}
        alt=""
        className="organic-shape-1 aspect-[8/3] w-full max-w-xl object-cover shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
      />
      <div className={card}>{children}</div>
    </main>
  );
}
