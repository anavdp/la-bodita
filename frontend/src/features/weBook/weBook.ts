import type { Guest, Household, RoomType } from "../../api/types";

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

export interface RoomUse {
  roomType: RoomType;
  used: number;
  /** More booked than the hotel holds. */
  isOver: boolean;
}

export function roomCount(household: Household): number {
  return household.rooms.reduce((sum, room) => sum + room.count, 0);
}

/** Most guests book their own; these are the households we book something for. */
export function bookedHouseholds(households: Household[]): Household[] {
  return households.filter((household) => roomCount(household) > 0 || household.needsRide);
}

/** A household's members who are still coming, or may be: someone who declined needs nothing booked. */
export function comingMembers(household: Household, guests: Guest[]): Guest[] {
  const members = new Set(household.guestIds);
  return guests.filter((guest) => members.has(guest.id) && guest.rsvpStatus !== "declined");
}

/** Who a household's rooms are for, as the hotel asks: adults and children, leaving out who declined. */
export function partyOf(household: Household, guests: Guest[]): { adults: number; children: number } {
  const coming = comingMembers(household, guests);
  const children = coming.filter((guest) => guest.isChild).length;
  return { adults: coming.length - children, children };
}

export function summariseBookings(households: Household[], guests: Guest[]): BookingSummary {
  const booked = bookedHouseholds(households);
  const count = (each: Household[]) =>
    each.reduce((sum, household) => sum + comingMembers(household, guests).length, 0);
  return {
    guests: count(booked),
    households: booked.length,
    rooms: booked.reduce((sum, household) => sum + roomCount(household), 0),
    riders: count(booked.filter((household) => household.needsRide)),
  };
}

export function filterBooked(households: Household[], filter: BookingFilter | null): Household[] {
  const booked = bookedHouseholds(households);
  if (filter === "hotel") return booked.filter((household) => roomCount(household) > 0);
  if (filter === "ride") return booked.filter((household) => household.needsRide);
  return booked;
}

/** How many rooms of each type we book against what the hotel holds, in the hotel's order. */
export function roomUsage(households: Household[], roomTypes: RoomType[]): RoomUse[] {
  const used = new Map<number, number>();
  for (const room of households.flatMap((household) => household.rooms)) {
    used.set(room.roomTypeId, (used.get(room.roomTypeId) ?? 0) + room.count);
  }
  return roomTypes.map((roomType) => {
    const count = used.get(roomType.id) ?? 0;
    return { roomType, used: count, isOver: count > roomType.available };
  });
}
