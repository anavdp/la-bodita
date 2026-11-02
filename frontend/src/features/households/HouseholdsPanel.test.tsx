import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Guest, Household, RsvpStatus } from "../../api/types";
import { aGuest } from "../../testing/guestFactory";
import { onAPhone } from "../../testing/onAPhone";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { HouseholdsPanel } from "./HouseholdsPanel";

const rossi = aHousehold({ name: "Famiglia Rossi", guestIds: [1, 2, 3] });
const mendoza = aHousehold({ name: "Mendoza", guestIds: [4, 5] });
const ana = aHousehold({ name: "Ana Perez", guestIds: [6] });
const bianchi = aHousehold({ name: "Bianchi", guestIds: [7, 8], broadcastList: "bride" });

/** Guests 1–8, as the households above list them: Rossi all confirmed, Mendoza
 * mixed, Ana pending, Bianchi all declined. */
const statusOfGuest: Record<number, RsvpStatus> = {
  1: "confirmed",
  2: "confirmed",
  3: "confirmed",
  4: "confirmed",
  5: "declined",
  6: "pending",
  7: "declined",
  8: "declined",
};
const allGuests: Guest[] = Object.entries(statusOfGuest).map(([id, rsvpStatus]) =>
  aGuest({ id: Number(id), rsvpStatus }),
);

function renderPanel(households: Household[] = [rossi, mendoza, ana], handlers = {}, guests: Guest[] = allGuests) {
  const callbacks = {
    onDetails: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onChangeBroadcastList: vi.fn(),
    ...handlers,
  };
  renderWithProviders(<HouseholdsPanel households={households} guests={guests} {...callbacks} />);
  return callbacks;
}

describe("HouseholdsPanel", () => {
  it("given households, when the table is rendered, then it shows their name, size and broadcast list", () => {
    renderPanel();

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Name",
      "Guests",
      "Broadcast",
      "RSVP",
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
    expect(button.querySelector("img")).toBeNull();
  });

  it("given a household on the bride's list, when the table shows, then the dress icon is the cell", () => {
    renderPanel([bianchi]);

    const button = screen.getByRole("button", { name: "Bianchi — Bride's list. Change broadcast list" });
    expect(button.querySelector("img")).toHaveAttribute("src", "/icons/dress.png");
  });

  it("given a household on the groom's list, when the table shows, then the suit icon is the cell", () => {
    renderPanel([aHousehold({ name: "Neri", guestIds: [9, 10], broadcastList: "groom" })]);

    const button = screen.getByRole("button", { name: "Neri — Groom's list. Change broadcast list" });
    expect(button.querySelector("img")).toHaveAttribute("src", "/icons/suit.png");
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

  it("given households, when the table shows, then each one's RSVP is rolled up from its guests", async () => {
    renderPanel([rossi, mendoza, ana, bianchi]);
    await userEvent.click(screen.getByLabelText("Show one-person households"));

    const rsvpOf = (name: string) => screen.getByRole("row", { name: new RegExp(name) }).querySelector("[data-rsvp]");
    expect(rsvpOf("Famiglia Rossi")).toHaveAttribute("data-rsvp", "confirmed");
    expect(rsvpOf("Famiglia Rossi")).toHaveTextContent("Confirmed");
    expect(rsvpOf("Mendoza")).toHaveAttribute("data-rsvp", "mixed");
    expect(rsvpOf("Mendoza")).toHaveTextContent("Mixed");
    expect(rsvpOf("Ana Perez")).toHaveAttribute("data-rsvp", "pending");
    expect(rsvpOf("Bianchi")).toHaveAttribute("data-rsvp", "declined");
  });

  it("given a mixed household, when the table shows, then its pill says what the mix is", () => {
    renderPanel([mendoza]);

    expect(screen.getByTitle("Some confirmed, some declined")).toHaveTextContent("Mixed");
  });

  it("given a household with nobody in it, when the table shows, then its RSVP is a quiet dash", async () => {
    renderPanel([aHousehold({ name: "Vuota", guestIds: [] })]);
    await userEvent.click(screen.getByLabelText("Show one-person households"));

    const row = screen.getByRole("row", { name: /Vuota/ });
    expect(row.querySelector("[data-rsvp]")).toBeNull();
    expect(within(row).getByTitle("No guests yet")).toHaveTextContent("—");
  });

  it("given a phone, when the table shows, then the RSVP pill is the dot alone but still names the status", () => {
    onAPhone();
    renderPanel([mendoza]);

    const pill = screen.getByTitle("Some confirmed, some declined");
    expect(pill).toHaveAttribute("data-rsvp", "mixed");
    expect(within(pill).getByText("Mixed")).toHaveClass("sr-only");
    vi.restoreAllMocks();
  });
});
