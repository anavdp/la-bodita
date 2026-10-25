import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Guest } from "../../api/types";
import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { LanguageProvider } from "../../i18n/LanguageProvider";
import { GuestTable } from "./GuestTable";
import type { GuestSort, GuestSortKey } from "./sorting";

const noop = () => {};
const byName: GuestSort = { key: "name", direction: "ascending" };

interface Handlers {
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onChangeRsvp: (guest: Guest, status: Guest["rsvpStatus"]) => void;
  onSort: (key: GuestSortKey) => void;
  sort: GuestSort;
}

function renderTable(guests: Guest[], handlers: Partial<Handlers> = {}) {
  return renderWithProviders(
    <GuestTable
      guests={guests}
      sort={handlers.sort ?? byName}
      onSort={handlers.onSort ?? noop}
      onEdit={handlers.onEdit ?? noop}
      onDelete={handlers.onDelete ?? noop}
      onChangeRsvp={handlers.onChangeRsvp ?? noop}
    />,
  );
}

describe("GuestTable", () => {
  it("given guests, when the table is rendered, then RSVP sits just before the actions column", () => {
    renderTable([aGuest()]);

    const withoutIcons = (header: HTMLElement) =>
      [...header.childNodes]
        .flatMap((node) => (node instanceof HTMLButtonElement ? [...node.childNodes] : [node]))
        .filter((node) => !(node instanceof HTMLElement && node.getAttribute("aria-hidden") === "true"))
        .map((node) => node.textContent)
        .join("");
    expect(screen.getAllByRole("columnheader").map(withoutIcons)).toEqual([
      "Name",
      "Household",
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
    expect(within(row).getByRole("img", { name: "Italy" })).toHaveTextContent("IT");
  });

  it("given each side, when the column is rendered, then it is that country's code, not its name", () => {
    renderTable([
      aGuest({ firstName: "Ana", lastName: "Uno", side: "venezuela" }),
      aGuest({ firstName: "Ana", lastName: "Dos", side: "spain" }),
      aGuest({ firstName: "Ana", lastName: "Tres", side: "other" }),
    ]);

    expect(screen.getByRole("img", { name: "Venezuela" })).toHaveTextContent("VE");
    expect(screen.getByRole("img", { name: "Spain" })).toHaveTextContent("ES");
    expect(screen.queryByText("Venezuela")).not.toBeInTheDocument();
  });

  it("given a side with no country of its own, when the column is rendered, then it reads WW, for worldwide", () => {
    renderTable([aGuest({ firstName: "Ana", lastName: "Tres", side: "other" })]);

    expect(screen.getByRole("img", { name: "Other" })).toHaveTextContent("WW");
  });

  it("given a guest with no relationship or side yet, when the row is rendered, then both read as not specified", () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi", relationshipType: null, side: null })]);

    const row = screen.getByRole("row", { name: /Maria Rossi/ });
    const cells = within(row).getAllByRole("cell");
    // After name, household and type come relationship and side.
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[3]).toHaveAccessibleName("Not specified");
    expect(cells[4]).toHaveTextContent("—");
    expect(cells[4]).toHaveAccessibleName("Not specified");
  });

  it("given a child guest, when the row is rendered, then the type column says so", () => {
    renderTable([aGuest({ firstName: "Lucia", lastName: "Mendoza", isChild: true })]);

    expect(
      within(screen.getByRole("row", { name: /Lucia Mendoza/ })).getByText("Child"),
    ).toBeInTheDocument();
  });

  it("given an RSVP, when the column is rendered, then it is a pill naming the status", () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" })]);

    const rsvp = screen.getByRole("button", { name: "Maria Rossi — Confirmed. Change RSVP" });
    expect(rsvp).toHaveTextContent("Confirmed");
    expect(rsvp).toHaveAttribute("data-status", "confirmed");
  });

  it("given each status, when its pill is rendered, then it names that status", () => {
    renderTable([
      aGuest({ firstName: "Ana", lastName: "Uno", rsvpStatus: "pending" }),
      aGuest({ firstName: "Ana", lastName: "Dos", rsvpStatus: "declined" }),
    ]);

    expect(screen.getByRole("button", { name: /Ana Uno — Pending/ })).toHaveTextContent("Pending");
    expect(screen.getByRole("button", { name: /Ana Dos — Declined/ })).toHaveTextContent("Declined");
  });

  it("given a guest, when the row is rendered, then it starts with their initials", () => {
    renderTable([aGuest({ firstName: "Maria", lastName: "Rossi" }), aGuest({ firstName: "Cecilia", lastName: "" })]);

    expect(within(screen.getByRole("row", { name: /Maria Rossi/ })).getByText("MR")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Cecilia/ })).getByText("C")).toBeInTheDocument();
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

describe("GuestTable households", () => {
  it("given guests in households, when the table is rendered, then each row names its household", () => {
    const maria = aGuest({ firstName: "Maria", lastName: "Rossi", householdId: 10 });
    const carlos = aGuest({ firstName: "Carlos", lastName: "Mendoza", householdId: 20 });
    renderWithProviders(
      <GuestTable
        sort={byName}
        onSort={noop}
        guests={[maria, carlos]}
        households={[
          { id: 10, name: "Famiglia Rossi", rsvpToken: "a", broadcastList: null, guestIds: [maria.id, 99] },
          { id: 20, name: "Carlos Mendoza", rsvpToken: "b", broadcastList: null, guestIds: [carlos.id] },
        ]}
        onEdit={noop}
        onDelete={noop}
        onChangeRsvp={noop}
      />,
    );

    expect(within(screen.getByRole("row", { name: /Maria Rossi/ })).getByText("Famiglia Rossi")).toBeInTheDocument();
    // Every row is a guest: no household heading rows in between.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});

describe("GuestTable one-person households", () => {
  it("given a guest on their own, when the row is rendered, then the household cell is left blank", () => {
    const carlos = aGuest({ firstName: "Carlos", lastName: "Mendoza", householdId: 20 });
    renderWithProviders(
      <GuestTable
        sort={byName}
        onSort={noop}
        guests={[carlos]}
        households={[{ id: 20, name: "Carlos Mendoza", rsvpToken: "b", broadcastList: null, guestIds: [carlos.id] }]}
        onEdit={noop}
        onDelete={noop}
        onChangeRsvp={noop}
      />,
    );

    const cells = within(screen.getByRole("row", { name: /Carlos Mendoza/ })).getAllByRole("cell");
    expect(cells[1]).toBeEmptyDOMElement();
  });
});

describe("GuestTable relationships", () => {
  it("given a plus one, when the row is rendered in Spanish, then the relationship reads in Spanish", () => {
    renderWithProviders(
      <LanguageProvider initialLanguage="es">
        <GuestTable
          sort={byName}
          onSort={noop}
          guests={[aGuest({ firstName: "Pino", lastName: "Rossi", relationshipType: "plus_one" })]}
          onEdit={noop}
          onDelete={noop}
          onChangeRsvp={noop}
        />
      </LanguageProvider>,
    );

    expect(within(screen.getByRole("row", { name: /Pino Rossi/ })).getByText("Acompañante")).toBeInTheDocument();
  });
});

describe("GuestTable sides", () => {
  it("given a guest from the United States, when the row is rendered, then their side reads US", () => {
    renderWithProviders(
      <GuestTable
        sort={byName}
        onSort={noop}
        guests={[aGuest({ firstName: "Sarah", lastName: "Rizzo", side: "usa" })]}
        onEdit={noop}
        onDelete={noop}
        onChangeRsvp={noop}
      />,
    );

    const row = screen.getByRole("row", { name: /Sarah Rizzo/ });
    expect(within(row).getByRole("img", { name: "United States" })).toHaveTextContent("US");
  });

  it("given the name order, when the table is rendered, then only the name column says it sorts", () => {
    renderTable([aGuest()]);

    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: /Household/ })).not.toHaveAttribute("aria-sort");
    expect(screen.getByRole("columnheader", { name: /RSVP Status/ })).not.toHaveAttribute("aria-sort");
  });

  it.each([
    ["Name", "name"],
    ["Household", "household"],
    ["RSVP Status", "answered"],
  ])("given the table, when the %s header is clicked, then it asks to sort by that column", async (label, key) => {
    const onSort = vi.fn();
    renderTable([aGuest()], { onSort });

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(onSort).toHaveBeenCalledWith(key);
  });

  it("given households Z to A, when the table is rendered, then the household column says so", () => {
    renderTable([aGuest()], { sort: { key: "household", direction: "descending" } });

    expect(screen.getByRole("columnheader", { name: /Household/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Name/ })).not.toHaveAttribute("aria-sort");
  });

  it("given the answer order, when the table is rendered, then the RSVP column says it sorts and shows when each guest answered", () => {
    renderTable(
      [
        aGuest({ firstName: "Maria", rsvpAnsweredAt: "2026-10-25T12:00:00Z" }),
        aGuest({ firstName: "Carlos", rsvpStatus: "pending", rsvpAnsweredAt: null }),
      ],
      { sort: { key: "answered", direction: "descending" } },
    );

    expect(screen.getByRole("columnheader", { name: /RSVP Status/ })).toHaveAttribute("aria-sort", "descending");
    expect(within(screen.getByRole("row", { name: /Maria/ })).getByText("Oct 25")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Carlos/ })).queryByText(/Oct/)).not.toBeInTheDocument();
  });

  it("given the name order, when the table is rendered, then answer dates stay out of the way", () => {
    renderTable([aGuest({ rsvpAnsweredAt: "2026-10-25T12:00:00Z" })]);

    expect(screen.queryByText("Oct 25")).not.toBeInTheDocument();
  });
});
