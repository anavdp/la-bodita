import type { Guest, Household } from "../../api/types";

/** The guests in a household, in the order the list already has. */
export function membersOf(household: Pick<Household, "id">, guests: Guest[]): Guest[] {
  return guests.filter((guest) => guest.householdId === household.id);
}

/** The household's private RSVP page, on whatever address this app is served from. */
export function rsvpUrl(token: string): string {
  return `${window.location.origin}/rsvp/${token}`;
}
