import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { bookedHouseholds, filterBooked, summariseBookings } from "./weBook";

const parents = aHousehold({ name: "Mamá y Papá", hotelRooms: 1, guestIds: [1, 2] });
const friends = aHousehold({ name: "Bianchi", needsRide: true, guestIds: [3, 4] });
const sisters = aHousehold({ name: "Las hermanas", hotelRooms: 2, needsRide: true, guestIds: [5] });
const onTheirOwn = aHousehold({ name: "Neri", guestIds: [6] });
const households = [parents, friends, sisters, onTheirOwn];
const guests = [
  aGuest({ id: 1, rsvpStatus: "confirmed" }),
  aGuest({ id: 2, rsvpStatus: "pending" }),
  aGuest({ id: 3, rsvpStatus: "confirmed" }),
  aGuest({ id: 4, rsvpStatus: "declined" }),
  aGuest({ id: 5, rsvpStatus: "confirmed" }),
  aGuest({ id: 6, rsvpStatus: "confirmed" }),
];

describe("what we book for households", () => {
  it("given households, when the booked ones are picked, then only those with a room or a ride are kept", () => {
    expect(bookedHouseholds(households)).toEqual([parents, friends, sisters]);
  });

  it("given booked households, when they are summed up, then declined guests are left out of the people counts", () => {
    expect(summariseBookings(households, guests)).toEqual({ guests: 4, households: 3, rooms: 3, riders: 2 });
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
});
