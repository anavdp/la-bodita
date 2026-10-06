import { useTranslation } from "../../i18n/LanguageProvider";

/**
 * A guest page's title with the wedding date under it.
 * The date is written out rather than read from the wedding record, which
 * still holds an older one.
 */
export function TitleWithDate({ title }: { title: string }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-col gap-1">
      {/* Room on the right for the language switch in the card's corner. */}
      <h1 className="pr-24 text-[40px] font-extrabold leading-[1.05] tracking-tight text-primary">{title}</h1>
      <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-primary">{t("rsvp.weddingDate")}</p>
    </div>
  );
}
