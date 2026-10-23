import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Route, Routes, useLocation } from "react-router-dom";

import { useSearch } from "../../search/SearchProvider";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { TopBar } from "./TopBar";

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

function SearchProbe() {
  return <p data-testid="term">{useSearch().term}</p>;
}

describe("TopBar", () => {
  it("given the shared shell, when it is rendered, then it carries the mockup's global actions", () => {
    renderWithProviders(<TopBar />);

    expect(screen.getByRole("searchbox", { name: "Search guests by name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Task/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("given a screen that is not built yet, when its action is offered, then it is disabled", () => {
    renderWithProviders(<TopBar />);

    expect(screen.getByRole("button", { name: "Notifications" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();
  });

  it("given any screen, when Add Task is pressed, then the checklist opens on a new task", async () => {
    renderWithProviders(
      <>
        <TopBar />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </>,
      { route: "/items" },
    );

    await userEvent.click(screen.getByRole("button", { name: /Add Task/ }));

    expect(screen.getByTestId("location")).toHaveTextContent("/checklist?add=task");
  });

  it("given a light planner, when the theme toggle is pressed, then it turns dark and offers light back", async () => {
    renderWithProviders(<TopBar />);

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("given a search term, when it is typed, then the screens below can read it", async () => {
    renderWithProviders(
      <>
        <TopBar />
        <SearchProbe />
      </>,
    );

    await userEvent.type(screen.getByRole("searchbox"), "Rossi");

    expect(screen.getByTestId("term")).toHaveTextContent("Rossi");
  });

  it("given a signed-in user, when the account button is opened, then it shows who they are and offers sign-out", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TopBar />, { auth: { signOut } });

    await userEvent.click(screen.getByRole("button", { name: "Account: Vicky" }));

    expect(screen.getByText("vicky@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: /Sign out/ }));
    expect(signOut).toHaveBeenCalled();
  });

  it("given the account menu is open, when it is pressed again, then it closes", async () => {
    renderWithProviders(<TopBar />);
    const account = screen.getByRole("button", { name: "Account: Vicky" });

    await userEvent.click(account);
    await userEvent.click(account);

    expect(screen.queryByRole("menuitem", { name: /Sign out/ })).not.toBeInTheDocument();
  });
});
