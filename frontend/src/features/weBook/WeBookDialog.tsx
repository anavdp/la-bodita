import { useState } from "react";
import type { FormEvent } from "react";

import type { Household, HouseholdBooking } from "../../api/types";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { Switch } from "../../components/form/Switch";
import { fieldLabel, pillField } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { bookedHouseholds } from "./weBook";
import { hotelIcon, rideIcon } from "./WeBookStats";

interface WeBookDialogProps {
  /** The booked household being edited, or null to add one. */
  household: Household | null;
  /** Every household, to pick the one to add. */
  households: Household[];
  onSave: (householdId: number, booking: HouseholdBooking) => Promise<void>;
  onClose: () => void;
}

const stepper =
  "flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-ink bg-cream-light text-xl transition-colors hover:bg-accent/60 disabled:opacity-40";
const choiceRow = (isOn: boolean) =>
  `flex items-center gap-4 rounded-[20px] border-[2.5px] border-ink px-4 py-3 ${isOn ? "bg-accent/50" : "bg-cream-light"}`;

/** Puts a household on the We book list, or changes what we book for it: hotel rooms, a ride, who drives. */
export function WeBookDialog({ household, households, onSave, onClose }: WeBookDialogProps) {
  const { t } = useTranslation();
  const problemText = useProblemText();
  const [householdId, setHouseholdId] = useState(household === null ? "" : String(household.id));
  const [hotelRooms, setHotelRooms] = useState(household?.hotelRooms ?? 1);
  const [needsRide, setNeedsRide] = useState(household?.needsRide ?? false);
  const [rideWith, setRideWith] = useState(household?.rideWith ?? "");
  const [error, setError] = useState<Problem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Adding offers only households not on the list yet; editing keeps its own.
  const alreadyBooked = new Set(bookedHouseholds(households).map((each) => each.id));
  const options = households
    .filter((each) => each.id === household?.id || !alreadyBooked.has(each.id))
    .map((each) => ({ value: String(each.id), label: each.name }))
    .sort((first, second) => first.label.localeCompare(second.label));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (householdId === "") {
      setError("weBook.form.householdRequired");
      return;
    }
    if (hotelRooms === 0 && !needsRide) {
      setError("weBook.form.nothingBooked");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(Number(householdId), { hotelRooms, needsRide, rideWith: needsRide ? rideWith.trim() : "" });
    } catch (failure) {
      setError(failedTo("weBook.form.saveFailed", failure));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel
      title={t(household === null ? "weBook.form.addTitle" : "weBook.form.editTitle")}
      icon={screenIcons.guests}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <Dropdown
            label={t("weBook.form.household")}
            searchable
            value={householdId}
            options={[{ value: "", label: t("weBook.form.pickHousehold") }, ...options]}
            onChange={setHouseholdId}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>{t("weBook.form.whatWeBook")}</legend>
            <div className={choiceRow(hotelRooms > 0)}>
              <img src={hotelIcon} alt="" className="h-10 w-10 object-contain" />
              <span className="flex flex-1 flex-col font-playful leading-tight">
                <span className="text-lg">{t("weBook.form.rooms")}</span>
                <span className="text-base text-ink/60">
                  {hotelRooms === 0
                    ? t("weBook.form.noRooms")
                    : hotelRooms === 1
                      ? t("weBook.form.roomCountOne")
                      : t("weBook.form.roomCountMany", { count: hotelRooms })}
                </span>
              </span>
              <button
                type="button"
                aria-label={t("weBook.form.fewerRooms")}
                disabled={hotelRooms === 0}
                onClick={() => setHotelRooms((rooms) => Math.max(0, rooms - 1))}
                className={stepper}
              >
                −
              </button>
              <span className="w-6 text-center font-playful text-2xl">{hotelRooms}</span>
              <button
                type="button"
                aria-label={t("weBook.form.moreRooms")}
                onClick={() => setHotelRooms((rooms) => rooms + 1)}
                className={stepper}
              >
                +
              </button>
            </div>

            <div className={choiceRow(needsRide)}>
              <img src={rideIcon} alt="" className="h-10 w-10 object-contain" />
              <span className="flex flex-1 flex-col font-playful leading-tight">
                <span className="text-lg">{t("weBook.form.ride")}</span>
                <span className="text-base text-ink/60">{t("weBook.form.rideHint")}</span>
              </span>
              <Switch label={t("weBook.form.ride")} checked={needsRide} onChange={setNeedsRide} />
            </div>

            {needsRide && (
              <div>
                <label className={fieldLabel} htmlFor="we-book-ride-with">
                  {t("weBook.form.rideWith")}
                </label>
                <input
                  id="we-book-ride-with"
                  className={pillField}
                  placeholder={t("weBook.form.rideWithPlaceholder")}
                  value={rideWith}
                  onChange={(event) => setRideWith(event.target.value)}
                />
              </div>
            )}
          </fieldset>

          {error !== null && (
            <p role="alert" className="font-playful text-lg text-coral">
              {problemText(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("guests.form.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t(isSaving ? "guests.form.saving" : "guests.form.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
