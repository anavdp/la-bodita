import { screen } from "@testing-library/react";

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
});
