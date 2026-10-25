import { aGuest } from "../../testing/guestFactory";
import { nextSort, sortGuests } from "./sorting";
import type { GuestSort } from "./sorting";

type TestGuest = ReturnType<typeof aGuest>;
const names = (guests: TestGuest[]) => guests.map((guest) => guest.firstName);
const byName: GuestSort = { key: "name", direction: "ascending" };

describe("sortGuests", () => {
  const anna = aGuest({ firstName: "Anna", lastName: "Rossi", rsvpAnsweredAt: "2026-10-20T09:00:00Z" });
  const bruno = aGuest({ firstName: "Bruno", lastName: "Bianchi", rsvpAnsweredAt: "2026-10-25T18:00:00Z" });
  const carla = aGuest({ firstName: "Carla", lastName: "Conti", rsvpStatus: "pending", rsvpAnsweredAt: null });

  it("given the name order, when guests are sorted, then they go by last name then first name", () => {
    const maria = aGuest({ firstName: "Maria", lastName: "Rossi" });

    expect(names(sortGuests([maria, carla, anna, bruno], byName))).toEqual(["Bruno", "Carla", "Anna", "Maria"]);
  });

  it("given the name order reversed, when guests are sorted, then they go from Z to A", () => {
    expect(names(sortGuests([anna, carla, bruno], { key: "name", direction: "descending" }))).toEqual([
      "Anna",
      "Carla",
      "Bruno",
    ]);
  });

  it("given the newest answers first, when guests are sorted, then the unanswered come last", () => {
    expect(names(sortGuests([anna, carla, bruno], { key: "answered", direction: "descending" }))).toEqual([
      "Bruno",
      "Anna",
      "Carla",
    ]);
  });

  it("given the oldest answers first, when guests are sorted, then the unanswered still come last", () => {
    expect(names(sortGuests([carla, bruno, anna], { key: "answered", direction: "ascending" }))).toEqual([
      "Anna",
      "Bruno",
      "Carla",
    ]);
  });

  it("given two answers at the same moment, when sorted by answer, then they fall back to last and first name", () => {
    const same = "2026-10-20T09:00:00Z";
    const paolo = aGuest({ firstName: "Paolo", lastName: "Rossi", rsvpAnsweredAt: same });
    const maria = aGuest({ firstName: "Maria", lastName: "Rossi", rsvpAnsweredAt: same });
    const lucia = aGuest({ firstName: "Lucia", lastName: "Bianchi", rsvpAnsweredAt: same });

    expect(names(sortGuests([paolo, maria, lucia], { key: "answered", direction: "descending" }))).toEqual([
      "Lucia",
      "Maria",
      "Paolo",
    ]);
  });

  describe("by household", () => {
    const rossi = aGuest({ firstName: "Paolo", lastName: "Rossi", householdId: 1 });
    const maria = aGuest({ firstName: "Maria", lastName: "Rossi", householdId: 1 });
    const zeta = aGuest({ firstName: "Lucia", lastName: "Alba", householdId: 2 });
    const alone = aGuest({ firstName: "Ana", lastName: "Garcia", householdId: 3 });
    const householdNames = new Map([
      [1, "Famiglia Rossi"],
      [2, "Zeta family"],
    ]);

    it("given households A to Z, when sorted, then families go together by name and guests on their own come last", () => {
      expect(
        names(sortGuests([alone, zeta, rossi, maria], { key: "household", direction: "ascending" }, householdNames)),
      ).toEqual(["Maria", "Paolo", "Lucia", "Ana"]);
    });

    it("given households Z to A, when sorted, then the families reverse and guests on their own still come last", () => {
      expect(
        names(sortGuests([alone, rossi, zeta, maria], { key: "household", direction: "descending" }, householdNames)),
      ).toEqual(["Lucia", "Maria", "Paolo", "Ana"]);
    });
  });

  it("given a list, when sorted, then the original is left untouched", () => {
    const guests = [anna, bruno];

    sortGuests(guests, { key: "answered", direction: "descending" });

    expect(names(guests)).toEqual(["Anna", "Bruno"]);
  });
});

describe("nextSort", () => {
  it("given another column, when it is clicked, then it sorts by it in its natural direction", () => {
    expect(nextSort(byName, "household")).toEqual({ key: "household", direction: "ascending" });
    expect(nextSort(byName, "answered")).toEqual({ key: "answered", direction: "descending" });
  });

  it("given the column already sorting, when it is clicked again, then the direction flips", () => {
    expect(nextSort(byName, "name")).toEqual({ key: "name", direction: "descending" });
    expect(nextSort({ key: "answered", direction: "descending" }, "answered")).toEqual({
      key: "answered",
      direction: "ascending",
    });
  });
});
