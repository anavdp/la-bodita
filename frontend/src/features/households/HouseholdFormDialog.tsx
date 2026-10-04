import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Guest, Household, HouseholdDraft } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { filterGuestsByName, fullName } from "../guests/filtering";
import {
  backdrop,
  dialogTitle,
  field,
  fieldLabel,
  panel,
  primaryButton,
  secondaryButton,
  useCloseOnEscape,
} from "./dialogStyles";

interface HouseholdFormDialogProps {
  /** The household being edited, or null to create one. */
  household: Household | null;
  guests: Guest[];
  /** Every household, to say where a guest is now before they are moved. */
  households: Household[];
  onSave: (draft: HouseholdDraft) => Promise<void>;
  onClose: () => void;
}

/**
 * Names a household and picks who is in it, several guests at once. Ticking a
 * guest who is elsewhere moves them here; unticking a member leaves them on
 * their own.
 */
export function HouseholdFormDialog({ household, guests, households, onSave, onClose }: HouseholdFormDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  useCloseOnEscape(onClose);

  const [name, setName] = useState(household?.name ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(household?.guestIds ?? []));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Only families are worth naming: "Now in Maria Rossi" next to Maria Rossi says nothing.
  const familyNames = new Map(
    households.filter((each) => each.guestIds.length > 1).map((each) => [each.id, each.name]),
  );
  const offered = filterGuestsByName(guests, search);

  const toggle = (guestId: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("households.form.nameRequired");
      return;
    }
    if (selected.size === 0) {
      setError("households.form.guestsRequired");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      // In list order, so what is sent reads the way the checklist does.
      const guestIds = guests.filter((guest) => selected.has(guest.id)).map((guest) => guest.id);
      await onSave({ name: name.trim(), guestIds });
    } catch {
      setError("households.form.saveFailed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={panel}>
        <h2 id={titleId} className={dialogTitle}>
          {t(household ? "households.form.editTitle" : "households.form.createTitle")}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={fieldLabel} htmlFor="household-name">
              {t("households.form.name")}
            </label>
            <input
              id="household-name"
              className={field}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={fieldLabel}>{t("households.form.guests")}</legend>
            <input
              type="search"
              aria-label={t("households.form.search")}
              placeholder={t("households.form.search")}
              className={field}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-surface-variant p-2">
              {offered.map((guest) => {
                const currentFamily = guest.householdId === household?.id ? undefined : familyNames.get(guest.householdId);
                return (
                  <label
                    key={guest.id}
                    className="flex items-center gap-3 rounded px-2 py-2 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(guest.id)}
                      onChange={() => toggle(guest.id)}
                      className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    <span className="flex flex-col">
                      <span>{fullName(guest)}</span>
                      {currentFamily !== undefined && (
                        <span className="text-on-surface-variant">
                          {t("households.form.currentlyIn", { name: currentFamily })}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error !== null && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {t(error)}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className={secondaryButton}>
              {t("guests.form.cancel")}
            </button>
            <button type="submit" disabled={isSaving} className={primaryButton}>
              {t(isSaving ? "guests.form.saving" : "guests.form.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
