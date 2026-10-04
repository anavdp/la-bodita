import { useCallback, useEffect, useState } from "react";

import { createGuest, deleteGuest, importGuests, listGuests, updateGuest } from "../../api/guests";
import { listHouseholds } from "../../api/households";
import type { Guest, GuestDraft, GuestImportDraft, Household } from "../../api/types";

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
}

/**
 * The guest list for one wedding, with the households its guests are grouped
 * into. Mutations re-read both afterwards, so the order on screen stays the
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
  };
}
