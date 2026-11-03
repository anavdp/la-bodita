import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Household, RoomType } from "../../api/types";
import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { WeBookDialog } from "./WeBookDialog";

const king: RoomType = { id: 1, name: "Junior King", beds: "1 king bed", available: 19 };
const suite: RoomType = { id: 2, name: "Suite for 5", beds: "1 double + 3 single", available: 1 };
const rossi = aHousehold({ name: "Famiglia Rossi", guestIds: [1, 2, 3, 4] });
const neri = aHousehold({ name: "Neri", guestIds: [5] });
const booked = aHousehold({ name: "Las abuelas", rooms: [{ roomTypeId: 2, count: 1 }], guestIds: [6] });
const guests = [
  aGuest({ id: 1, rsvpStatus: "confirmed" }),
  aGuest({ id: 2, rsvpStatus: "pending" }),
  aGuest({ id: 3, rsvpStatus: "confirmed", isChild: true }),
  aGuest({ id: 4, rsvpStatus: "declined", isChild: true }),
  aGuest({ id: 5 }),
  aGuest({ id: 6 }),
];

function renderDialog(
  household: Household | null = null,
  onSave = vi.fn().mockResolvedValue(undefined),
  roomTypes: RoomType[] = [king, suite],
) {
  renderWithProviders(
    <WeBookDialog
      household={household}
      households={[rossi, neri, booked]}
      guests={guests}
      roomTypes={roomTypes}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  return onSave;
}

async function pick(name: string) {
  await userEvent.click(screen.getByRole("combobox", { name: "Household" }));
  await userEvent.click(screen.getByRole("option", { name }));
}

describe("WeBookDialog", () => {
  it("given a new booking, when the households are offered, then those already booked for are left out", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("combobox", { name: "Household" }));

    expect(screen.getByRole("option", { name: "Famiglia Rossi" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Las abuelas" })).not.toBeInTheDocument();
  });

  it("given a household is picked, when the drawer shows it, then it counts who is coming as adults and children", async () => {
    renderDialog();

    await pick("Famiglia Rossi");

    expect(screen.getByText("Coming: 2 adults · 1 children")).toBeInTheDocument();
  });

  it("given rooms of two types and a ride with a driver, when it is saved, then all of it is sent", async () => {
    const onSave = renderDialog();

    await pick("Famiglia Rossi");
    await userEvent.click(screen.getByRole("button", { name: "One more Junior King" }));
    await userEvent.click(screen.getByRole("button", { name: "One more Junior King" }));
    await userEvent.click(screen.getByRole("switch", { name: "Needs a ride" }));
    await userEvent.type(screen.getByLabelText("Riding with"), "Tío Carlos");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(rossi.id, {
      rooms: [{ roomTypeId: 1, count: 2 }],
      needsRide: true,
      rideWith: "Tío Carlos",
    });
  });

  it("given a room type the hotel has run out of, when the drawer shows it, then no more can be added", async () => {
    renderDialog();

    await pick("Famiglia Rossi");

    expect(screen.getByText(/none left/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One more Suite for 5" })).toBeDisabled();
    expect(screen.getByText("1 king bed · 19 left")).toBeInTheDocument();
  });

  it("given a household's own booked room, when it is edited, then that room still counts as theirs to keep", () => {
    renderDialog(booked);

    expect(screen.getByRole("heading", { name: "Edit booking" })).toBeInTheDocument();
    expect(screen.getByTestId("count-2")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "One Suite for 5 fewer" })).toBeEnabled();
  });

  it("given no household picked, when it is saved, then it asks for one", async () => {
    const onSave = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Pick a household.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given no rooms and no ride, when it is saved, then it asks for at least one", async () => {
    const onSave = renderDialog(booked);

    await userEvent.click(screen.getByRole("button", { name: "One Suite for 5 fewer" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Book at least a room or a ride.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given the hotel has no room types yet, when the drawer opens, then it says where to add them", () => {
    renderDialog(null, undefined, []);

    expect(screen.getByText(/No room types yet/)).toBeInTheDocument();
  });

  it("given the save fails, when it is saved, then the drawer says so and stays open", async () => {
    const onSave = renderDialog(booked, vi.fn().mockRejectedValue(new Error("boom")));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save this booking.");
  });
});
