import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { SidePanel } from "./SidePanel";

describe("SidePanel", () => {
  it("given a title, when it opens, then it is a dialog named after it", () => {
    renderWithProviders(
      <SidePanel title="New item" onClose={vi.fn()}>
        <p>Body</p>
      </SidePanel>,
    );

    expect(screen.getByRole("dialog", { name: "New item" })).toHaveTextContent("Body");
  });

  it("given the panel, when the close button, Escape or the backdrop is used, then it asks to close", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <SidePanel title="New item" onClose={onClose}>
        <p>Body</p>
      </SidePanel>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByTestId("side-panel-backdrop"));
    await userEvent.click(screen.getByText("Body"));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
