import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";

import type { Guest, GuestDraft, GuestGender, GuestRelationshipType, GuestSide, RsvpStatus } from "../../api/types";
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

interface GuestFormDialogProps {
  /** The guest being edited, or null to create a new one. */
  guest: Guest | null;
  onSave: (draft: GuestDraft) => Promise<void>;
  onClose: () => void;
}

const field =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none";
const fieldLabel = "mb-1 block font-label-md text-label-md uppercase text-on-surface-variant";

/** An empty string in a form means "nothing entered"; the API wants null. */
const orNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export function GuestFormDialog({ guest, onSave, onClose }: GuestFormDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();

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

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

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
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t("guests.form.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-[30px_10px_40px_20px] bg-surface-container-lowest p-8 shadow-lg"
      >
        <h2 id={titleId} className="mb-6 font-headline-md text-headline-md text-primary">
          {t(guest ? "guests.form.editTitle" : "guests.form.createTitle")}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <select
                id="guest-relationship"
                className={field}
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
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="guest-side">
                {t("guests.form.side")}
              </label>
              <select
                id="guest-side"
                className={field}
                value={side}
                onChange={(event) => setSide(event.target.value as GuestSide | "")}
              >
                <option value="">{t("guests.notSpecified")}</option>
                {guestSides.map((option) => (
                  <option key={option} value={option}>
                    {t(sideLabelKey(option))}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="guest-rsvp">
                {t("guests.form.rsvp")}
              </label>
              <select
                id="guest-rsvp"
                className={field}
                value={rsvpStatus}
                onChange={(event) => setRsvpStatus(event.target.value as RsvpStatus)}
              >
                {rsvpStatuses.map((option) => (
                  <option key={option} value={option}>
                    {t(rsvpLabelKey(option))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="guest-gender">
                {t("guests.form.gender")}
              </label>
              <select
                id="guest-gender"
                className={field}
                value={gender}
                onChange={(event) => setGender(event.target.value as GuestGender | "")}
              >
                <option value="">{t("guests.gender.unspecified")}</option>
                {guestGenders.map((option) => (
                  <option key={option} value={option}>
                    {t(genderLabelKey(option))}
                  </option>
                ))}
              </select>
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

          <div className="mt-2 flex justify-end gap-3">
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
      </div>
    </div>
  );
}
