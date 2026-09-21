import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useSearch } from "../../search/SearchProvider";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { TopBar } from "./TopBar";

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

    expect(screen.getByRole("button", { name: /Add Task/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();
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
});
