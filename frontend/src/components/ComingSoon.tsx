import { useTranslation } from "../i18n/LanguageProvider";
import type { TranslationKey } from "../i18n/translations";
import { PageHeader } from "./playful/PageHeader";

/** A screen that has its own issue and has not been built yet, already wearing its title and illustration. */
export function ComingSoon({ titleKey, art }: { titleKey: TranslationKey; art?: string }) {
  const { t } = useTranslation();

  return <PageHeader title={t(titleKey)} subtitle={t("comingSoon.body")} art={art} />;
}
