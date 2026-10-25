import type { Guest } from "../../api/types";

/** The guest table's two orders: by name, as the API sends it, or newest answers first. */
export type GuestSortOrder = "name" | "answered";

function byName(first: Guest, second: Guest): number {
  return first.lastName.localeCompare(second.lastName) || first.firstName.localeCompare(second.firstName);
}

/** Newest answers first; guests who have not answered go last; the same moment falls back to name. */
function byNewestAnswer(first: Guest, second: Guest): number {
  const answeredAt = (guest: Guest) =>
    guest.rsvpAnsweredAt === null ? Number.NEGATIVE_INFINITY : Date.parse(guest.rsvpAnsweredAt);
  return answeredAt(second) - answeredAt(first) || byName(first, second);
}

export function sortGuests(guests: Guest[], order: GuestSortOrder): Guest[] {
  return order === "name" ? guests : [...guests].sort(byNewestAnswer);
}
