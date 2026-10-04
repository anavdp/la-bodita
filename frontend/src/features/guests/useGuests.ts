import { useCallback, useEffect, useState } from "react";

import { createGuest, deleteGuest, importGuests, listGuests, updateGuest } from "../../api/guests";
import type { Guest, GuestDraft } from "../../api/types";

export interface GuestsState {
  guests: Guest[];
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
  addGuest: (draft: GuestDraft) => Promise<void>;
  addGuests: (drafts: GuestDraft[]) => Promise<void>;
  editGuest: (guestId: number, changes: Partial<GuestDraft>) => Promise<void>;
  removeGuest: (guestId: number) => Promise<void>;
}

/**
 * The guest list for one wedding. Mutations re-read the list afterwards, so the
 * order on screen stays the order the API sorts by.
 */
export function useGuests(weddingId: number | null): GuestsState {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) {
      return;
    }

    setIsLoading(true);
    try {
      setGuests(await listGuests(weddingId));
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
    async (drafts: GuestDraft[]) => {
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
    isLoading,
    hasLoadError,
    reload: () => void load(),
    addGuest,
    addGuests,
    editGuest,
    removeGuest,
  };
}
