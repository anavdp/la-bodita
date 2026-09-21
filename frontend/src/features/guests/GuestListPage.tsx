import { useMemo, useState } from "react";

import type { Guest, GuestDraft } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { filterGuestsByName } from "./filtering";
import { GuestFormDialog } from "./GuestFormDialog";
import { GuestStats } from "./GuestStats";
import { GuestTable } from "./GuestTable";
import { useGuests } from "./useGuests";

/** Which guest the dialog is open for: a guest to edit, or null to create one. */
type DialogTarget = { guest: Guest | null } | null;

export function GuestListPage() {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();

  const weddingId = wedding?.id ?? null;
  const { guests, isLoading, hasLoadError, reload, addGuest, editGuest, removeGuest } =
    useGuests(weddingId);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const visibleGuests = useMemo(() => filterGuestsByName(guests, term), [guests, term]);

  const handleSave = async (draft: GuestDraft) => {
    if (dialogTarget?.guest) {
      await editGuest(dialogTarget.guest.id, draft);
    } else {
      await addGuest(draft);
    }
    setDialogTarget(null);
  };

  const handleDelete = async (guest: Guest) => {
    setDeleteFailed(false);
    try {
      await removeGuest(guest.id);
    } catch {
      setDeleteFailed(true);
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
    return <GuestTable guests={visibleGuests} onEdit={(guest) => setDialogTarget({ guest })} onDelete={handleDelete} />;
  };

  return (
    <>
      <div className="organic-shape-1 mb-8 flex flex-wrap items-start justify-between gap-4 bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div>
          <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">{t("guests.title")}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{t("guests.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogTarget({ guest: null })}
          className="rounded-full bg-tertiary-container px-8 py-4 font-label-md text-label-md text-on-tertiary shadow-md transition-opacity hover:opacity-90"
        >
          {t("guests.add")}
        </button>
      </div>

      <GuestStats guests={guests} />

      <div className="rounded-[30px_10px_40px_20px] bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        {deleteFailed && (
          <p role="alert" className="mb-4 font-body-sm text-body-sm text-error">
            {t("guests.deleteFailed")}
          </p>
        )}
        {tableArea()}
      </div>

      {dialogTarget !== null && (
        <GuestFormDialog
          guest={dialogTarget.guest}
          onSave={handleSave}
          onClose={() => setDialogTarget(null)}
        />
      )}
    </>
  );
}
