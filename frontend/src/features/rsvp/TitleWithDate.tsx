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
      <h1 className="font-headline-lg text-headline-lg text-primary">{title}</h1>
      <p className="font-headline-md text-headline-md text-on-surface-variant">{t("rsvp.weddingDate")}</p>
    </div>
  );
}
