import type { Guest } from "../../api/types";

export function fullName(guest: Pick<Guest, "firstName" | "lastName">): string {
  return `${guest.firstName} ${guest.lastName}`;
}

/** The top bar's search, applied to the guest list: match on the whole name. */
export function filterGuestsByName(guests: Guest[], term: string): Guest[] {
  const needle = term.trim().toLowerCase();
  if (needle === "") {
    return guests;
  }
  return guests.filter((guest) => fullName(guest).toLowerCase().includes(needle));
}
