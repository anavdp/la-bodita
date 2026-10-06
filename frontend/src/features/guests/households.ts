import type { Guest, Household } from "../../api/types";

/** The guests in a household, in the order the list already has. */
export function membersOf(household: Pick<Household, "id">, guests: Guest[]): Guest[] {
  return guests.filter((guest) => guest.householdId === household.id);
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
