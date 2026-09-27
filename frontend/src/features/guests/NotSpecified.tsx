import { useTranslation } from "../../i18n/LanguageProvider";

/** A dash on screen, "not specified" to a screen reader and on hover. */
export function NotSpecified() {
  const { t } = useTranslation();
  const label = t("guests.notSpecified");
  return (
    <span role="img" aria-label={label} title={label} className="text-outline">
      —
    </span>
  );
}
