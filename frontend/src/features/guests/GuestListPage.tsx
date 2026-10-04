import { useMemo, useState } from "react";

import type { Guest, GuestDraft, GuestImportDraft, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { filterGuestsByName } from "./filtering";
import { GuestFormDialog } from "./GuestFormDialog";
import { GuestImportDialog } from "./GuestImportDialog";
import { GuestStats } from "./GuestStats";
import { GuestTable } from "./GuestTable";
import { groupByHousehold } from "./households";
import { useGuests } from "./useGuests";

/** Which guest the dialog is open for: a guest to edit, or null to create one. */
type DialogTarget = { guest: Guest | null } | null;

export function GuestListPage() {
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
  } = useGuests(weddingId);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  /** Which row action failed, if any: the dialog reports its own failures. */
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const visibleGuests = useMemo(() => filterGuestsByName(guests, term), [guests, term]);
  /** Every household, labelled, for the form's picker and the header count. */
  const householdOptions = useMemo(
    () =>
      groupByHousehold(guests, guests, households)
        .map((group) => ({ id: group.householdId, label: group.label }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [guests, households],
  );

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
        allGuests={guests}
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
                households: householdOptions.length,
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
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
        </div>
      </div>

      <GuestStats guests={guests} />

      <div className="rounded-[30px_10px_40px_20px] bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
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
