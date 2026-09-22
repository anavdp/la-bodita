import { useTranslation } from "../i18n/LanguageProvider";
import type { TranslationKey } from "../i18n/translations";

/** A screen that has its own issue and has not been built yet. */
export function ComingSoon({ titleKey }: { titleKey: TranslationKey }) {
  const { t } = useTranslation();

  return (
    <div className="organic-shape-1 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">{t(titleKey)}</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant">{t("comingSoon.body")}</p>
    </div>
  );
}
