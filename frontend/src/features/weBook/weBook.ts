import type { Guest, Household } from "../../api/types";

/** What the summary's Rooms to book and Need a ride figures narrow the table to. */
export type BookingFilter = "hotel" | "ride";

export interface BookingSummary {
  /** People in the booked households who have not declined. */
  guests: number;
  households: number;
  rooms: number;
  /** People who need a ride and have not declined. */
  riders: number;
}

/** Most guests book their own; these are the households we book something for. */
export function bookedHouseholds(households: Household[]): Household[] {
  return households.filter((household) => household.hotelRooms > 0 || household.needsRide);
}

/** A household's members who are still coming, or may be: someone who declined needs nothing booked. */
export function comingMembers(household: Household, guests: Guest[]): Guest[] {
  const members = new Set(household.guestIds);
  return guests.filter((guest) => members.has(guest.id) && guest.rsvpStatus !== "declined");
}

export function summariseBookings(households: Household[], guests: Guest[]): BookingSummary {
  const booked = bookedHouseholds(households);
  const count = (each: Household[]) =>
    each.reduce((sum, household) => sum + comingMembers(household, guests).length, 0);
  return {
    guests: count(booked),
    households: booked.length,
    rooms: booked.reduce((sum, household) => sum + household.hotelRooms, 0),
    riders: count(booked.filter((household) => household.needsRide)),
  };
}

export function filterBooked(households: Household[], filter: BookingFilter | null): Household[] {
  const booked = bookedHouseholds(households);
  if (filter === "hotel") return booked.filter((household) => household.hotelRooms > 0);
  if (filter === "ride") return booked.filter((household) => household.needsRide);
  return booked;
}
