import { useState } from "react";
import type { FormEvent } from "react";

import { DatePicker } from "../../components/form/DatePicker";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { CountdownSticker } from "../../components/layout/CountdownSticker";
import { screenIcons } from "../../components/playful/icons";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useWedding } from "../../wedding/WeddingProvider";

const hint = "mt-1.5 text-base text-ink/70";

/** "2026-10-29" as that day in the viewer's calendar, written out with its year. */
function fullDate(iso: string, language: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(language, { dateStyle: "full" }).format(new Date(year, month - 1, day));
}

/**
 * The gear's drawer: the wedding's title and date. A drawer rather than a page,
 * since it is two fields reached from every screen and should leave you where you were.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t, language } = useTranslation();
  const { wedding, saveWedding } = useWedding();

  const [name, setName] = useState(wedding?.name ?? "");
  const [weddingDate, setWeddingDate] = useState<string | null>(wedding?.wedding_date ?? null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("settings.titleRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveWedding({ name: name.trim(), wedding_date: weddingDate });
      onClose();
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t("layout.settings")} icon={screenIcons.settings} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor="wedding-title" className={fieldLabel}>
              {t("settings.weddingTitle")}
            </label>
            <input
              id="wedding-title"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              className={pillField}
            />
            <p className={hint}>{t("settings.titleHint")}</p>
          </div>
          <div>
            <DatePicker label={t("settings.weddingDate")} value={weddingDate} onChange={setWeddingDate} />
            <p className={hint}>{t("settings.dateHint")}</p>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-[24px] border-[2.5px] border-dashed border-ink/40 px-6 py-6 text-center">
            {weddingDate !== null && <p className="text-lg first-letter:uppercase">{fullDate(weddingDate, language)}</p>}
            <CountdownSticker weddingDate={weddingDate} />
          </div>
          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("planning.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t("planning.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
