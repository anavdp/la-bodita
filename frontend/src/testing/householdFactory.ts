import type { Household } from "../api/types";

let nextId = 1;

/** A plausible household; each test overrides only the fields it is about. */
export function aHousehold(overrides: Partial<Household> = {}): Household {
  const id = nextId++;
  return { id, name: "Famiglia Rossi", rsvpToken: `token-${id}`, guestIds: [], ...overrides };
}
