import { screen, within } from "@testing-library/react";

import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { RoomListSheet } from "./RoomListSheet";

const king = { id: 1, name: "Junior King", beds: "1 king bed", available: 19 };
const twin = { id: 2, name: "Doble", beds: null, available: 10 };
const parents = aHousehold({ name: "Mamá y Papá", rooms: [{ roomTypeId: 1, count: 1 }], guestIds: [1, 2, 3] });
const riders = aHousehold({ name: "Neri", needsRide: true, guestIds: [4] });
const guests = [
  aGuest({ id: 1, firstName: "Carmen", lastName: "de Palma" }),
  aGuest({ id: 2, firstName: "Vitale", lastName: "de Palma" }),
  aGuest({ id: 3, firstName: "Tío", lastName: "Pepe", rsvpStatus: "declined" }),
  aGuest({ id: 4, firstName: "Sara", lastName: "Neri" }),
];

describe("RoomListSheet", () => {
  it("given rooms booked, when the sheet is printed, then it lists each type against what the hotel has", () => {
    renderWithProviders(<RoomListSheet households={[parents, riders]} guests={guests} roomTypes={[king, twin]} />);

    const types = screen.getByRole("table", { name: "Rooms we book" });
    expect(within(types).getByRole("row", { name: /Junior King/ })).toHaveTextContent("1/19");
    expect(within(types).getByRole("row", { name: /Doble/ })).toHaveTextContent("0/10");
  });

  it("given households with rooms, when the sheet is printed, then each names its rooms and who is coming", () => {
    renderWithProviders(<RoomListSheet households={[parents, riders]} guests={guests} roomTypes={[king, twin]} />);

    const people = screen.getByRole("table", { name: "Hotel rooms" });
    const row = within(people).getByRole("row", { name: /Mamá y Papá/ });
    expect(row).toHaveTextContent("1 Junior King");
    expect(row).toHaveTextContent("Carmen de Palma");
    expect(row).not.toHaveTextContent("Tío Pepe");
    expect(within(people).queryByRole("row", { name: /Neri/ })).not.toBeInTheDocument();
  });
});
