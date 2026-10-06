import type { ReactNode } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";

const card =
  "organic-shape-1 w-full max-w-xl bg-surface-container-lowest p-8 shadow-[0px_8px_30px_rgba(0,0,0,0.12)]";

interface RsvpFrameProps {
  children: ReactNode;
  /**
   * The photo across the top of the page, edge to edge; decorative, so screen
   * readers skip it. It is framed on its upper part, where faces usually are.
   */
  picture: string;
}

/**
 * The guests' side of the app: a full-width photo with the language switch on
 * it, and one card pulled up over its bottom edge.
 */
export function RsvpFrame({ children, picture }: RsvpFrameProps) {
  const { t, toggleLanguage } = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-fixed via-background to-tertiary-fixed">
      <div className="relative">
        <img src={picture} alt="" className="h-72 w-full object-cover object-[center_35%] sm:h-[26rem]" />
        {/* A violet wash at the bottom, so the card's top edge sits on color rather than on the photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/50 to-transparent"
        />
        <button
          type="button"
          onClick={toggleLanguage}
          className="absolute right-4 top-4 rounded-full border border-primary bg-surface-container-lowest px-4 py-2 font-label-md text-label-md text-primary shadow-md transition-colors hover:bg-primary-fixed"
        >
          {t("rsvp.otherLanguage")}
        </button>
      </div>
      <div className="relative -mt-20 flex justify-center px-4 pb-12">
        <div className={card}>{children}</div>
      </div>
    </main>
  );
}
