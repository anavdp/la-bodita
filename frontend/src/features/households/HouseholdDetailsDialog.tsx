import { useId } from "react";

import type { Guest, Household } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { fullName } from "../guests/filtering";
import { membersOf } from "../guests/households";
import { rsvpLabelKey } from "../guests/vocabulary";
import { backdrop, dialogTitle, fieldLabel, panel, secondaryButton, useCloseOnEscape } from "./dialogStyles";
import { RsvpLinkActions } from "./RsvpLinkActions";

interface HouseholdDetailsDialogProps {
  household: Household;
  guests: Guest[];
  onClose: () => void;
}

/** Who is in a household, how each has answered, and the link they answer through. */
export function HouseholdDetailsDialog({ household, guests, onClose }: HouseholdDetailsDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const membersId = useId();
  useCloseOnEscape(onClose);

  return (
    <div className={backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={panel}>
        <h2 id={titleId} className={dialogTitle}>
          {household.name}
        </h2>

        <h3 id={membersId} className={fieldLabel}>
          {t("households.details.members")}
        </h3>
        <ul aria-labelledby={membersId} className="mb-6 flex flex-col divide-y divide-surface-container">
          {membersOf(household, guests).map((guest) => (
            <li key={guest.id} className="flex items-center justify-between py-3 font-body-sm text-body-sm">
              <span className="font-title-lg text-title-lg text-on-surface">{fullName(guest)}</span>
              <span className="text-on-surface-variant">{t(rsvpLabelKey(guest.rsvpStatus))}</span>
            </li>
          ))}
        </ul>

        <div className="mb-6 flex items-center justify-between gap-3">
          <span className={fieldLabel}>{t("households.details.rsvpLink")}</span>
          <RsvpLinkActions label={household.name} token={household.rsvpToken} />
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("households.details.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
