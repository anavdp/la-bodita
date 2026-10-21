import type { Guest, GuestRelationshipType, GuestSide, RsvpStatus } from "../../api/types";

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

/** "notSet" picks out the guests the couple has not decided a value for yet. */
export type NotSet = "notSet";
export type GuestType = "adult" | "child";

/** The guest table's column filters. Null means the column is not filtered. */
export interface GuestFilters {
  type: GuestType | null;
  relationshipType: GuestRelationshipType | NotSet | null;
  side: GuestSide | NotSet | null;
  rsvpStatus: RsvpStatus | null;
}

export const noGuestFilters: GuestFilters = {
  type: null,
  relationshipType: null,
  side: null,
  rsvpStatus: null,
};

export function hasActiveFilters(filters: GuestFilters): boolean {
  return Object.values(filters).some((value) => value !== null);
}

const matches = <Value>(filter: Value | NotSet | null, value: Value | null) =>
  filter === null || (filter === "notSet" ? value === null : value === filter);

/** A guest is kept only when it matches every filter that is set. */
export function filterGuests(guests: Guest[], filters: GuestFilters): Guest[] {
  return guests.filter(
    (guest) =>
      matches(filters.type, guest.isChild ? "child" : "adult") &&
      matches(filters.relationshipType, guest.relationshipType) &&
      matches(filters.side, guest.side) &&
      matches(filters.rsvpStatus, guest.rsvpStatus),
  );
}
