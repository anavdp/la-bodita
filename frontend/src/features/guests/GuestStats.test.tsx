import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestStats } from "./GuestStats";

const guests = [
  aGuest({ rsvpStatus: "confirmed" }),
  aGuest({ rsvpStatus: "confirmed" }),
  aGuest({ rsvpStatus: "pending" }),
  aGuest({ rsvpStatus: "declined" }),
];

describe("GuestStats", () => {
  it("given a guest list, when the summary is rendered, then each RSVP state gets its count and share", () => {
    renderWithProviders(<GuestStats guests={guests} activeStatus={null} onToggleStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Confirmed/ })).toHaveTextContent("2 Confirmed 50%");
    expect(screen.getByRole("button", { name: /Pending/ })).toHaveTextContent("1 Pending 25%");
    expect(screen.getByRole("button", { name: /Declined/ })).toHaveTextContent("1 Declined 25%");
  });

  it("given a guest list, when the summary is rendered, then the bar is split by each state's count", () => {
    const { container } = renderWithProviders(<GuestStats guests={guests} activeStatus={null} />);

    const segments = container.querySelectorAll<HTMLElement>("[data-status]");
    expect(Array.from(segments, (segment) => segment.style.flexGrow)).toEqual(["2", "1", "1"]);
  });

  it("given a status, when it is clicked, then the summary asks to filter by it", async () => {
    const onToggleStatus = vi.fn();
    renderWithProviders(<GuestStats guests={guests} activeStatus={null} onToggleStatus={onToggleStatus} />);

    await userEvent.click(screen.getByRole("button", { name: /Pending/ }));

    expect(onToggleStatus).toHaveBeenCalledWith("pending");
  });

  it("given a status being filtered, when the summary is rendered, then only that status shows as pressed", () => {
    renderWithProviders(<GuestStats guests={guests} activeStatus="declined" onToggleStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Declined/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Confirmed/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("given no way to filter, when the summary is rendered, then the statuses are not buttons", () => {
    renderWithProviders(<GuestStats guests={guests} activeStatus={null} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Confirmed").parentElement).toHaveTextContent("2 Confirmed 50%");
  });
});
