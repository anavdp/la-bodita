import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { WeBookStats } from "./WeBookStats";

const summary = { guests: 15, households: 7, rooms: 6, riders: 11 };

describe("WeBookStats", () => {
  it("given a summary, when it is shown, then it reads guests, households, rooms to book and riders", () => {
    renderWithProviders(<WeBookStats summary={summary} activeFilter={null} onToggleFilter={vi.fn()} />);

    const group = screen.getByRole("group", { name: "What we book" });
    expect(group).toHaveTextContent("15 Guests");
    expect(group).toHaveTextContent("7 Households");
    expect(group).toHaveTextContent("6 Rooms to book");
    expect(group).toHaveTextContent("11 Need a ride");
  });

  it("given the summary, when Need a ride is clicked, then the table is asked to show riders only", async () => {
    const onToggleFilter = vi.fn();
    renderWithProviders(<WeBookStats summary={summary} activeFilter={null} onToggleFilter={onToggleFilter} />);

    await userEvent.click(screen.getByRole("button", { name: /Need a ride/ }));

    expect(onToggleFilter).toHaveBeenCalledWith("ride");
  });

  it("given the hotel filter is on, when the summary shows, then Rooms to book reads as pressed", () => {
    renderWithProviders(<WeBookStats summary={summary} activeFilter="hotel" onToggleFilter={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Rooms to book/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Need a ride/ })).toHaveAttribute("aria-pressed", "false");
  });
});
