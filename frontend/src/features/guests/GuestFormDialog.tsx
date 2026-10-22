import { useState } from "react";
import type { FormEvent } from "react";

import type { Guest, GuestDraft, GuestGender, GuestRelationshipType, GuestSide, RsvpStatus } from "../../api/types";
import { SearchableSelect } from "../../components/form/SearchableSelect";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { StyledSelect } from "../../components/form/StyledSelect";
import { fieldLabel, pillField as field } from "../../components/form/styles";
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

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (firstName.trim() === "" || lastName.trim() === "") {
      setError(t("guests.form.nameRequired"));
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
      setError(failure instanceof Error ? failure.message : t("guests.form.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t(guest ? "guests.form.editTitle" : "guests.form.createTitle")} onClose={onClose}>
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
            <div>
              <label className={fieldLabel} htmlFor="guest-relationship">
                {t("guests.form.relationship")}
              </label>
              <StyledSelect
                id="guest-relationship"
                value={relationshipType}
                onChange={(event) =>
                  setRelationshipType(event.target.value as GuestRelationshipType | "")
                }
              >
                <option value="">{t("guests.notSpecified")}</option>
                {relationshipTypes.map((option) => (
                  <option key={option} value={option}>
                    {t(relationshipLabelKey(option))}
                  </option>
                ))}
              </StyledSelect>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="guest-side">
                {t("guests.form.side")}
              </label>
              <StyledSelect
                id="guest-side"
                value={side}
                onChange={(event) => setSide(event.target.value as GuestSide | "")}
              >
                <option value="">{t("guests.notSpecified")}</option>
                {guestSides.map((option) => (
                  <option key={option} value={option}>
                    {t(sideLabelKey(option))}
                  </option>
                ))}
              </StyledSelect>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="guest-rsvp">
                {t("guests.form.rsvp")}
              </label>
              <StyledSelect
                id="guest-rsvp"
                value={rsvpStatus}
                onChange={(event) => setRsvpStatus(event.target.value as RsvpStatus)}
              >
                {rsvpStatuses.map((option) => (
                  <option key={option} value={option}>
                    {t(rsvpLabelKey(option))}
                  </option>
                ))}
              </StyledSelect>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="guest-gender">
                {t("guests.form.gender")}
              </label>
              <StyledSelect
                id="guest-gender"
                value={gender}
                onChange={(event) => setGender(event.target.value as GuestGender | "")}
              >
                <option value="">{t("guests.gender.unspecified")}</option>
                {guestGenders.map((option) => (
                  <option key={option} value={option}>
                    {t(genderLabelKey(option))}
                  </option>
                ))}
              </StyledSelect>
            </div>
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

          <SearchableSelect
            label={t("guests.form.household")}
            value={household}
            options={[
              { value: "", label: t("guests.form.householdNew") },
              ...households.map((option) => ({ value: String(option.id), label: option.label })),
            ]}
            onChange={setHousehold}
          />

          <label className="flex items-center gap-3 font-body-sm text-body-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={isChild}
              onChange={(event) => setIsChild(event.target.checked)}
              className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
            {t("guests.form.isChild")}
          </label>

          {error !== null && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {error}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-primary px-6 py-3 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
          >
            {t("guests.form.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-primary px-8 py-3 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t(isSaving ? "guests.form.saving" : "guests.form.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
