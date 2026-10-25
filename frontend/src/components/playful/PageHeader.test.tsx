import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { HeaderAction, PageHeader } from "./PageHeader";

describe("HeaderAction", () => {
  it("given a page's main action, when it is shown, then it is named by its label and runs on click", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <PageHeader title="Items" subtitle="Everything you're deciding on">
        <HeaderAction icon="add" label="Add Item" onClick={onClick} />
      </PageHeader>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Add Item" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("given a phone, when the action is shown, then only its icon shows and its label goes to screen readers", () => {
    renderWithProviders(<HeaderAction icon="upload" label="Import CSV" variant="secondary" onClick={() => {}} />);

    const button = screen.getByRole("button", { name: "Import CSV" });
    expect(button).toHaveClass("max-sm:h-12", "max-sm:w-12");
    expect(screen.getByText("Import CSV")).toHaveClass("max-sm:sr-only");
    expect(button).toHaveAttribute("title", "Import CSV");
  });

  it("given an action that cannot run yet, when it is shown, then it is disabled", () => {
    renderWithProviders(<HeaderAction icon="upload" label="Import CSV" disabled onClick={() => {}} />);

    expect(screen.getByRole("button", { name: "Import CSV" })).toBeDisabled();
  });
});
