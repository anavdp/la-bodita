import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "../../api/client";
import type { RoomType } from "../../api/types";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { RoomTypesDialog } from "./RoomTypesDialog";

const king: RoomType = { id: 1, name: "Junior King", beds: "1 king bed", available: 19 };
const twin: RoomType = { id: 2, name: "Doble", beds: null, available: 10 };

function renderDialog(handlers = {}) {
  const callbacks = {
    onCreate: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onSaved: vi.fn(),
    onClose: vi.fn(),
    ...handlers,
  };
  renderWithProviders(<RoomTypesDialog roomTypes={[king, twin]} {...callbacks} />);
  return callbacks;
}

const rowOf = (name: string) => screen.getByDisplayValue(name).closest("li") as HTMLElement;

describe("RoomTypesDialog", () => {
  it("given room types, when the drawer opens, then each can be read and changed", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Hotel rooms" })).toBeInTheDocument();
    expect(within(rowOf("Junior King")).getByLabelText("Beds")).toHaveValue("1 king bed");
    expect(within(rowOf("Doble")).getByLabelText("Rooms")).toHaveValue(10);
  });

  it("given changes, when they are saved, then only what changed is sent and the page is told", async () => {
    const { onCreate, onUpdate, onDelete, onSaved } = renderDialog();

    const available = within(rowOf("Doble")).getByLabelText("Rooms");
    await userEvent.clear(available);
    await userEvent.type(available, "12");
    await userEvent.click(screen.getByRole("button", { name: "Remove Junior King" }));
    await userEvent.click(screen.getByRole("button", { name: "Add room type" }));
    const added = screen.getAllByLabelText("Room type").at(-1) as HTMLElement;
    await userEvent.type(added, "Suite for 5");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onUpdate).toHaveBeenCalledWith(2, { name: "Doble", beds: "", available: 12 });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(1);
    expect(onCreate).toHaveBeenCalledWith({ name: "Suite for 5", beds: "", available: 0 });
    expect(onSaved).toHaveBeenCalled();
  });

  it("given a room type without a name, when it is saved, then it asks for one", async () => {
    const { onCreate, onSaved } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Add room type" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Every room type needs a name.");
    expect(onCreate).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("given a room type booked for a household, when it is removed, then the drawer says why it stays", async () => {
    const { onSaved } = renderDialog({ onDelete: vi.fn().mockRejectedValue(new ApiError("in use", 409)) });

    await userEvent.click(screen.getByRole("button", { name: "Remove Junior King" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Junior King is booked for a household. Take it off those bookings first.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("given the save fails, when it is saved, then the drawer says so", async () => {
    renderDialog({ onUpdate: vi.fn().mockRejectedValue(new Error("boom")) });

    await userEvent.type(within(rowOf("Doble")).getByLabelText("Beds"), "2 single");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save the hotel rooms.");
  });
});
