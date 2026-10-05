import { useTranslation } from "../../i18n/LanguageProvider";
import { emphasize } from "./emphasize";

/**
 * The wedding's date and place, set apart in the brand violet so it is the
 * first thing a guest reads. Written out rather than read from the wedding
 * record, which still holds an older date.
 */
export function WhenAndWhere() {
  const { t } = useTranslation();

  return (
    <div className="organic-shape-3 mb-6 flex items-start gap-4 bg-primary px-5 py-4 text-on-primary shadow-md">
      <span aria-hidden="true" className="material-symbols-outlined icon-filled mt-1 text-[28px]">
        celebration
      </span>
      <p className="font-body-lg text-body-lg">
        {emphasize(t("rsvp.whenAndWhere"), {
          date: <strong className="font-headline-md text-[22px]">{t("rsvp.weddingDate")}</strong>,
          place: <strong>{t("rsvp.weddingPlace")}</strong>,
        })}
      </p>
    </div>
  );
}
