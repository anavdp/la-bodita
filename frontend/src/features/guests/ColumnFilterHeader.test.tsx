import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { ColumnFilterHeader } from "./ColumnFilterHeader";
import { noColumnFilters } from "./filtering";
import type { GuestColumnFilters, GuestFilterColumn } from "./filtering";

const noop = () => {};

interface Options {
  column?: GuestFilterColumn;
  filters?: GuestColumnFilters;
  isOpen?: boolean;
  onChange?: (filters: GuestColumnFilters) => void;
  onToggle?: () => void;
  onClose?: () => void;
}

function renderHeader({
  column = "side",
  filters = noColumnFilters,
  isOpen = false,
  onChange = noop,
  onToggle = noop,
  onClose = noop,
}: Options = {}) {
  return renderWithProviders(
    <table>
      <thead>
        <tr>
          <ColumnFilterHeader
            column={column}
            label="Side"
            filters={filters}
            isOpen={isOpen}
            onChange={onChange}
            onToggle={onToggle}
            onClose={onClose}
            className=""
          />
        </tr>
      </thead>
    </table>,
  );
}

describe("ColumnFilterHeader", () => {
  it("given nothing ticked, when the header is rendered, then its funnel offers to filter and the menu is closed", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: "Filter by Side" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("given the header, when its funnel is clicked, then it asks to open", async () => {
    const onToggle = vi.fn();
    renderHeader({ onToggle });

    await userEvent.click(screen.getByRole("button", { name: "Filter by Side" }));

    expect(onToggle).toHaveBeenCalled();
  });

  it("given the side menu is open, when it is shown, then every side and not set can be ticked", () => {
    renderHeader({ isOpen: true, filters: { ...noColumnFilters, side: ["italy"] } });

    const menu = screen.getByRole("menu", { name: "Show only" });
    const options = within(menu).getAllByRole("menuitemcheckbox");
    const names = ["Venezuela", "Italy", "Spain", "United States", "Other", "Not set"];
    expect(options).toHaveLength(names.length);
    names.forEach((name, index) => expect(options[index]).toHaveAccessibleName(name));
    expect(options[1]).toHaveTextContent("IT");
    expect(within(menu).getByRole("menuitemcheckbox", { name: /Italy/ })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemcheckbox", { name: /Spain/ })).toHaveAttribute("aria-checked", "false");
  });

  it("given the relationship menu is open, when it is shown, then each relationship is offered", () => {
    renderHeader({ column: "relationship", isOpen: true });

    expect(screen.getAllByRole("menuitemcheckbox").map((option) => option.textContent)).toEqual([
      "Family",
      "Friends",
      "Bride's friends",
      "Groom's friends",
      "Plus one",
      "Other",
      "Not set",
    ]);
  });

  it("given the type menu is open, when it is shown, then adults and children are offered and nothing else", () => {
    renderHeader({ column: "type", isOpen: true });

    expect(screen.getAllByRole("menuitemcheckbox").map((option) => option.textContent)).toEqual(["Adult", "Child"]);
  });

  it("given Italy is ticked, when Spain is ticked too, then both are kept", async () => {
    const onChange = vi.fn();
    renderHeader({ isOpen: true, filters: { ...noColumnFilters, side: ["italy"] }, onChange });

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: /Spain/ }));

    expect(onChange).toHaveBeenCalledWith({ ...noColumnFilters, side: ["italy", "spain"] });
  });

  it("given two sides ticked, when the header is rendered, then it says how many are on", () => {
    renderHeader({ filters: { ...noColumnFilters, side: ["italy", "spain"] } });

    const funnel = screen.getByRole("button", { name: "Filter by Side, 2 on" });
    expect(funnel).toHaveTextContent("2");
  });

  it("given ticks in another column, when this header is rendered, then it shows none of them", () => {
    renderHeader({ filters: { ...noColumnFilters, type: ["child"] } });

    expect(screen.getByRole("button", { name: "Filter by Side" })).toBeInTheDocument();
  });

  it("given ticked sides, when Clear is clicked, then only this column is cleared", async () => {
    const onChange = vi.fn();
    renderHeader({ isOpen: true, filters: { type: ["child"], relationship: [], side: ["italy"] }, onChange });

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onChange).toHaveBeenCalledWith({ type: ["child"], relationship: [], side: [] });
  });

  it("given the menu is open, when Done is clicked, then it closes", async () => {
    const onClose = vi.fn();
    renderHeader({ isOpen: true, onClose });

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("given the menu is open, when Escape is pressed, then it closes", async () => {
    const onClose = vi.fn();
    renderHeader({ isOpen: true, onClose });

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
