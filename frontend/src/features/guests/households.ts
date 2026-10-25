import type { Guest, Household } from "../../api/types";

/** The guests in a household, in the order the list already has. */
export function membersOf(household: Pick<Household, "id">, guests: Guest[]): Guest[] {
  return guests.filter((guest) => guest.householdId === household.id);
}

/** Household names by id, for families only: someone on their own has no household to show. */
export function householdNamesOf(households: Household[]): Map<number, string> {
  return new Map(
    households.filter((household) => household.guestIds.length > 1).map((household) => [household.id, household.name]),
  );
}

/**
 * The household's private RSVP page. The planner itself is only reachable
 * privately, so links handed to guests use the public address when one is
 * configured, and this app's own address otherwise.
 */
export function rsvpUrl(token: string): string {
  const publicUrl = import.meta.env.VITE_PUBLIC_URL?.replace(/\/+$/, "");
  return `${publicUrl || window.location.origin}/rsvp/${token}`;
}
