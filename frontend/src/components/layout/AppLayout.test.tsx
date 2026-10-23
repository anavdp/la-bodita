import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { AppLayout } from "./AppLayout";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, Outlet: () => <p>the current screen</p> };
});

describe("AppLayout", () => {
  it("given any screen, when it is rendered, then it sits inside the shared sidebar and top bar", () => {
    renderWithProviders(<AppLayout />);

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByText("the current screen")).toBeInTheDocument();
  });

  it("given a phone, when the menu button is tapped, then the navigation slides in and a link closes it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const menuButton = screen.getByRole("button", { name: "Menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await user.click(within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("link", { name: "Checklist" }));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("given the menu open on a phone, when the backdrop is tapped or Escape pressed, then it closes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const menuButton = screen.getByRole("button", { name: "Menu" });

    await user.click(menuButton);
    await user.click(screen.getByTestId("menu-backdrop"));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);
    await user.keyboard("{Escape}");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
