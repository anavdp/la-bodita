import { useId, useState } from "react";

import type { Household } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { backdrop, dialogTitle, panel, secondaryButton, useCloseOnEscape } from "./dialogStyles";

interface HouseholdDeleteDialogProps {
  household: Household;
  /** True deletes the guests with it; false keeps each of them on their own. */
  onConfirm: (deleteGuests: boolean) => Promise<void>;
  onClose: () => void;
}

export function HouseholdDeleteDialog({ household, onConfirm, onClose }: HouseholdDeleteDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  useCloseOnEscape(onClose);
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const count = household.guestIds.length;

  const confirm = async (deleteGuests: boolean) => {
    setHasFailed(false);
    setIsBusy(true);
    try {
      await onConfirm(deleteGuests);
    } catch {
      setHasFailed(true);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className={backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={panel}>
        <h2 id={titleId} className={dialogTitle}>
          {t("households.delete.title", { name: household.name })}
        </h2>
        <p className="mb-6 text-xl text-ink/80">
          {count === 1 ? t("households.delete.questionOne") : t("households.delete.questionMany", { count })}
        </p>

        {hasFailed && (
          <p role="alert" className="mb-4 text-lg text-coral">
            {t("households.delete.failed")}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void confirm(false)}
            className={secondaryButton}
          >
            {t("households.delete.keepGuests")}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void confirm(true)}
            className="inline-flex items-center justify-center rounded-[22px] border-[2.5px] border-ink bg-coral px-6 py-3 font-playful text-[22px] text-white transition-[filter] hover:brightness-95 disabled:opacity-50"
          >
            {t("households.delete.withGuests")}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("guests.form.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
