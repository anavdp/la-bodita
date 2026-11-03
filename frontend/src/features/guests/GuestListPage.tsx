import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import type {
  BroadcastList,
  Guest,
  GuestDraft,
  GuestImportDraft,
  Household,
  HouseholdBooking,
  HouseholdDraft,
  RsvpStatus,
} from "../../api/types";
import { LoadProblems } from "../../components/feedback/LoadProblems";
import { failedTo, hasFailed } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useSearch } from "../../search/SearchProvider";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { screenIcons } from "../../components/playful/icons";
import { folderTab, outlinedCard } from "../../components/playful/styles";
import { useWedding } from "../../wedding/WeddingProvider";
import { HouseholdDeleteDialog } from "../households/HouseholdDeleteDialog";
import { HouseholdDetailsDialog } from "../households/HouseholdDetailsDialog";
import { HouseholdFormDialog } from "../households/HouseholdFormDialog";
import type { BroadcastFilter } from "../households/broadcastFilter";
import { householdRsvpOf, householdShowsUnder, membersOf } from "../households/householdRsvp";
import { HouseholdsPanel } from "../households/HouseholdsPanel";
import { filterBooked, summariseBookings } from "../weBook/weBook";
import type { BookingFilter } from "../weBook/weBook";
import { WeBookDialog } from "../weBook/WeBookDialog";
import { WeBookPanel } from "../weBook/WeBookPanel";
import { WeBookStats } from "../weBook/WeBookStats";
import { RoomTypesDialog } from "../weBook/RoomTypesDialog";
import { createRoomType, deleteRoomType, updateRoomType } from "../../api/roomTypes";
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

export type GuestListTab = "guests" | "households" | "weBook";

/** The We book drawer, if open: a booked household to edit, or null to add one. */
type WeBookTarget = { household: Household | null } | null;

/** Nothing booked: what taking a household off the We book list sends. */
const nothingBooked: HouseholdBooking = { rooms: [], needsRide: false, rideWith: "" };

/**
 * The guest list, in three tabs that share the header: the guests themselves,
 * the households they are invited in, and the households we book a hotel room
 * or a ride for. Each tab has its own address, so it can be linked to or reloaded.
 */
export function GuestListPage({ tab = "guests" }: { tab?: GuestListTab }) {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();

  const weddingId = wedding?.id ?? null;
  const {
    guests,
    households,
    roomTypes,
    isLoading,
    loadFailures,
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
  const [actionError, setActionError] = useState<Problem | null>(null);
  const problemText = useProblemText();

  /** The RSVP status picked in the header summary, if any: the table shows only those guests. */
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | null>(null);

  /** The We book summary figure picked, if any: the We book table shows only those households. */
  const [bookingFilter, setBookingFilter] = useState<BookingFilter | null>(null);
  const [weBookTarget, setWeBookTarget] = useState<WeBookTarget>(null);
  const [isEditingRooms, setIsEditingRooms] = useState(false);

  /** What is ticked under the table's Type, Relationship and Side funnels. */
  const [columnFilters, setColumnFilters] = useState<GuestColumnFilters>(noColumnFilters);
  const [broadcastFilter, setBroadcastFilter] = useState<BroadcastFilter>([]);

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
  /** The summary's status filters households by their rolled-up RSVP: a mixed one shows under confirmed and declined. */
  const rsvpFilteredHouseholds = useMemo(
    () =>
      rsvpFilter === null
        ? visibleHouseholds
        : visibleHouseholds.filter((household) =>
            householdShowsUnder(householdRsvpOf(membersOf(household, guests)), rsvpFilter),
          ),
    [visibleHouseholds, rsvpFilter, guests],
  );
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
    } catch (failure) {
      setActionError(failedTo("guests.deleteFailed", failure));
    }
  };

  const handleChangeRsvp = async (guest: Guest, rsvpStatus: RsvpStatus) => {
    setActionError(null);
    try {
      await setRsvpStatus(guest.id, rsvpStatus);
    } catch (failure) {
      setActionError(failedTo("guests.rsvpFailed", failure));
    }
  };

  const handleChangeBroadcastList = async (household: Household, broadcastList: BroadcastList | null) => {
    setActionError(null);
    try {
      await setBroadcastList(household.id, broadcastList);
    } catch (failure) {
      setActionError(failedTo("households.broadcastFailed", failure));
    }
  };

  const handleSaveBooking = async (householdId: number, booking: HouseholdBooking) => {
    await editHousehold(householdId, booking);
    setWeBookTarget(null);
  };

  const handleRemoveBooking = async (household: Household) => {
    setActionError(null);
    try {
      await editHousehold(household.id, nothingBooked);
    } catch (failure) {
      setActionError(failedTo("weBook.removeFailed", failure));
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
    if (hasFailed(loadFailures, "errors.part.guests")) return null;
    if (guests.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("guests.empty")}</p>;
    }
    if (tab === "weBook") {
      const booked = filterBooked(visibleHouseholds, bookingFilter);
      if (booked.length === 0) {
        const emptyText =
          term.trim() !== ""
            ? t("weBook.noMatches", { term })
            : bookingFilter !== null
              ? t("weBook.filterEmpty")
              : t("weBook.empty");
        return <p className="font-playful text-xl text-ink/70">{emptyText}</p>;
      }
      return (
        <div className={`${outlinedCard} overflow-hidden`}>
          <WeBookPanel
            households={booked}
            guests={guests}
            roomTypes={roomTypes}
            onEdit={(household) => setWeBookTarget({ household })}
            onRemove={handleRemoveBooking}
          />
        </div>
      );
    }
    if (tab === "households") {
      if (visibleHouseholds.length === 0) {
        return (
          <p className="font-playful text-xl text-ink/70">
            {t("households.noMatches", { term })}
          </p>
        );
      }
      // With the Broadcast funnel on, the table stays up so it can be changed back.
      if (rsvpFilteredHouseholds.length === 0 && broadcastFilter.length === 0) {
        return <p className="font-playful text-xl text-ink/70">{t("households.statusNoMatches")}</p>;
      }
      return (
        <div className={`${outlinedCard} overflow-hidden`}>
          <HouseholdsPanel
          households={rsvpFilteredHouseholds}
          guests={guests}
          onDetails={(household) => setHouseholdDialog({ kind: "details", household })}
          onEdit={(household) => setHouseholdDialog({ kind: "form", household })}
          onDelete={(household) => setHouseholdDialog({ kind: "delete", household })}
          onChangeBroadcastList={handleChangeBroadcastList}
          broadcastFilter={broadcastFilter}
          onChangeBroadcastFilter={setBroadcastFilter}
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
      <PageHeader title={t("guests.title")} subtitle={t("guests.subtitle")} art={screenIcons.guests}>
        {tab === "weBook" ? (
          <>
            <HeaderAction
              icon="bed"
              label={t("weBook.editRooms")}
              variant="secondary"
              onClick={() => setIsEditingRooms(true)}
            />
            <HeaderAction icon="add" label={t("weBook.add")} onClick={() => setWeBookTarget({ household: null })} />
          </>
        ) : tab === "households" ? (
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

      {tab === "weBook" ? (
        <WeBookStats
          summary={summariseBookings(households, guests)}
          activeFilter={bookingFilter}
          onToggleFilter={(filter) => setBookingFilter((current) => (current === filter ? null : filter))}
        />
      ) : (
        <GuestStats
          guests={guests}
          activeStatus={rsvpFilter}
          onToggleStatus={(status) => setRsvpFilter((current) => (current === status ? null : status))}
        />
      )}

      <nav aria-label={t("guests.tabs.label")} className="mb-5 mt-7 flex">
        <NavLink to="/guests" end className={folderTab("rounded-l-[18px]")}>
          {t("guests.tabs.guests")}
        </NavLink>
        <NavLink to="/guests/households" className={folderTab("-ml-[2.5px]")}>
          {t("guests.tabs.households")}
        </NavLink>
        <NavLink to="/guests/we-book" className={folderTab("-ml-[2.5px] rounded-r-[18px]")}>
          {t("guests.tabs.weBook")}
        </NavLink>
      </nav>
      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {problemText(actionError)}
        </p>
      )}
      {!isLoading && <LoadProblems failures={loadFailures} onRetry={reload} />}
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

      {weBookTarget !== null && (
        <WeBookDialog
          household={weBookTarget.household}
          households={households}
          guests={guests}
          roomTypes={roomTypes}
          onSave={handleSaveBooking}
          onClose={() => setWeBookTarget(null)}
        />
      )}

      {isEditingRooms && weddingId !== null && (
        <RoomTypesDialog
          roomTypes={roomTypes}
          onCreate={(draft) => createRoomType(weddingId, draft)}
          onUpdate={(roomTypeId, draft) => updateRoomType(weddingId, roomTypeId, draft)}
          onDelete={(roomTypeId) => deleteRoomType(weddingId, roomTypeId)}
          onSaved={() => {
            setIsEditingRooms(false);
            reload();
          }}
          onClose={() => setIsEditingRooms(false)}
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
