import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Household } from "../../api/types";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { HouseholdsPanel } from "./HouseholdsPanel";

const rossi = aHousehold({ name: "Famiglia Rossi", guestIds: [1, 2, 3] });
const mendoza = aHousehold({ name: "Mendoza", guestIds: [4, 5] });
const ana = aHousehold({ name: "Ana Perez", guestIds: [6] });
const bianchi = aHousehold({ name: "Bianchi", guestIds: [7, 8], broadcastList: "bride" });

function renderPanel(households: Household[] = [rossi, mendoza, ana], handlers = {}) {
  const callbacks = {
    onDetails: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onChangeBroadcastList: vi.fn(),
    ...handlers,
  };
  renderWithProviders(<HouseholdsPanel households={households} {...callbacks} />);
  return callbacks;
}

describe("HouseholdsPanel", () => {
  it("given households, when the table is rendered, then it shows their name, size and broadcast list", () => {
    renderPanel();

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Name",
      "Guests",
      "Broadcast",
      "Actions",
    ]);
    const row = screen.getByRole("row", { name: /Famiglia Rossi/ });
    expect(within(row).getByText("3")).toBeInTheDocument();
  });

  it("given one-person households, when the table first shows, then they are hidden", () => {
    renderPanel();

    expect(screen.getByLabelText("Show one-person households")).not.toBeChecked();
    expect(screen.queryByText("Ana Perez")).not.toBeInTheDocument();
    expect(screen.getByText("Mendoza")).toBeInTheDocument();
  });

  it("given one-person households, when they are switched on, then they join the table", async () => {
    renderPanel();

    await userEvent.click(screen.getByLabelText("Show one-person households"));

    expect(screen.getByText("Ana Perez")).toBeInTheDocument();
  });

  it("given only people on their own, when the table shows, then it explains how to group them", () => {
    renderPanel([ana]);

    expect(screen.getByText(/No households of two or more yet/)).toBeInTheDocument();
  });

  it("given a household, when its actions are used, then each one reports that household", async () => {
    const { onDetails, onEdit, onDelete } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Actions for Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "See details" }));
    await userEvent.click(screen.getByRole("button", { name: "Actions for Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Actions for Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDetails).toHaveBeenCalledWith(mendoza);
    expect(onEdit).toHaveBeenCalledWith(mendoza);
    expect(onDelete).toHaveBeenCalledWith(mendoza);
  });

  it("given an open menu, when it is toggled again, then it closes", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Actions for Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Actions for Mendoza" }));

    expect(screen.queryByRole("button", { name: "See details" })).not.toBeInTheDocument();
  });

  it("given a household on no list, when the table shows, then a quiet placeholder invites setting one", () => {
    renderPanel();

    const button = screen.getByRole("button", { name: "Mendoza — Not on a list. Change broadcast list" });
    expect(button).not.toHaveTextContent("👰🏼‍♀️");
    expect(button).not.toHaveTextContent("🤵🏼‍♂️");
  });

  it("given a household on the bride's list, when the table shows, then its emoji is the cell", () => {
    renderPanel([bianchi]);

    expect(screen.getByRole("button", { name: "Bianchi — Bride's list. Change broadcast list" })).toHaveTextContent(
      "👰🏼‍♀️",
    );
  });

  it("given a household on no list, when the groom's list is picked, then that household is reported with it", async () => {
    const { onChangeBroadcastList } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Mendoza — Not on a list/ }));
    expect(screen.queryByRole("button", { name: /Take off its list/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Groom's list/ }));

    expect(onChangeBroadcastList).toHaveBeenCalledWith(mendoza, "groom");
    expect(screen.queryByRole("button", { name: /Groom's list/ })).not.toBeInTheDocument();
  });

  it("given a household on a list, when it is taken off, then it is reported with no list", async () => {
    const { onChangeBroadcastList } = renderPanel([bianchi]);

    await userEvent.click(screen.getByRole("button", { name: /Bianchi — Bride's list/ }));
    expect(screen.queryByRole("button", { name: "Bride's list" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Take off its list" }));

    expect(onChangeBroadcastList).toHaveBeenCalledWith(bianchi, null);
  });

  it("given the broadcast menu open, when the actions menu opens, then only one menu shows", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Mendoza — Not on a list/ }));
    await userEvent.click(screen.getByRole("button", { name: "Actions for Mendoza" }));

    expect(screen.queryByRole("button", { name: /Groom's list/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});
