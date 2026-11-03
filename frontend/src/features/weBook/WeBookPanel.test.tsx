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
const abuelas = aHousehold({
  name: "Las abuelas",
  rooms: [
    { roomTypeId: 1, count: 1 },
    { roomTypeId: 2, count: 2 },
  ],
  guestIds: [3],
});
const king = { id: 1, name: "Junior King", beds: null, available: 19 };
const suite = { id: 2, name: "Suite for 5", beds: null, available: 1 };

function renderPanel(handlers = {}) {
  const callbacks = { onEdit: vi.fn(), onRemove: vi.fn(), ...handlers };
  renderWithProviders(
    <WeBookPanel
      households={[bianchi, abuelas]}
      guests={[paolo, chiara, ana]}
      roomTypes={[king, suite]}
      {...callbacks}
    />,
  );
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

  it("given a household with rooms booked, when the table shows, then each type is counted and the ride is blank", () => {
    renderPanel();

    const row = screen.getByRole("row", { name: /Las abuelas/ });
    expect(within(row).getByTestId("rooms")).toHaveTextContent("1 Junior King");
    expect(within(row).getByTestId("rooms")).toHaveTextContent("2 Suite for 5");
    expect(within(row).getByTestId("ride")).toHaveTextContent("—");
  });

  it("given rooms booked, when the table shows, then a summary on top counts each type against what the hotel has", () => {
    renderPanel();

    const summary = screen.getByRole("list", { name: "Rooms we book" });
    expect(within(summary).getByText("Junior King").closest("li")).toHaveTextContent("1/19");
    const overbooked = within(summary).getByText("Suite for 5").closest("li");
    expect(overbooked).toHaveTextContent("2/1");
    expect(overbooked).toHaveClass("text-coral");
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

  it("given the room summary, when export is clicked, then the room list opens in the print dialog to save as PDF", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Export room list (PDF)" }));

    expect(print).toHaveBeenCalled();
    expect(document.body.querySelector(".print-sheet")).toHaveTextContent("Junior King");
    print.mockRestore();
  });
});
