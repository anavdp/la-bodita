import { useState } from "react";
import type { FormEvent } from "react";

import type { Guest, GuestDraft, GuestGender, GuestRelationshipType, GuestSide, RsvpStatus } from "../../api/types";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField as field } from "../../components/form/styles";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import {
  genderLabelKey,
  guestGenders,
  guestSides,
  relationshipLabelKey,
  relationshipTypes,
  rsvpLabelKey,
  rsvpStatuses,
  sideLabelKey,
} from "./vocabulary";

export interface HouseholdOption {
  id: number;
  label: string;
}

interface GuestFormDialogProps {
  /** The guest being edited, or null to create a new one. */
  guest: Guest | null;
  /** The families a guest can join; none picked means a household of their own. */
  households?: HouseholdOption[];
  onSave: (draft: GuestDraft) => Promise<void>;
  onClose: () => void;
}

/** An empty string in a form means "nothing entered"; the API wants null. */
const orNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

/**
 * Which household to send: nothing when it is unchanged (or a guest already on
 * their own stays that way), null to split a family member off, otherwise the
 * one picked.
 */
function chosenHousehold(guest: Guest | null, picked: string, isInFamily: boolean): number | null | undefined {
  if (picked === "") {
    return isInFamily ? null : undefined;
  }
  const householdId = Number(picked);
  return householdId === guest?.householdId ? undefined : householdId;
}

export function GuestFormDialog({ guest, households = [], onSave, onClose }: GuestFormDialogProps) {
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(guest?.firstName ?? "");
  const [lastName, setLastName] = useState(guest?.lastName ?? "");
  const [isChild, setIsChild] = useState(guest?.isChild ?? false);
  const [gender, setGender] = useState<GuestGender | "">(guest?.gender ?? "");
  const [relationshipType, setRelationshipType] = useState<GuestRelationshipType | "">(
    guest?.relationshipType ?? "",
  );
  const [side, setSide] = useState<GuestSide | "">(guest?.side ?? "");
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(guest?.rsvpStatus ?? "pending");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  // The picker lists families only, so a guest on their own starts on "On their own".
  const isInFamily = guest !== null && households.some((option) => option.id === guest.householdId);
  const [household, setHousehold] = useState(isInFamily ? String(guest.householdId) : "");

  const [error, setError] = useState<Problem | null>(null);
  const problemText = useProblemText();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (firstName.trim() === "" || lastName.trim() === "") {
      setError("guests.form.nameRequired");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isChild,
        gender: gender === "" ? null : gender,
        relationshipType: relationshipType === "" ? null : relationshipType,
        side: side === "" ? null : side,
        rsvpStatus,
        phone: orNull(phone),
        email: orNull(email),
        householdId: chosenHousehold(guest, household, isInFamily),
      });
    } catch (failure) {
      setError(failedTo("guests.form.saveFailed", failure));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel
      title={t(guest ? "guests.form.editTitle" : "guests.form.createTitle")}
      sticker="💌"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="guest-first-name">
                {t("guests.form.firstName")}
              </label>
              <input
                id="guest-first-name"
                className={field}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="guest-last-name">
                {t("guests.form.lastName")}
              </label>
              <input
                id="guest-last-name"
                className={field}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Dropdown
              label={t("guests.form.relationship")}
              value={relationshipType}
              options={[{ value: "", label: t("guests.notSpecified") }, ...relationshipTypes.map((option) => ({ value: option, label: t(relationshipLabelKey(option)) }))]}
              onChange={(next) => setRelationshipType(next as GuestRelationshipType | "")}
            />
            <Dropdown
              label={t("guests.form.side")}
              value={side}
              options={[{ value: "", label: t("guests.notSpecified") }, ...guestSides.map((option) => ({ value: option, label: t(sideLabelKey(option)) }))]}
              onChange={(next) => setSide(next as GuestSide | "")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Dropdown
              label={t("guests.form.rsvp")}
              value={rsvpStatus}
              options={[...rsvpStatuses.map((option) => ({ value: option, label: t(rsvpLabelKey(option)) }))]}
              onChange={(next) => setRsvpStatus(next as RsvpStatus)}
            />
            <Dropdown
              label={t("guests.form.gender")}
              value={gender}
              options={[{ value: "", label: t("guests.gender.unspecified") }, ...guestGenders.map((option) => ({ value: option, label: t(genderLabelKey(option)) }))]}
              onChange={(next) => setGender(next as GuestGender | "")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="guest-phone">
                {t("guests.form.phone")}
              </label>
              <input
                id="guest-phone"
                placeholder={t("guests.form.optional")}
                className={field}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="guest-email">
                {t("guests.form.email")}
              </label>
              <input
                id="guest-email"
                type="email"
                placeholder={t("guests.form.optional")}
                className={field}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <Dropdown
            searchable
            label={t("guests.form.household")}
            value={household}
            options={[
              { value: "", label: t("guests.form.householdNew") },
              ...households.map((option) => ({ value: String(option.id), label: option.label })),
            ]}
            onChange={setHousehold}
          />

          {/* A sticker-style tick box: the whole pill turns butter yellow when ticked. */}
          <label
            className={`flex w-max cursor-pointer items-center gap-3 rounded-[16px] border-[2.5px] border-ink px-4 py-2 text-lg transition-colors ${
              isChild ? "bg-butter" : "bg-cream-light hover:bg-accent/30"
            }`}
          >
            <input
              type="checkbox"
              checked={isChild}
              onChange={(event) => setIsChild(event.target.checked)}
              className="h-5 w-5 rounded-md border-2 border-ink text-sky focus:ring-sky"
            />
            {t("guests.form.isChild")}
          </label>

          {error !== null && (
            <p role="alert" className="text-lg text-coral">
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
