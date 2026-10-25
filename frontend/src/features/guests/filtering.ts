import type { Guest, GuestRelationshipType, GuestSide } from "../../api/types";

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

/** Guests with nothing in a column (no relationship or side yet) can be picked out too. */
export type NotSet = "notSet";

/** What each filterable column can be narrowed to. */
export interface ColumnFilterValues {
  type: "adult" | "child";
  relationship: GuestRelationshipType | NotSet;
  side: GuestSide | NotSet;
}

export type GuestFilterColumn = keyof ColumnFilterValues;

/** The values ticked under each column's funnel; an empty list lets everyone through. */
export type GuestColumnFilters = { [column in GuestFilterColumn]: ColumnFilterValues[column][] };

export const noColumnFilters: GuestColumnFilters = { type: [], relationship: [], side: [] };

const filterColumns: GuestFilterColumn[] = ["type", "relationship", "side"];

function columnValueOf(guest: Guest, column: GuestFilterColumn): string {
  if (column === "type") {
    return guest.isChild ? "child" : "adult";
  }
  const value = column === "relationship" ? guest.relationshipType : guest.side;
  return value ?? "notSet";
}

/**
 * The guests that match every filtered column. Within a column the ticked values
 * add up: Italy and Spain keep guests from either side.
 */
export function filterGuestsByColumns(guests: Guest[], filters: GuestColumnFilters): Guest[] {
  return guests.filter((guest) =>
    filterColumns.every((column) => {
      const ticked: string[] = filters[column];
      return ticked.length === 0 || ticked.includes(columnValueOf(guest, column));
    }),
  );
}

/** Ticks a value under a column's funnel, or unticks it if it was ticked. */
export function toggleColumnFilter<Column extends GuestFilterColumn>(
  filters: GuestColumnFilters,
  column: Column,
  value: ColumnFilterValues[Column],
): GuestColumnFilters {
  const ticked = filters[column] as ColumnFilterValues[Column][];
  return {
    ...filters,
    [column]: ticked.includes(value) ? ticked.filter((current) => current !== value) : [...ticked, value],
  };
}

export function hasColumnFilters(filters: GuestColumnFilters): boolean {
  return filterColumns.some((column) => filters[column].length > 0);
}
