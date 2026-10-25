import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import type {
  BroadcastList,
  Guest,
  GuestDraft,
  GuestImportDraft,
  Household,
  HouseholdDraft,
  RsvpStatus,
} from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { folderTab, outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useWedding } from "../../wedding/WeddingProvider";
import { HouseholdDeleteDialog } from "../households/HouseholdDeleteDialog";
import { HouseholdDetailsDialog } from "../households/HouseholdDetailsDialog";
import { HouseholdFormDialog } from "../households/HouseholdFormDialog";
import { HouseholdsPanel } from "../households/HouseholdsPanel";
import { filterGuestsByColumns, filterGuestsByName, hasColumnFilters, noColumnFilters } from "./filtering";
import type { GuestColumnFilters } from "./filtering";
import { GuestFormDialog } from "./GuestFormDialog";
import { GuestImportDialog } from "./GuestImportDialog";
import { GuestStats } from "./GuestStats";
import { GuestTable } from "./GuestTable";
import { householdNamesOf } from "./households";
import { nextSort, sortGuests } from "./sorting";
import type { GuestSort } from "./sorting";
import { useGuests } from "./useGuests";

/** Which guest the dialog is open for: a guest to edit, or null to create one. */
type DialogTarget = { guest: Guest | null } | null;

/** The household dialog that is open, if any, and for which household. */
type HouseholdDialog =
  | { kind: "form"; household: Household | null }
  | { kind: "details" | "delete"; household: Household }
  | null;

export type GuestListTab = "guests" | "households";

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
    setRsvpStatus,
    addHousehold,
    editHousehold,
    removeHousehold,
    setBroadcastList,
  } = useGuests(weddingId);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [householdDialog, setHouseholdDialog] = useState<HouseholdDialog>(null);
  /** Which row action failed, if any: the dialog reports its own failures. */
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  /** The RSVP status picked in the header summary, if any: the table shows only those guests. */
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | null>(null);

  /** What is ticked under the table's Type, Relationship and Side funnels. */
  const [columnFilters, setColumnFilters] = useState<GuestColumnFilters>(noColumnFilters);

  /** Name order by default; the Name, Household and RSVP headers pick and flip it. */
  const [sort, setSort] = useState<GuestSort>({ key: "name", direction: "ascending" });

  const searchedGuests = useMemo(() => filterGuestsByName(guests, term), [guests, term]);
  const visibleGuests = useMemo(() => {
    const byStatus =
      rsvpFilter === null ? searchedGuests : searchedGuests.filter((guest) => guest.rsvpStatus === rsvpFilter);
    return sortGuests(filterGuestsByColumns(byStatus, columnFilters), sort, householdNamesOf(households));
  }, [searchedGuests, rsvpFilter, columnFilters, sort, households]);
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
      await setRsvpStatus(guest.id, rsvpStatus);
    } catch {
      setActionError("guests.rsvpFailed");
    }
  };

  const handleChangeBroadcastList = async (household: Household, broadcastList: BroadcastList | null) => {
    setActionError(null);
    try {
      await setBroadcastList(household.id, broadcastList);
    } catch {
      setActionError("households.broadcastFailed");
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
      return <p className="font-playful text-xl text-ink/70">{t("guests.loading")}</p>;
    }
    if (hasLoadError) {
      return (
        <div className="flex flex-col items-start gap-4">
          <p className="font-playful text-xl text-coral">{t("guests.loadFailed")}</p>
          <button type="button" onClick={reload} className={secondaryButton}>
            {t("guests.retry")}
          </button>
        </div>
      );
    }
    if (guests.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("guests.empty")}</p>;
    }
    if (tab === "households") {
      if (visibleHouseholds.length === 0) {
        return (
          <p className="font-playful text-xl text-ink/70">
            {t("households.noMatches", { term })}
          </p>
        );
      }
      return (
        <div className={`${outlinedCard} overflow-hidden`}>
          <HouseholdsPanel
          households={visibleHouseholds}
          onDetails={(household) => setHouseholdDialog({ kind: "details", household })}
          onEdit={(household) => setHouseholdDialog({ kind: "form", household })}
          onDelete={(household) => setHouseholdDialog({ kind: "delete", household })}
          onChangeBroadcastList={handleChangeBroadcastList}
          />
        </div>
      );
    }
    if (searchedGuests.length === 0) {
      return (
        <p className="font-playful text-xl text-ink/70">
          {t("guests.noMatches", { term })}
        </p>
      );
    }
    // The column filters live in the table's headers, so the table stays up
    // even when they leave nobody: that is where they get changed back.
    const isFilteredByColumn = hasColumnFilters(columnFilters);
    if (visibleGuests.length === 0 && !isFilteredByColumn) {
      return <p className="font-playful text-xl text-ink/70">{t("guests.statusNoMatches")}</p>;
    }
    return (
      <div className={`${outlinedCard} overflow-hidden`}>
        <GuestTable
          guests={visibleGuests}
          households={households}
          sort={sort}
          onSort={(key) => setSort((current) => nextSort(current, key))}
          onEdit={(guest) => setDialogTarget({ guest })}
          onDelete={handleDelete}
          onChangeRsvp={handleChangeRsvp}
          filters={columnFilters}
          onChangeFilters={setColumnFilters}
        />
        {visibleGuests.length === 0 ? (
          <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink/15 px-6 py-4 font-playful text-lg text-ink">
            <p>{t("guests.filter.noMatches")}</p>
            <button
              type="button"
              onClick={() => setColumnFilters(noColumnFilters)}
              className="text-ink/70 underline"
            >
              {t("guests.filter.clearAll")}
            </button>
          </div>
        ) : (
          <p className="border-t-2 border-ink/15 px-6 py-4 font-playful text-lg text-ink">
            {t("guests.showing", { shown: visibleGuests.length, total: guests.length })}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader title={t("guests.title")} subtitle={t("guests.subtitle")} art="title-cheers.png">
        {tab === "households" ? (
          <HeaderAction
            icon="add"
            label={t("households.add")}
            onClick={() => setHouseholdDialog({ kind: "form", household: null })}
          />
        ) : (
          <>
            <HeaderAction
              icon="upload"
              label={t("guests.import.open")}
              variant="secondary"
              disabled={weddingId === null}
              onClick={() => setIsImportOpen(true)}
            />
            <HeaderAction icon="add" label={t("guests.add")} onClick={() => setDialogTarget({ guest: null })} />
          </>
        )}
      </PageHeader>

      <GuestStats
        guests={guests}
        activeStatus={rsvpFilter}
        onToggleStatus={
          tab === "guests" ? (status) => setRsvpFilter((current) => (current === status ? null : status)) : undefined
        }
      />

      <nav aria-label={t("guests.tabs.label")} className="mb-5 mt-7 flex">
        <NavLink to="/guests" end className={folderTab("rounded-l-[18px]")}>
          {t("guests.tabs.guests")}
        </NavLink>
        <NavLink to="/guests/households" className={folderTab("-ml-[2.5px] rounded-r-[18px]")}>
          {t("guests.tabs.households")}
        </NavLink>
      </nav>
      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}
      {tableArea()}

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
