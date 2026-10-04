import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import type { Guest, GuestDraft, GuestImportDraft, Household, HouseholdDraft, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { HouseholdDeleteDialog } from "../households/HouseholdDeleteDialog";
import { HouseholdDetailsDialog } from "../households/HouseholdDetailsDialog";
import { HouseholdFormDialog } from "../households/HouseholdFormDialog";
import { HouseholdsPanel } from "../households/HouseholdsPanel";
import { filterGuestsByName } from "./filtering";
import { GuestFormDialog } from "./GuestFormDialog";
import { GuestImportDialog } from "./GuestImportDialog";
import { GuestStats } from "./GuestStats";
import { GuestTable } from "./GuestTable";
import { useGuests } from "./useGuests";

/** Which guest the dialog is open for: a guest to edit, or null to create one. */
type DialogTarget = { guest: Guest | null } | null;

/** The household dialog that is open, if any, and for which household. */
type HouseholdDialog =
  | { kind: "form"; household: Household | null }
  | { kind: "details" | "delete"; household: Household }
  | null;

export type GuestListTab = "guests" | "households";

const tabLink = ({ isActive }: { isActive: boolean }) =>
  `border-b-2 px-4 py-3 font-label-lg text-label-lg transition-colors ${
    isActive ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
  }`;

/**
 * The guest list, in two tabs that share the header and the RSVP cards: the
 * guests themselves, and the households they are invited in. Each tab has its
 * own address, so either can be linked to or reloaded.
 */
export function GuestListPage({ tab = "guests" }: { tab?: GuestListTab }) {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();

  const weddingId = wedding?.id ?? null;
  const {
    guests,
    households,
    isLoading,
    hasLoadError,
    reload,
    addGuest,
    addGuests,
    editGuest,
    removeGuest,
    addHousehold,
    editHousehold,
    removeHousehold,
  } = useGuests(weddingId);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [householdDialog, setHouseholdDialog] = useState<HouseholdDialog>(null);
  /** Which row action failed, if any: the dialog reports its own failures. */
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const visibleGuests = useMemo(() => filterGuestsByName(guests, term), [guests, term]);
  const visibleHouseholds = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return households.filter((household) => household.name.toLowerCase().includes(needle));
  }, [households, term]);
  /** The guest form's household picker: families only, alphabetical. Being on
   * your own is the picker's own "On their own" choice. */
  const householdOptions = useMemo(
    () =>
      households
        .filter((household) => household.guestIds.length > 1)
        .map((household) => ({ id: household.id, label: household.name }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [households],
  );
  const householdCount = new Set(guests.map((guest) => guest.householdId)).size;

  const handleSave = async (draft: GuestDraft) => {
    if (dialogTarget?.guest) {
      await editGuest(dialogTarget.guest.id, draft);
    } else {
      await addGuest(draft);
    }
    setDialogTarget(null);
  };

  const handleImport = async (drafts: GuestImportDraft[]) => {
    await addGuests(drafts);
    setIsImportOpen(false);
  };

  const handleDelete = async (guest: Guest) => {
    setActionError(null);
    try {
      await removeGuest(guest.id);
    } catch {
      setActionError("guests.deleteFailed");
    }
  };

  const handleChangeRsvp = async (guest: Guest, rsvpStatus: RsvpStatus) => {
    setActionError(null);
    try {
      await editGuest(guest.id, { rsvpStatus });
    } catch {
      setActionError("guests.rsvpFailed");
    }
  };

  const handleSaveHousehold = async (draft: HouseholdDraft) => {
    if (householdDialog?.kind === "form" && householdDialog.household !== null) {
      await editHousehold(householdDialog.household.id, draft);
    } else {
      await addHousehold(draft);
    }
    setHouseholdDialog(null);
  };

  const handleDeleteHousehold = async (household: Household, deleteGuests: boolean) => {
    await removeHousehold(household.id, deleteGuests);
    setHouseholdDialog(null);
  };

  const tableArea = () => {
    if (isLoading) {
      return <p className="font-body-lg text-body-lg text-on-surface-variant">{t("guests.loading")}</p>;
    }
    if (hasLoadError) {
      return (
        <div className="flex flex-col items-start gap-4">
          <p className="font-body-lg text-body-lg text-error">{t("guests.loadFailed")}</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-full border border-primary px-6 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
          >
            {t("guests.retry")}
          </button>
        </div>
      );
    }
    if (guests.length === 0) {
      return <p className="font-body-lg text-body-lg text-on-surface-variant">{t("guests.empty")}</p>;
    }
    if (tab === "households") {
      if (visibleHouseholds.length === 0) {
        return (
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {t("households.noMatches", { term })}
          </p>
        );
      }
      return (
        <HouseholdsPanel
          households={visibleHouseholds}
          onDetails={(household) => setHouseholdDialog({ kind: "details", household })}
          onEdit={(household) => setHouseholdDialog({ kind: "form", household })}
          onDelete={(household) => setHouseholdDialog({ kind: "delete", household })}
        />
      );
    }
    if (visibleGuests.length === 0) {
      return (
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {t("guests.noMatches", { term })}
        </p>
      );
    }
    return (
      <GuestTable
        guests={visibleGuests}
        households={households}
        onEdit={(guest) => setDialogTarget({ guest })}
        onDelete={handleDelete}
        onChangeRsvp={handleChangeRsvp}
      />
    );
  };

  return (
    <>
      <div className="organic-shape-1 mb-8 flex flex-wrap items-start justify-between gap-4 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div>
          <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">{t("guests.title")}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{t("guests.subtitle")}</p>
          {guests.length > 0 && (
            <p className="mt-2 font-label-md text-label-md text-on-surface-variant">
              {t("guests.householdSummary", {
                guests: guests.length,
                households: householdCount,
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {tab === "households" ? (
            <button
              type="button"
              onClick={() => setHouseholdDialog({ kind: "form", household: null })}
              className="rounded-full bg-primary px-8 py-4 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90"
            >
              {t("households.add")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                disabled={weddingId === null}
                className="rounded-full border border-primary px-8 py-4 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                {t("guests.import.open")}
              </button>
              <button
                type="button"
                onClick={() => setDialogTarget({ guest: null })}
                className="rounded-full bg-primary px-8 py-4 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90"
              >
                {t("guests.add")}
              </button>
            </>
          )}
        </div>
      </div>

      <GuestStats guests={guests} />

      <div className="rounded-[30px_10px_40px_20px] bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <nav aria-label={t("guests.tabs.label")} className="mb-6 flex gap-2 border-b border-surface-variant">
          <NavLink to="/guests" end className={tabLink}>
            {t("guests.tabs.guests")}
          </NavLink>
          <NavLink to="/guests/households" className={tabLink}>
            {t("guests.tabs.households")}
          </NavLink>
        </nav>
        {actionError !== null && (
          <p role="alert" className="mb-4 font-body-sm text-body-sm text-error">
            {t(actionError)}
          </p>
        )}
        {tableArea()}
      </div>

      {dialogTarget !== null && (
        <GuestFormDialog
          guest={dialogTarget.guest}
          households={householdOptions}
          onSave={handleSave}
          onClose={() => setDialogTarget(null)}
        />
      )}

      {householdDialog?.kind === "form" && (
        <HouseholdFormDialog
          household={householdDialog.household}
          guests={guests}
          households={households}
          onSave={handleSaveHousehold}
          onClose={() => setHouseholdDialog(null)}
        />
      )}

      {householdDialog?.kind === "details" && (
        <HouseholdDetailsDialog
          household={householdDialog.household}
          guests={guests}
          onClose={() => setHouseholdDialog(null)}
        />
      )}

      {householdDialog?.kind === "delete" && (
        <HouseholdDeleteDialog
          household={householdDialog.household}
          onConfirm={(deleteGuests) => handleDeleteHousehold(householdDialog.household, deleteGuests)}
          onClose={() => setHouseholdDialog(null)}
        />
      )}

      {isImportOpen && weddingId !== null && (
        <GuestImportDialog
          weddingId={weddingId}
          onImport={handleImport}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </>
  );
}
