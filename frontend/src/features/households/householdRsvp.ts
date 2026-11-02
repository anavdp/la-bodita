import type { Guest, Household, RsvpStatus } from "../../api/types";

/** A household's RSVP, rolled up from its guests: a guest's status, or "mixed"
 * when some confirmed and the rest declined. */
export type HouseholdRsvp = RsvpStatus | "mixed";

/** The household's guests, in the order its guest ids list them. */
export function membersOf(household: Household, guests: Guest[]): Guest[] {
  const byId = new Map(guests.map((guest) => [guest.id, guest]));
  return household.guestIds.flatMap((id) => byId.get(id) ?? []);
}

/**
 * Anyone still pending makes the household pending: that is the one to chase.
 * Otherwise it is confirmed or declined when everyone agrees, and mixed when
 * they don't. A household with nobody in it has no RSVP.
 */
export function householdRsvpOf(members: Guest[]): HouseholdRsvp | null {
  if (members.length === 0) return null;
  const statuses = new Set(members.map((member) => member.rsvpStatus));
  if (statuses.has("pending")) return "pending";
  if (statuses.size > 1) return "mixed";
  return members[0].rsvpStatus;
}

/** A mixed household has both confirmed and declined guests, so it shows under either. */
export function householdShowsUnder(rsvp: HouseholdRsvp | null, status: RsvpStatus): boolean {
  return rsvp === status || (rsvp === "mixed" && status !== "pending");
}
