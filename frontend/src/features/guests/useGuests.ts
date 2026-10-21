import { useCallback, useEffect, useState } from "react";

import { createGuest, deleteGuest, importGuests, listGuests, updateGuest } from "../../api/guests";
import { createHousehold, deleteHousehold, listHouseholds, updateHousehold } from "../../api/households";
import type {
  BroadcastList,
  Guest,
  GuestDraft,
  GuestImportDraft,
  Household,
  HouseholdDraft,
  RsvpStatus,
} from "../../api/types";

export interface GuestsState {
  guests: Guest[];
  households: Household[];
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
  addGuest: (draft: GuestDraft) => Promise<void>;
  addGuests: (drafts: GuestImportDraft[]) => Promise<void>;
  editGuest: (guestId: number, changes: Partial<GuestDraft>) => Promise<void>;
  removeGuest: (guestId: number) => Promise<void>;
  setRsvpStatus: (guestId: number, rsvpStatus: RsvpStatus) => Promise<void>;
  addHousehold: (draft: HouseholdDraft) => Promise<void>;
  editHousehold: (householdId: number, draft: HouseholdDraft) => Promise<void>;
  removeHousehold: (householdId: number, deleteGuests: boolean) => Promise<void>;
  setBroadcastList: (householdId: number, broadcastList: BroadcastList | null) => Promise<void>;
}

/**
 * The guest list for one wedding, with the households its guests are grouped
 * into. Mutations re-read both afterwards (except an RSVP or broadcast list,
 * which change one row in place), so the order on screen stays the
 * order the API sorts by and a moved guest lands in the right household.
 */
export function useGuests(weddingId: number | null): GuestsState {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) {
      return;
    }

    setIsLoading(true);
    try {
      const [loadedGuests, loadedHouseholds] = await Promise.all([
        listGuests(weddingId),
        listHouseholds(weddingId),
      ]);
      setGuests(loadedGuests);
      setHouseholds(loadedHouseholds);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addGuest = useCallback(
    async (draft: GuestDraft) => {
      if (weddingId === null) return;
      await createGuest(weddingId, draft);
      await load();
    },
    [weddingId, load],
  );

  const addGuests = useCallback(
    async (drafts: GuestImportDraft[]) => {
      if (weddingId === null) return;
      await importGuests(weddingId, drafts);
      await load();
    },
    [weddingId, load],
  );

  const editGuest = useCallback(
    async (guestId: number, changes: Partial<GuestDraft>) => {
      if (weddingId === null) return;
      await updateGuest(weddingId, guestId, changes);
      await load();
    },
    [weddingId, load],
  );

  const removeGuest = useCallback(
    async (guestId: number) => {
      if (weddingId === null) return;
      await deleteGuest(weddingId, guestId);
      await load();
    },
    [weddingId, load],
  );

  /** An RSVP moves nobody, so only that row changes, at once, with no reload; the
   * summary bar and status filter read the same list, so they follow. If the API
   * refuses, the row goes back to what it was. */
  const setRsvpStatus = useCallback(
    async (guestId: number, rsvpStatus: RsvpStatus) => {
      if (weddingId === null) return;
      const withStatus = (status: RsvpStatus) =>
        setGuests((current) =>
          current.map((guest) => (guest.id === guestId ? { ...guest, rsvpStatus: status } : guest)),
        );
      const previous = guests.find((guest) => guest.id === guestId)?.rsvpStatus;
      withStatus(rsvpStatus);
      try {
        await updateGuest(weddingId, guestId, { rsvpStatus });
      } catch (error) {
        if (previous !== undefined) withStatus(previous);
        throw error;
      }
    },
    [weddingId, guests],
  );

  /** Every household change can move guests too, so both lists are re-read. */
  const changeThenReload = useCallback(
    async (change: (weddingId: number) => Promise<unknown>) => {
      if (weddingId === null) return;
      await change(weddingId);
      await load();
    },
    [weddingId, load],
  );

  const addHousehold = useCallback(
    (draft: HouseholdDraft) => changeThenReload((id) => createHousehold(id, draft)),
    [changeThenReload],
  );

  const editHousehold = useCallback(
    (householdId: number, draft: HouseholdDraft) =>
      changeThenReload((id) => updateHousehold(id, householdId, draft)),
    [changeThenReload],
  );

  const removeHousehold = useCallback(
    (householdId: number, deleteGuests: boolean) =>
      changeThenReload((id) => deleteHousehold(id, householdId, deleteGuests)),
    [changeThenReload],
  );

  /** A broadcast list moves nobody, so only that row changes, at once, with no reload.
   * If the API refuses, the row goes back to what it was. */
  const setBroadcastList = useCallback(
    async (householdId: number, broadcastList: BroadcastList | null) => {
      if (weddingId === null) return;
      const withList = (list: BroadcastList | null) =>
        setHouseholds((current) =>
          current.map((household) =>
            household.id === householdId ? { ...household, broadcastList: list } : household,
          ),
        );
      const previous = households.find((household) => household.id === householdId)?.broadcastList ?? null;
      withList(broadcastList);
      try {
        await updateHousehold(weddingId, householdId, { broadcastList });
      } catch (error) {
        withList(previous);
        throw error;
      }
    },
    [weddingId, households],
  );

  return {
    guests,
    households,
    isLoading,
    hasLoadError,
    reload: () => void load(),
    addGuest,
    addGuests,
    editGuest,
    removeGuest,
    setRsvpStatus,
    addHousehold,
    editHousehold,
    removeHousehold,
    setBroadcastList,
  };
}
