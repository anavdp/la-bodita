import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { WeBookDialog } from "./WeBookDialog";

const rossi = aHousehold({ name: "Famiglia Rossi", guestIds: [1, 2] });
const neri = aHousehold({ name: "Neri", guestIds: [3] });
const booked = aHousehold({ name: "Las abuelas", hotelRooms: 1, guestIds: [4] });

function renderDialog(household = null as typeof booked | null, onSave = vi.fn().mockResolvedValue(undefined)) {
  renderWithProviders(
    <WeBookDialog household={household} households={[rossi, neri, booked]} onSave={onSave} onClose={vi.fn()} />,
  );
  return onSave;
}

describe("WeBookDialog", () => {
  it("given a new booking, when the households are offered, then those already booked for are left out", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("combobox", { name: "Household" }));

    expect(screen.getByRole("option", { name: "Famiglia Rossi" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Las abuelas" })).not.toBeInTheDocument();
  });

  it("given a household, rooms and a ride with a driver, when it is saved, then all of it is sent", async () => {
    const onSave = renderDialog();

    await userEvent.click(screen.getByRole("combobox", { name: "Household" }));
    await userEvent.click(screen.getByRole("option", { name: "Famiglia Rossi" }));
    await userEvent.click(screen.getByRole("button", { name: "One more room" }));
    await userEvent.click(screen.getByRole("switch", { name: "Needs a ride" }));
    await userEvent.type(screen.getByLabelText("Riding with"), "Tío Carlos");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(rossi.id, { hotelRooms: 2, needsRide: true, rideWith: "Tío Carlos" });
  });

  it("given no household picked, when it is saved, then it asks for one", async () => {
    const onSave = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Pick a household.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given no rooms and no ride, when it is saved, then it asks for at least one", async () => {
    const onSave = renderDialog(booked);

    await userEvent.click(screen.getByRole("button", { name: "One room fewer" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Book at least a room or a ride.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("given an existing booking, when it opens, then it shows what is booked and keeps its household", () => {
    renderDialog(booked);

    expect(screen.getByRole("heading", { name: "Edit booking" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Household" })).toHaveTextContent("Las abuelas");
    expect(screen.getByText("1 room")).toBeInTheDocument();
    expect(screen.queryByLabelText("Riding with")).not.toBeInTheDocument();
  });

  it("given the save fails, when it is saved, then the drawer says so and stays open", async () => {
    const onSave = renderDialog(booked, vi.fn().mockRejectedValue(new Error("boom")));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save this booking.");
  });
});
