import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { WeBookPanel } from "./WeBookPanel";

const paolo = aGuest({ id: 1, firstName: "Paolo", lastName: "Bianchi", rsvpStatus: "confirmed" });
const chiara = aGuest({ id: 2, firstName: "Chiara", lastName: "Bianchi", rsvpStatus: "declined" });
const ana = aGuest({ id: 3, firstName: "Ana", lastName: "Mendoza", rsvpStatus: "pending" });
const bianchi = aHousehold({ name: "Bianchi", needsRide: true, rideWith: "Tío Carlos", guestIds: [1, 2] });
const abuelas = aHousehold({ name: "Las abuelas", hotelRooms: 2, guestIds: [3] });

function renderPanel(handlers = {}) {
  const callbacks = { onEdit: vi.fn(), onRemove: vi.fn(), ...handlers };
  renderWithProviders(<WeBookPanel households={[bianchi, abuelas]} guests={[paolo, chiara, ana]} {...callbacks} />);
  return callbacks;
}

describe("WeBookPanel", () => {
  it("given booked households, when the table shows, then each lists its guests by name", () => {
    renderPanel();

    const row = screen.getByRole("row", { name: /Bianchi/ });
    expect(within(row).getByText("Paolo Bianchi")).toBeInTheDocument();
    expect(within(row).getByText("Chiara Bianchi")).toBeInTheDocument();
  });

  it("given a guest who declined, when the table shows, then their name is crossed out", () => {
    renderPanel();

    expect(screen.getByText("Chiara Bianchi").closest("li")).toHaveClass("line-through");
    expect(screen.getByText("Paolo Bianchi").closest("li")).not.toHaveClass("line-through");
  });

  it("given a household that needs a ride, when the table shows, then it counts who still comes and names the driver", () => {
    renderPanel();

    const ride = within(screen.getByRole("row", { name: /Bianchi/ })).getByTestId("ride");
    expect(ride).toHaveTextContent("1");
    expect(ride).toHaveTextContent("with Tío Carlos");
  });

  it("given a household with rooms booked, when the table shows, then the rooms are counted and the ride is blank", () => {
    renderPanel();

    const row = screen.getByRole("row", { name: /Las abuelas/ });
    expect(within(row).getByTestId("rooms")).toHaveTextContent("2");
    expect(within(row).getByTestId("ride")).toHaveTextContent("—");
  });

  it("given a booked household, when it is taken off the list, then the page is told", async () => {
    const { onRemove } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Actions for Bianchi" }));
    await userEvent.click(screen.getByRole("button", { name: "Take off this list" }));

    expect(onRemove).toHaveBeenCalledWith(bianchi);
  });

  it("given a booked household, when Edit is picked, then the page is told", async () => {
    const { onEdit } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Actions for Las abuelas" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(abuelas);
  });
});
