import { aGuest } from "../../testing/guestFactory";
import {
  filterGuestsByColumns,
  filterGuestsByName,
  hasColumnFilters,
  noColumnFilters,
  toggleColumnFilter,
} from "./filtering";

describe("filterGuestsByColumns", () => {
  const lucia = aGuest({ firstName: "Lucia", isChild: false, relationshipType: "family", side: "italy" });
  const sofia = aGuest({ firstName: "Sofia", isChild: true, relationshipType: "family", side: "venezuela" });
  const marta = aGuest({ firstName: "Marta", isChild: false, relationshipType: null, side: null });
  const carlos = aGuest({ firstName: "Carlos", isChild: false, relationshipType: "friends", side: "spain" });
  const guests = [lucia, sofia, marta, carlos];

  it("given no column filters, when the guests are filtered, then everyone is kept", () => {
    expect(filterGuestsByColumns(guests, noColumnFilters)).toEqual(guests);
  });

  it("given a type filter, when the guests are filtered, then only adults or only children are kept", () => {
    expect(filterGuestsByColumns(guests, { ...noColumnFilters, type: ["child"] })).toEqual([sofia]);
    expect(filterGuestsByColumns(guests, { ...noColumnFilters, type: ["adult"] })).toEqual([lucia, marta, carlos]);
  });

  it("given several sides ticked, when the guests are filtered, then a guest from any of them is kept", () => {
    expect(filterGuestsByColumns(guests, { ...noColumnFilters, side: ["italy", "spain"] })).toEqual([lucia, carlos]);
  });

  it("given not set ticked, when the guests are filtered, then guests with nothing in that column are kept", () => {
    expect(filterGuestsByColumns(guests, { ...noColumnFilters, relationship: ["notSet"] })).toEqual([marta]);
    expect(filterGuestsByColumns(guests, { ...noColumnFilters, side: ["notSet", "venezuela"] })).toEqual([
      sofia,
      marta,
    ]);
  });

  it("given filters on several columns, when the guests are filtered, then a guest must match every column", () => {
    expect(
      filterGuestsByColumns(guests, { ...noColumnFilters, relationship: ["family"], type: ["adult"] }),
    ).toEqual([lucia]);
  });
});

describe("toggleColumnFilter", () => {
  it("given a value not ticked, when it is toggled, then it is added to that column only", () => {
    const filters = toggleColumnFilter({ ...noColumnFilters, type: ["child"] }, "side", "italy");

    expect(filters).toEqual({ type: ["child"], relationship: [], side: ["italy"] });
  });

  it("given a ticked value, when it is toggled, then it is removed", () => {
    expect(toggleColumnFilter({ ...noColumnFilters, side: ["italy", "spain"] }, "side", "italy").side).toEqual([
      "spain",
    ]);
  });
});

describe("hasColumnFilters", () => {
  it("given nothing ticked, when checked, then no filter is on", () => {
    expect(hasColumnFilters(noColumnFilters)).toBe(false);
  });

  it("given one value ticked, when checked, then a filter is on", () => {
    expect(hasColumnFilters({ ...noColumnFilters, relationship: ["notSet"] })).toBe(true);
  });
});

describe("filterGuestsByName", () => {
  it("given a term with spaces around it, when guests are searched, then the whole name matches regardless of case", () => {
    const maria = aGuest({ firstName: "Maria", lastName: "Rossi" });
    const carlos = aGuest({ firstName: "Carlos", lastName: "Mendoza" });

    expect(filterGuestsByName([maria, carlos], "  ia ross ")).toEqual([maria]);
    expect(filterGuestsByName([maria, carlos], " ")).toEqual([maria, carlos]);
  });
});
