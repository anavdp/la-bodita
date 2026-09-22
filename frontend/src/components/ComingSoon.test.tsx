import { screen } from "@testing-library/react";

import { renderWithProviders } from "../testing/renderWithProviders";
import { ComingSoon } from "./ComingSoon";

describe("ComingSoon", () => {
  it("given a screen that has not been built, when it is visited, then it names itself and says so", () => {
    renderWithProviders(<ComingSoon titleKey="nav.budget" />);

    expect(screen.getByRole("heading", { name: "Budget" })).toBeInTheDocument();
    expect(screen.getByText(/lands in a later slice/)).toBeInTheDocument();
  });
});
