import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { bookedHouseholds, filterBooked, partyOf, roomUsage, summariseBookings } from "./weBook";

const king = { id: 1, name: "Junior King", beds: "1 king bed", available: 19 };
const suite = { id: 2, name: "Suite for 5", beds: null, available: 1 };
const twin = { id: 3, name: "Doble", beds: null, available: 10 };

const parents = aHousehold({ name: "Mamá y Papá", rooms: [{ roomTypeId: 1, count: 1 }], guestIds: [1, 2] });
const friends = aHousehold({ name: "Bianchi", needsRide: true, guestIds: [3, 4] });
const sisters = aHousehold({
  name: "Las hermanas",
  rooms: [
    { roomTypeId: 1, count: 1 },
    { roomTypeId: 2, count: 2 },
  ],
  needsRide: true,
  guestIds: [5, 7],
});
const onTheirOwn = aHousehold({ name: "Neri", guestIds: [6] });
const households = [parents, friends, sisters, onTheirOwn];
const guests = [
  aGuest({ id: 1, rsvpStatus: "confirmed" }),
  aGuest({ id: 2, rsvpStatus: "pending" }),
  aGuest({ id: 3, rsvpStatus: "confirmed" }),
  aGuest({ id: 4, rsvpStatus: "declined" }),
  aGuest({ id: 5, rsvpStatus: "confirmed" }),
  aGuest({ id: 6, rsvpStatus: "confirmed" }),
  aGuest({ id: 7, rsvpStatus: "pending", isChild: true }),
];

describe("what we book for households", () => {
  it("given households, when the booked ones are picked, then only those with a room or a ride are kept", () => {
    expect(bookedHouseholds(households)).toEqual([parents, friends, sisters]);
  });

  it("given booked households, when they are summed up, then declined guests are left out of the people counts", () => {
    expect(summariseBookings(households, guests)).toEqual({ guests: 5, households: 3, rooms: 4, riders: 3 });
  });

  it("given the hotel filter, when it is applied, then only households we book rooms for are left", () => {
    expect(filterBooked(households, "hotel")).toEqual([parents, sisters]);
  });

  it("given the ride filter, when it is applied, then only households that need a ride are left", () => {
    expect(filterBooked(households, "ride")).toEqual([friends, sisters]);
  });

  it("given no filter, when it is applied, then every booked household is left", () => {
    expect(filterBooked(households, null)).toEqual([parents, friends, sisters]);
  });

  it("given room types, when their use is counted, then only booked types show, in the hotel's order, flagged when over", () => {
    expect(roomUsage(households, [king, suite, twin])).toEqual([
      { roomType: king, used: 2, isOver: false },
      { roomType: suite, used: 2, isOver: true },
    ]);
  });

  it("given a household, when its party is counted, then adults and children who may come are told apart", () => {
    expect(partyOf(sisters, guests)).toEqual({ adults: 1, children: 1 });
    expect(partyOf(friends, guests)).toEqual({ adults: 1, children: 0 });
  });
});
