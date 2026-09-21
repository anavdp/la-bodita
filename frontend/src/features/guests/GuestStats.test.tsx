import { screen } from "@testing-library/react";

import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestStats } from "./GuestStats";

describe("GuestStats", () => {
  it("given a guest list, when the summary cards are rendered, then each RSVP state gets its count", () => {
    renderWithProviders(
      <GuestStats
        guests={[
          aGuest({ rsvpStatus: "confirmed" }),
          aGuest({ rsvpStatus: "confirmed" }),
          aGuest({ rsvpStatus: "pending" }),
          aGuest({ rsvpStatus: "declined" }),
        ]}
      />,
    );

    expect(screen.getByRole("group", { name: "Confirmed" })).toHaveTextContent("2");
    expect(screen.getByRole("group", { name: "Pending" })).toHaveTextContent("1");
    expect(screen.getByRole("group", { name: "Declined" })).toHaveTextContent("1");
  });

  it("given a share of the guest list, when a card is rendered, then its progress bar reports it", () => {
    renderWithProviders(
      <GuestStats guests={[aGuest({ rsvpStatus: "confirmed" }), aGuest({ rsvpStatus: "pending" })]} />,
    );

    const confirmed = screen.getByRole("progressbar", { name: "Confirmed" });
    expect(confirmed).toHaveAttribute("aria-valuenow", "50");
  });
});
