import { useTranslation } from "../../i18n/LanguageProvider";
import { daysUntil } from "./countdown";

/** The yellow sticker under the logo, also shown in Settings as a preview of the date being picked. */
export function CountdownSticker({ weddingDate }: { weddingDate: string | null }) {
  const { t } = useTranslation();

  const label = (): string => {
    if (!weddingDate) {
      return t("layout.dateToBeDecided");
    }
    const remaining = daysUntil(weddingDate);
    return remaining > 0 ? t("layout.daysToGo", { count: remaining }) : t("layout.today");
  };

  return (
    <p className="inline-block -rotate-6 rounded-md border-[2.5px] border-ink bg-butter px-4 py-2 font-playful-display text-2xl uppercase leading-tight text-ink shadow-[3px_3px_0_rgba(31,29,43,0.2)]">
      {label()}
    </p>
  );
}
