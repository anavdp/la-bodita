import { useState } from "react";
import type { FormEvent } from "react";

import type { BookedRooms, Guest, Household, HouseholdBooking, RoomType } from "../../api/types";
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
import { bookedHouseholds, partyOf } from "./weBook";
import { hotelIcon, rideIcon } from "./WeBookStats";

interface WeBookDialogProps {
  /** The booked household being edited, or null to add one. */
  household: Household | null;
  /** Every household, to pick the one to add. */
  households: Household[];
  guests: Guest[];
  /** The hotel's room types, in its order. */
  roomTypes: RoomType[];
  onSave: (householdId: number, booking: HouseholdBooking) => Promise<void>;
  onClose: () => void;
}

const stepper =
  "flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-ink bg-cream-light text-xl transition-colors hover:bg-accent/60 disabled:opacity-40";
const choiceRow = (isOn: boolean) =>
  `flex items-center gap-4 rounded-[20px] border-[2.5px] border-ink px-4 py-3 ${isOn ? "bg-accent/50" : "bg-cream-light"}`;

/** How many of each room type, keyed by room type id. */
type RoomCounts = Record<number, number>;

const toCounts = (rooms: BookedRooms[]): RoomCounts =>
  Object.fromEntries(rooms.map((room) => [room.roomTypeId, room.count]));

/**
 * Puts a household on the We book list, or changes what we book for it: hotel
 * rooms by type, a ride, who drives. Each type says how many the hotel has left,
 * counting every other household's booking, so a type cannot be overbooked here.
 */
export function WeBookDialog({ household, households, guests, roomTypes, onSave, onClose }: WeBookDialogProps) {
  const { t } = useTranslation();
  const problemText = useProblemText();
  const [householdId, setHouseholdId] = useState(household === null ? "" : String(household.id));
  const [counts, setCounts] = useState<RoomCounts>(toCounts(household?.rooms ?? []));
  const [needsRide, setNeedsRide] = useState(household?.needsRide ?? false);
  const [rideWith, setRideWith] = useState(household?.rideWith ?? "");
  const [error, setError] = useState<Problem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Adding offers only households not on the list yet; editing keeps its own.
  const alreadyBooked = new Set(bookedHouseholds(households).map((each) => each.id));
  const picked = households.find((each) => String(each.id) === householdId);
  const party = picked === undefined ? null : partyOf(picked, guests);
  /** Rooms of a type the other households already have. */
  const takenElsewhere = (roomTypeId: number) =>
    households
      .filter((each) => each.id !== household?.id)
      .flatMap((each) => each.rooms)
      .filter((room) => room.roomTypeId === roomTypeId)
      .reduce((sum, room) => sum + room.count, 0);
  const countOf = (roomTypeId: number) => counts[roomTypeId] ?? 0;
  const change = (roomTypeId: number, by: number) =>
    setCounts((current) => ({ ...current, [roomTypeId]: Math.max(0, (current[roomTypeId] ?? 0) + by) }));
  const rooms: BookedRooms[] = roomTypes
    .filter((roomType) => countOf(roomType.id) > 0)
    .map((roomType) => ({ roomTypeId: roomType.id, count: countOf(roomType.id) }));

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
    if (rooms.length === 0 && !needsRide) {
      setError("weBook.form.nothingBooked");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(Number(householdId), { rooms, needsRide, rideWith: needsRide ? rideWith.trim() : "" });
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

          {party !== null && (
            <p className="font-playful text-lg text-ink">
              {t("weBook.form.party", { adults: party.adults, children: party.children })}
            </p>
          )}

          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>{t("weBook.form.whatWeBook")}</legend>
            <div className={`${choiceRow(rooms.length > 0)} flex-col !items-stretch !gap-2`}>
              <div className="flex items-center gap-3">
                <img src={hotelIcon} alt="" className="h-10 w-10 object-contain" />
                <span className="font-playful text-lg">{t("weBook.form.rooms")}</span>
              </div>
              {roomTypes.length === 0 && (
                <p className="font-playful text-base text-ink/60">{t("weBook.form.noRoomTypes")}</p>
              )}
              {roomTypes.map((roomType) => {
                const count = countOf(roomType.id);
                const left = roomType.available - takenElsewhere(roomType.id) - count;
                const leftText = left > 0 ? t("weBook.form.left", { count: left }) : t("weBook.form.noneLeft");
                return (
                  <div key={roomType.id} className="flex items-center gap-3 border-t-2 border-ink/10 pt-2 font-playful">
                    <span className="flex flex-1 flex-col leading-tight">
                      <span className="text-lg">{roomType.name}</span>
                      <span className={`text-sm ${left > 0 ? "text-ink/60" : "text-coral"}`}>
                        {roomType.beds === null ? leftText : `${roomType.beds} · ${leftText}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={t("weBook.form.fewer", { name: roomType.name })}
                      disabled={count === 0}
                      onClick={() => change(roomType.id, -1)}
                      className={stepper}
                    >
                      −
                    </button>
                    <span data-testid={`count-${roomType.id}`} className="w-6 text-center text-2xl">
                      {count}
                    </span>
                    <button
                      type="button"
                      aria-label={t("weBook.form.more", { name: roomType.name })}
                      disabled={left <= 0}
                      onClick={() => change(roomType.id, 1)}
                      className={stepper}
                    >
                      +
                    </button>
                  </div>
                );
              })}
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
