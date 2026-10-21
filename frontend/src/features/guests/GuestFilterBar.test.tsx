import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { noGuestFilters } from "./filtering";
import { GuestFilterBar } from "./GuestFilterBar";

describe("GuestFilterBar", () => {
  it("given no filters, when the bar is rendered, then every column shows all guests and nothing can be cleared", () => {
    renderWithProviders(<GuestFilterBar filters={noGuestFilters} onChange={vi.fn()} shown={4} total={4} />);

    for (const column of ["Type", "Relationship", "Side", "RSVP Status"]) {
      expect(screen.getByLabelText(column)).toHaveDisplayValue("All");
    }
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("given a column, when a value is picked, then the bar asks for that filter", async () => {
    const onChange = vi.fn();
    renderWithProviders(<GuestFilterBar filters={noGuestFilters} onChange={onChange} shown={4} total={4} />);

    await userEvent.selectOptions(screen.getByLabelText("Side"), "Italy");

    expect(onChange).toHaveBeenCalledWith({ ...noGuestFilters, side: "italy" });
  });

  it("given a relationship, when not set is picked, then the bar asks for guests without one", async () => {
    const onChange = vi.fn();
    renderWithProviders(<GuestFilterBar filters={noGuestFilters} onChange={onChange} shown={4} total={4} />);

    await userEvent.selectOptions(screen.getByLabelText("Relationship"), "Not set");

    expect(onChange).toHaveBeenCalledWith({ ...noGuestFilters, relationshipType: "notSet" });
  });

  it("given a filtered column, when all is picked again, then the bar clears that filter", async () => {
    const onChange = vi.fn();
    const filters = { ...noGuestFilters, type: "child" as const };
    renderWithProviders(<GuestFilterBar filters={filters} onChange={onChange} shown={1} total={4} />);

    await userEvent.selectOptions(screen.getByLabelText("Type"), "All");

    expect(onChange).toHaveBeenCalledWith(noGuestFilters);
  });

  it("given active filters, when the bar is rendered, then it says how many guests are shown and can clear them", async () => {
    const onChange = vi.fn();
    const filters = { ...noGuestFilters, rsvpStatus: "pending" as const, side: "venezuela" as const };
    renderWithProviders(<GuestFilterBar filters={filters} onChange={onChange} shown={2} total={8} />);

    expect(screen.getByLabelText("RSVP Status")).toHaveDisplayValue("Pending");
    expect(screen.getByText("Showing 2 of 8 guests")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onChange).toHaveBeenCalledWith(noGuestFilters);
  });
});
