import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aGuest } from "../../testing/guestFactory";
import { aHousehold } from "../../testing/householdFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { HouseholdDetailsDialog } from "./HouseholdDetailsDialog";

const maria = aGuest({ firstName: "Maria", lastName: "Rossi", householdId: 10, rsvpStatus: "confirmed" });
const paolo = aGuest({ firstName: "Paolo", lastName: "Rossi", householdId: 10, rsvpStatus: "pending" });
const carlos = aGuest({ firstName: "Carlos", lastName: "Mendoza", householdId: 20 });
const rossi = aHousehold({ id: 10, name: "Famiglia Rossi", rsvpToken: "rossi-token", guestIds: [maria.id, paolo.id] });

describe("HouseholdDetailsDialog", () => {
  it("given a household, when its details open, then every member is listed with their answer", () => {
    renderWithProviders(<HouseholdDetailsDialog household={rossi} guests={[carlos, maria, paolo]} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Famiglia Rossi" });
    const members = within(dialog).getByRole("list", { name: "Members" });
    expect(within(members).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Maria RossiConfirmed",
      "Paolo RossiPending",
    ]);
  });

  it("given a household, when its RSVP link is opened, then it is that household's private page", () => {
    renderWithProviders(<HouseholdDetailsDialog household={rossi} guests={[maria, paolo]} onClose={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Open RSVP page for Famiglia Rossi" })).toHaveAttribute(
      "href",
      `${window.location.origin}/rsvp/rossi-token`,
    );
  });

  it("given a household, when its RSVP link is copied, then the link lands on the clipboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HouseholdDetailsDialog household={rossi} guests={[maria, paolo]} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Copy RSVP link for Famiglia Rossi" }));

    await expect(navigator.clipboard.readText()).resolves.toBe(`${window.location.origin}/rsvp/rossi-token`);
    expect(screen.getByRole("button", { name: "RSVP link copied" })).toBeInTheDocument();
  });

  it("given the details, when they are closed or escaped, then the dialog goes away", async () => {
    const onClose = vi.fn();
    renderWithProviders(<HouseholdDetailsDialog household={rossi} guests={[maria, paolo]} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
