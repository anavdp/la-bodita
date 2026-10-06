import type { ReactNode } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";

const card =
  "organic-shape-1 relative w-full max-w-xl bg-surface-container-lowest p-8 shadow-[0px_8px_30px_rgba(0,0,0,0.12)]";

interface RsvpFrameProps {
  children: ReactNode;
  /**
   * The photo across the top of the page, edge to edge; decorative, so screen
   * readers skip it. It is framed on its upper part, where faces usually are.
   */
  picture?: string;
  /** A different crop for phones, when the wide one does not frame well on a narrow screen. */
  phonePicture?: string;
}

/**
 * The guests' side of the app: a full-width photo, and one card pulled up over
 * its bottom edge with the language switch in its corner.
 */
export function RsvpFrame({ children, picture, phonePicture }: RsvpFrameProps) {
  const { t, toggleLanguage } = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-br font-guest from-primary-fixed via-background to-tertiary-fixed">
      <div className="relative">
        {/* Left empty while a page is still working out which photo it shows. */}
        {picture === undefined ? (
          <div className="h-72 w-full sm:h-[26rem]" />
        ) : (
          <picture>
            {phonePicture !== undefined && <source media="(max-width: 639px)" srcSet={phonePicture} />}
            <img src={picture} alt="" className="h-72 w-full object-cover object-[center_35%] sm:h-[26rem]" />
          </picture>
        )}
        {/* A violet wash at the bottom, so the card's top edge sits on color rather than on the photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/50 to-transparent"
        />
      </div>
      <div className="relative -mt-12 flex justify-center sm:-mt-20 px-4 pb-12">
        <div className={card}>
          {/* In the corner, level with the title, rather than on a row of its own. */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="absolute right-8 top-8 rounded-full border-2 border-on-secondary-fixed-variant px-3 py-1 text-[13px] font-semibold text-on-secondary-fixed-variant transition-colors hover:bg-primary-fixed"
          >
            {t("rsvp.otherLanguage")}
          </button>
          {children}
        </div>
      </div>
    </main>
  );
}
