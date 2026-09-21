import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestTable } from "./GuestTable";

const noop = () => {};

describe("GuestTable", () => {
  it("given guests, when the table is rendered, then it carries the mockup's columns", () => {
    renderWithProviders(<GuestTable guests={[aGuest()]} onEdit={noop} onDelete={noop} />);

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Name", "Type", "RSVP Status", "Relationship", "Side", "Actions"]);
  });

  it("given an adult family guest, when the row is rendered, then every column reads back", () => {
    renderWithProviders(
      <GuestTable
        guests={[
          aGuest({
            firstName: "Maria",
            lastName: "Rossi",
            isChild: false,
            relationshipType: "family",
            side: "italy",
            rsvpStatus: "confirmed",
          }),
        ]}
        onEdit={noop}
        onDelete={noop}
      />,
    );

    const row = screen.getByRole("row", { name: /Maria Rossi/ });
    expect(within(row).getByText("Maria Rossi")).toBeInTheDocument();
    expect(within(row).getByText("Adult")).toBeInTheDocument();
    expect(within(row).getByText("Confirmed")).toBeInTheDocument();
    expect(within(row).getByText("Family")).toBeInTheDocument();
    expect(within(row).getByText("Italy")).toBeInTheDocument();
  });

  it("given a child guest, when the row is rendered, then the type column says so", () => {
    renderWithProviders(
      <GuestTable
        guests={[aGuest({ firstName: "Lucia", lastName: "Mendoza", isChild: true })]}
        onEdit={noop}
        onDelete={noop}
      />,
    );

    expect(within(screen.getByRole("row", { name: /Lucia Mendoza/ })).getByText("Child")).toBeInTheDocument();
  });

  it("given a guest, when its actions are opened and edit is chosen, then the guest is handed back", async () => {
    const onEdit = vi.fn();
    const guest = aGuest({ firstName: "Carlos", lastName: "Mendoza" });
    renderWithProviders(<GuestTable guests={[guest]} onEdit={onEdit} onDelete={noop} />);

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(guest);
  });

  it("given a delete, when it is confirmed, then the guest is removed", async () => {
    const onDelete = vi.fn();
    const guest = aGuest({ firstName: "Carlos", lastName: "Mendoza" });
    renderWithProviders(<GuestTable guests={[guest]} onEdit={noop} onDelete={onDelete} />);

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
    renderWithProviders(
      <GuestTable
        guests={[aGuest({ firstName: "Carlos", lastName: "Mendoza" })]}
        onEdit={noop}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("given an open menu, when another row's menu is opened, then only one is open at a time", async () => {
    renderWithProviders(
      <GuestTable
        guests={[
          aGuest({ firstName: "Maria", lastName: "Rossi" }),
          aGuest({ firstName: "Carlos", lastName: "Mendoza" }),
        ]}
        onEdit={noop}
        onDelete={noop}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Actions for Maria Rossi" }));
    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
  });
});

describe("the row menu's room to open", () => {
  it("given a menu is opened, when it would fall past the table, then the table reserves room for it", async () => {
    const { container } = renderWithProviders(
      <GuestTable guests={[aGuest({ firstName: "Maria", lastName: "Rossi" })]} onEdit={noop} onDelete={noop} />,
    );
    const scrollArea = container.querySelector(".overflow-x-auto");
    expect(scrollArea).not.toHaveClass("pb-28");

    await userEvent.click(screen.getByRole("button", { name: "Actions for Maria Rossi" }));

    expect(scrollArea).toHaveClass("pb-28");
  });
});
