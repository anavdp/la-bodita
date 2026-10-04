import type { Guest, Household } from "../../api/types";
import { fullName } from "./filtering";

export interface HouseholdGroup {
  householdId: number;
  label: string;
  /** Null until the households have loaded: the group still shows, just without its link. */
  rsvpToken: string | null;
  /** The whole household, even when a search is showing only some of it. */
  memberCount: number;
  guests: Guest[];
}

/** A household's name if it has one, otherwise who is in it. */
export function householdLabel(
  name: string | null,
  members: Pick<Guest, "firstName" | "lastName">[],
): string {
  if (name !== null) {
    return name;
  }
  if (members.length === 1) {
    return fullName(members[0]);
  }
  return [...new Set(members.map((member) => member.lastName))].join(" & ");
}

/** Visible guests gathered under their households, in the order the list already has. */
export function groupByHousehold(
  visibleGuests: Guest[],
  allGuests: Guest[],
  households: Household[],
): HouseholdGroup[] {
  const householdsById = new Map(households.map((household) => [household.id, household]));
  const groups = new Map<number, HouseholdGroup>();

  for (const guest of visibleGuests) {
    let group = groups.get(guest.householdId);
    if (group === undefined) {
      const members = allGuests.filter((member) => member.householdId === guest.householdId);
      const household = householdsById.get(guest.householdId);
      group = {
        householdId: guest.householdId,
        label: householdLabel(household?.name ?? null, members),
        rsvpToken: household?.rsvpToken ?? null,
        memberCount: members.length,
        guests: [],
      };
      groups.set(guest.householdId, group);
    }
    group.guests.push(guest);
  }
  return [...groups.values()];
}

/** The household's private RSVP page, on whatever address this app is served from. */
export function rsvpUrl(token: string): string {
  return `${window.location.origin}/rsvp/${token}`;
}
