import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Guest } from "../../api/types";
import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestTable } from "./GuestTable";

const noop = () => {};

interface Handlers {
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onChangeRsvp: (guest: Guest, status: Guest["rsvpStatus"]) => void;
}

function renderTable(guests: Guest[], handlers: Partial<Handlers> = {}) {
  return renderWithProviders(
    <GuestTable
      guests={guests}
      onEdit={handlers.onEdit ?? noop}
      onDelete={handlers.onDelete ?? noop}
      onChangeRsvp={handlers.onChangeRsvp ?? noop}
    />,
  );
}

describe("GuestTable", () => {
  it("given guests, when the table is rendered, then RSVP sits just before the actions column", () => {
    renderTable([aGuest()]);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Name",
      "Type",
      "Relationship",
      "Side",
      "RSVP Status",
      "Actions",
    ]);
  });

  it("given an adult family guest, when the row is rendered, then every column reads back", () => {
    renderTable([
      aGuest({
        firstName: "Maria",
        lastName: "Rossi",
        isChild: false,
        relationshipType: "family",
        side: "italy",
        rsvpStatus: "confirmed",
      }),
    ]);

    const row = screen.getByRole("row", { name: /Maria Rossi/ });
    expect(within(row).getByText("Maria Rossi")).toBeInTheDocument();
    expect(within(row).getByText("Adult")).toBeInTheDocument();
    expect(within(row).getByText("Family")).toBeInTheDocument();
    expect(within(row).getByRole("img", { name: "Italy" })).toHaveTextContent("🇮🇹");
  });

  it("given each side, when the column is rendered, then it is that country's flag, not its name", () => {
    renderTable([
      aGuest({ firstName: "Ana", lastName: "Uno", side: "venezuela" }),
      aGuest({ firstName: "Ana", lastName: "Dos", side: "spain" }),
      aGuest({ firstName: "Ana", lastName: "Tres", side: "other" }),
    ]);

    expect(screen.getByRole("img", { name: "Venezuela" })).toHaveTextContent("🇻🇪");
    expect(screen.getByRole("img", { name: "Spain" })).toHaveTextContent("🇪🇸");
    expect(screen.queryByText("Venezuela")).not.toBeInTheDocument();
  });

  it("given a side with no flag of its own, when the column is rendered, then it still reads as a side", () => {
    renderTable([aGuest({ firstName: "Ana", lastName: "Tres", side: "other" })]);

    expect(screen.getByRole("img", { name: "Other" })).toHaveTextContent("🌍");
  });

  it("given a guest with no relationship or side yet, when the row is rendered, then both read as not specified", () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi", relationshipType: null, side: null })]);

    const row = screen.getByRole("row", { name: /Maria Rossi/ });
    const cells = within(row).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("—");
    expect(cells[2]).toHaveAccessibleName("Not specified");
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[3]).toHaveAccessibleName("Not specified");
  });

  it("given a child guest, when the row is rendered, then the type column says so", () => {
    renderTable([aGuest({ firstName: "Lucia", lastName: "Mendoza", isChild: true })]);

    expect(
      within(screen.getByRole("row", { name: /Lucia Mendoza/ })).getByText("Child"),
    ).toBeInTheDocument();
  });

  it("given an RSVP, when the column is rendered, then it is the status icon, not its label", () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" })]);

    const rsvp = screen.getByRole("button", { name: "Maria Rossi — Confirmed. Change RSVP" });
    expect(rsvp).toHaveTextContent("check_circle");
    expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
  });

  it("given each status, when its icon is rendered, then it matches the one on the summary cards", () => {
    renderTable([
      aGuest({ firstName: "Ana", lastName: "Uno", rsvpStatus: "pending" }),
      aGuest({ firstName: "Ana", lastName: "Dos", rsvpStatus: "declined" }),
    ]);

    expect(screen.getByRole("button", { name: /Ana Uno — Pending/ })).toHaveTextContent("hourglass_empty");
    expect(screen.getByRole("button", { name: /Ana Dos — Declined/ })).toHaveTextContent("cancel");
  });

  it("given a confirmed guest, when its RSVP icon is clicked, then only the other statuses are offered", async () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" })]);

    await userEvent.click(screen.getByRole("button", { name: /Maria Rossi — Confirmed/ }));

    expect(screen.getByRole("button", { name: "Mark as Pending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as Declined" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as Confirmed" })).not.toBeInTheDocument();
  });

  it("given the RSVP menu, when a status is chosen, then that guest's new status is handed back", async () => {
    const onChangeRsvp = vi.fn();
    const guest = aGuest({ firstName: "Carlos", lastName: "Mendoza", rsvpStatus: "pending" });
    renderTable([guest], { onChangeRsvp });

    await userEvent.click(screen.getByRole("button", { name: /Carlos Mendoza — Pending/ }));
    await userEvent.click(screen.getByRole("button", { name: "Mark as Confirmed" }));

    expect(onChangeRsvp).toHaveBeenCalledWith(guest, "confirmed");
    expect(screen.queryByRole("button", { name: "Mark as Confirmed" })).not.toBeInTheDocument();
  });

  it("given an open actions menu, when the RSVP menu is opened, then only one menu is open", async () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" })]);

    await userEvent.click(screen.getByRole("button", { name: "Actions for Maria Rossi" }));
    await userEvent.click(screen.getByRole("button", { name: /Maria Rossi — Confirmed/ }));

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as Pending" })).toBeInTheDocument();
  });

  it("given a guest, when its actions are opened and edit is chosen, then the guest is handed back", async () => {
    const onEdit = vi.fn();
    const guest = aGuest({ firstName: "Carlos", lastName: "Mendoza" });
    renderTable([guest], { onEdit });

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(guest);
  });

  it("given a delete, when it is confirmed, then the guest is removed", async () => {
    const onDelete = vi.fn();
    const guest = aGuest({ firstName: "Carlos", lastName: "Mendoza" });
    renderTable([guest], { onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Carlos Mendoza from the guest list?" }),
    );

    expect(onDelete).toHaveBeenCalledWith(guest);
  });

  it("given a delete, when it is not confirmed, then nothing happens", async () => {
    const onDelete = vi.fn();
    renderTable([aGuest({ firstName: "Carlos", lastName: "Mendoza" })], { onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("given an open menu, when another row's menu is opened, then only one is open at a time", async () => {
    renderTable([
      aGuest({ firstName: "Maria", lastName: "Rossi" }),
      aGuest({ firstName: "Carlos", lastName: "Mendoza" }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Actions for Maria Rossi" }));
    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
  });
});

describe("the row menus' room to open", () => {
  it("given a menu is opened, when it would fall past the table, then the table reserves room for it", async () => {
    const { container } = renderTable([aGuest({ firstName: "Maria", lastName: "Rossi" })]);
    const scrollArea = container.querySelector(".overflow-x-auto");
    expect(scrollArea).not.toHaveClass("pb-28");

    await userEvent.click(screen.getByRole("button", { name: "Actions for Maria Rossi" }));

    expect(scrollArea).toHaveClass("pb-28");
  });

  it("given the RSVP menu is opened, when it would fall past the table, then room is reserved too", async () => {
    const { container } = renderTable([
      aGuest({ firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: /Maria Rossi — Confirmed/ }));

    expect(container.querySelector(".overflow-x-auto")).toHaveClass("pb-28");
  });
});
