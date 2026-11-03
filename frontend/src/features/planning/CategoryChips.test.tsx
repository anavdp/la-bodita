import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { aCategory } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { CategoryChips } from "./CategoryChips";

const church = aCategory({ name: "Church", emoji: "church" });
const cake = aCategory({ name: "Cake", emoji: "🎂" });

/** Answers media queries as a phone-width screen would. */
const onAPhone = () =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query.includes("max-width"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

describe("CategoryChips", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("given a wide screen, when the filter is shown, then each category is a chip", () => {
    renderWithProviders(<CategoryChips categories={[church, cake]} activeId={null} onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Church" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("given a wide screen, when the filter is shown, then each chip shows only its icon, with the name as its label and tooltip", () => {
    renderWithProviders(
      <CategoryChips
        categories={[church, cake]}
        activeId={church.id}
        onChange={() => {}}
        counts={{ all: 5, byCategory: new Map([[church.id, 3]]) }}
      />,
    );

    const churchChip = screen.getByRole("button", { name: "Church 3" });
    expect(churchChip).toHaveAttribute("title", "Church");
    expect(churchChip).toHaveTextContent(/^3$/);
    expect(churchChip.querySelector("img")).toHaveAttribute("src", "/icons/church.png");
    expect(churchChip).toHaveAttribute("aria-pressed", "true");
    const cakeChip = screen.getByRole("button", { name: "Cake 0" });
    expect(cakeChip).toHaveAttribute("title", "Cake");
    expect(cakeChip).toHaveTextContent("🎂");
    expect(cakeChip).not.toHaveTextContent("Cake");
  });

  it("given a phone, when the filter is shown, then the chips fold into one dropdown", () => {
    onAPhone();
    renderWithProviders(
      <CategoryChips
        categories={[church, cake]}
        activeId={cake.id}
        onChange={() => {}}
        counts={{ all: 5, byCategory: new Map([[cake.id, 2]]) }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Church" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by category" })).toHaveTextContent("🎂 Cake 2");
  });

  it("given a phone, when a category is picked in the dropdown, then the screen narrows to it, and All widens it back", async () => {
    onAPhone();
    const onChange = vi.fn();
    renderWithProviders(<CategoryChips categories={[church, cake]} activeId={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Filter by category" }));
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Church" }));
    expect(onChange).toHaveBeenLastCalledWith(church.id);

    await userEvent.click(screen.getByRole("combobox", { name: "Filter by category" }));
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "All categories" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
