import { useState } from "react";
import type { FormEvent } from "react";

import type { Guest, Household, HouseholdDraft } from "../../api/types";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField as field } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { filterGuestsByName, fullName } from "../guests/filtering";

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
    <SidePanel
      title={t(household ? "households.form.editTitle" : "households.form.createTitle")}
      icon={screenIcons.guests}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
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

          <fieldset className="flex min-h-0 flex-col gap-2">
            <legend className={fieldLabel}>
              {t("households.form.guests")}{" "}
              {selected.size > 0 && (
                <span className="ml-1 rounded-full border-2 border-ink bg-butter px-2 text-sm">{selected.size}</span>
              )}
            </legend>
            <input
              type="search"
              aria-label={t("households.form.search")}
              placeholder={t("households.form.search")}
              className={field}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {/* Picked guests turn pink, like the active nav item, so the family reads at a glance. */}
            <div className="flex max-h-[45vh] flex-col overflow-y-auto rounded-[20px] border-[2.5px] border-ink bg-cream-light">
              {offered.map((guest) => {
                const currentFamily = guest.householdId === household?.id ? undefined : familyNames.get(guest.householdId);
                const isPicked = selected.has(guest.id);
                return (
                  <label
                    key={guest.id}
                    className={`flex cursor-pointer items-center gap-3 border-b-2 border-ink/10 px-4 py-2.5 text-lg last:border-b-0 ${
                      isPicked ? "bg-accent/70" : "hover:bg-accent/25"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isPicked}
                      onChange={() => toggle(guest.id)}
                      className="h-5 w-5 rounded-md border-2 border-ink text-sky focus:ring-sky"
                    />
                    <span className="flex flex-col leading-tight">
                      <span>{fullName(guest)}</span>
                      {currentFamily !== undefined && (
                        <span className="text-base text-ink/60">
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
            <p role="alert" className="text-lg text-coral">
              {t(error)}
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
