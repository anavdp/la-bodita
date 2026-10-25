import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { AppLayout } from "./AppLayout";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, Outlet: () => <p>the current screen</p> };
});

/** Answers media queries as a laptop-width screen would. */
const onALaptop = () =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query.includes("min-width"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

describe("AppLayout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("given a laptop, when the sidebar's own fold button is clicked, then it folds down to its icons and back", async () => {
    onALaptop();
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const sidebar = screen.getByRole("complementary");

    await user.click(within(sidebar).getByRole("button", { name: "Collapse menu" }));

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByRole("link", { name: "Checklist" })).toHaveAttribute("title", "Checklist");
    expect(screen.queryByText("La Bodita")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Menu" })).not.toBeInTheDocument();

    await user.click(within(sidebar).getByRole("button", { name: "Expand menu" }));
    expect(screen.getByText("La Bodita")).toBeInTheDocument();
  });

  it("given the sidebar folded on a laptop, when the planner is opened again, then it stays folded", async () => {
    onALaptop();
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<AppLayout />);
    await user.click(screen.getByRole("button", { name: "Collapse menu" }));
    unmount();

    renderWithProviders(<AppLayout />);

    expect(screen.getByRole("button", { name: "Expand menu" })).toBeInTheDocument();
  });

  it("given a phone, when the menu drawer is out, then it has no fold button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.queryByRole("button", { name: "Collapse menu" })).not.toBeInTheDocument();
  });
});
