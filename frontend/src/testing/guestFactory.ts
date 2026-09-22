import type { Guest } from "../api/types";

let nextId = 1;

/** A plausible guest; each test overrides only the fields it is about. */
export function aGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: nextId++,
    weddingId: 1,
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
