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
        <p className="mb-6 font-body-lg text-body-lg text-on-surface-variant">
          {count === 1 ? t("households.delete.questionOne") : t("households.delete.questionMany", { count })}
        </p>

        {hasFailed && (
          <p role="alert" className="mb-4 font-body-sm text-body-sm text-error">
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
            className="rounded-full bg-error px-6 py-3 font-label-md text-label-md text-on-error shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
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
