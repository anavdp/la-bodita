import type { Guest } from "../../api/types";

/** The guest table's sortable columns. */
export type GuestSortKey = "name" | "household" | "answered";

export interface GuestSort {
  key: GuestSortKey;
  direction: "ascending" | "descending";
}

/** What a column sorts by first: names and households A to Z, answers newest first. */
const firstDirection: Record<GuestSortKey, GuestSort["direction"]> = {
  name: "ascending",
  household: "ascending",
  answered: "descending",
};

export function firstDirectionOf(key: GuestSortKey): GuestSort["direction"] {
  return firstDirection[key];
}

/** A click on a column header: the same column flips, another starts in its own direction. */
export function nextSort(current: GuestSort, key: GuestSortKey): GuestSort {
  if (current.key !== key) {
    return { key, direction: firstDirection[key] };
  }
  return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
}

function byName(first: Guest, second: Guest): number {
  return first.lastName.localeCompare(second.lastName) || first.firstName.localeCompare(second.firstName);
}

/**
 * Orders the guests by the chosen column, in a new list. Guests with nothing in
 * that column (not answered yet, on their own) go last whichever the direction,
 * and ties fall back to name.
 */
export function sortGuests(guests: Guest[], sort: GuestSort, householdNames = new Map<number, string>()): Guest[] {
  const sign = sort.direction === "ascending" ? 1 : -1;
  const compare = (first: Guest, second: Guest): number => {
    if (sort.key === "name") {
      return sign * byName(first, second);
    }
    const valueOf =
      sort.key === "answered"
        ? (guest: Guest) => guest.rsvpAnsweredAt
        : (guest: Guest) => householdNames.get(guest.householdId) ?? null;
    const [firstValue, secondValue] = [valueOf(first), valueOf(second)];
    if (firstValue === null || secondValue === null) {
      return (firstValue === null ? 1 : 0) - (secondValue === null ? 1 : 0) || byName(first, second);
    }
    const order =
      sort.key === "answered"
        ? Date.parse(firstValue) - Date.parse(secondValue)
        : firstValue.localeCompare(secondValue);
    return sign * order || byName(first, second);
  };
  return [...guests].sort(compare);
}
