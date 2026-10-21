import { aGuest } from "../../testing/guestFactory";
import { filterGuests, hasActiveFilters, noGuestFilters } from "./filtering";

describe("filterGuests", () => {
  const lucia = aGuest({ firstName: "Lucia", isChild: false, relationshipType: "family", side: "italy", rsvpStatus: "confirmed" });
  const sofia = aGuest({ firstName: "Sofia", isChild: true, relationshipType: "family", side: "venezuela", rsvpStatus: "declined" });
  const marta = aGuest({ firstName: "Marta", isChild: false, relationshipType: null, side: null, rsvpStatus: "pending" });
  const carlos = aGuest({ firstName: "Carlos", isChild: false, relationshipType: "friends", side: "venezuela", rsvpStatus: "pending" });
  const guests = [lucia, sofia, marta, carlos];

  it("given no filters, when the guests are filtered, then everyone is kept", () => {
    expect(filterGuests(guests, noGuestFilters)).toEqual(guests);
  });

  it("given an RSVP filter, when the guests are filtered, then only that status is kept", () => {
    expect(filterGuests(guests, { ...noGuestFilters, rsvpStatus: "pending" })).toEqual([marta, carlos]);
  });

  it("given a type filter, when the guests are filtered, then only adults or only children are kept", () => {
    expect(filterGuests(guests, { ...noGuestFilters, type: "child" })).toEqual([sofia]);
    expect(filterGuests(guests, { ...noGuestFilters, type: "adult" })).toEqual([lucia, marta, carlos]);
  });

  it("given a relationship filter, when the guests are filtered, then only that relationship is kept", () => {
    expect(filterGuests(guests, { ...noGuestFilters, relationshipType: "friends" })).toEqual([carlos]);
  });

  it("given the not-set relationship, when the guests are filtered, then guests without one are kept", () => {
    expect(filterGuests(guests, { ...noGuestFilters, relationshipType: "notSet" })).toEqual([marta]);
  });

  it("given a side filter, when the guests are filtered, then only that side is kept", () => {
    expect(filterGuests(guests, { ...noGuestFilters, side: "venezuela" })).toEqual([sofia, carlos]);
    expect(filterGuests(guests, { ...noGuestFilters, side: "notSet" })).toEqual([marta]);
  });

  it("given several filters, when the guests are filtered, then a guest must match all of them", () => {
    expect(
      filterGuests(guests, { ...noGuestFilters, side: "venezuela", rsvpStatus: "pending" }),
    ).toEqual([carlos]);
  });
});

describe("hasActiveFilters", () => {
  it("given no filters, when checked, then none are active", () => {
    expect(hasActiveFilters(noGuestFilters)).toBe(false);
  });

  it("given one filter, when checked, then the filters are active", () => {
    expect(hasActiveFilters({ ...noGuestFilters, side: "italy" })).toBe(true);
  });
});
