import type { Guest } from "../api/types";

let nextId = 1;

/** A plausible guest; each test overrides only the fields it is about. */
export function aGuest(overrides: Partial<Guest> = {}): Guest {
  const id = nextId++;
  return {
    id,
    weddingId: 1,
    // Alone unless the test says otherwise: a household of one, numbered after the guest.
    householdId: 1000 + id,
    firstName: "Maria",
    lastName: "Rossi",
    isChild: false,
    gender: null,
    relationshipType: "family",
    side: "italy",
    rsvpStatus: "confirmed",
    phone: null,
    email: null,
    ...overrides,
  };
}
