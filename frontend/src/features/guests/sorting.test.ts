import { aGuest } from "../../testing/guestFactory";
import { sortGuests } from "./sorting";

const names = (guests: ReturnType<typeof aGuest>[]) => guests.map((guest) => guest.firstName);

describe("sortGuests", () => {
  const anna = aGuest({ firstName: "Anna", lastName: "Rossi", rsvpAnsweredAt: "2026-10-20T09:00:00Z" });
  const bruno = aGuest({ firstName: "Bruno", lastName: "Bianchi", rsvpAnsweredAt: "2026-10-25T18:00:00Z" });
  const carla = aGuest({ firstName: "Carla", lastName: "Conti", rsvpStatus: "pending", rsvpAnsweredAt: null });

  it("given the name order, when guests are sorted, then they keep the order the API sent", () => {
    expect(names(sortGuests([anna, carla, bruno], "name"))).toEqual(["Anna", "Carla", "Bruno"]);
  });

  it("given the answer order, when guests are sorted, then the newest answers come first and the unanswered last", () => {
    expect(names(sortGuests([anna, carla, bruno], "answered"))).toEqual(["Bruno", "Anna", "Carla"]);
  });

  it("given two answers at the same moment, when sorted by answer, then they fall back to last and first name", () => {
    const same = "2026-10-20T09:00:00Z";
    const paolo = aGuest({ firstName: "Paolo", lastName: "Rossi", rsvpAnsweredAt: same });
    const maria = aGuest({ firstName: "Maria", lastName: "Rossi", rsvpAnsweredAt: same });
    const lucia = aGuest({ firstName: "Lucia", lastName: "Bianchi", rsvpAnsweredAt: same });

    expect(names(sortGuests([paolo, maria, lucia], "answered"))).toEqual(["Lucia", "Maria", "Paolo"]);
  });

  it("given guests who never answered, when sorted by answer, then they stay in name order among themselves", () => {
    const zoe = aGuest({ firstName: "Zoe", lastName: "Alba", rsvpStatus: "pending", rsvpAnsweredAt: null });

    expect(names(sortGuests([carla, zoe], "answered"))).toEqual(["Zoe", "Carla"]);
  });

  it("given a list, when sorted, then the original is left untouched", () => {
    const guests = [anna, bruno];

    sortGuests(guests, "answered");

    expect(names(guests)).toEqual(["Anna", "Bruno"]);
  });
});
