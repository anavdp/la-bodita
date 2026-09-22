import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("given the shared shell, when it is rendered, then every screen is linked in the mockup's order", () => {
    renderWithProviders(<Sidebar />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/items",
      "/checklist",
      "/calendar",
      "/budget",
      "/guests",
      "/documents",
      "/categories",
    ]);
    expect(screen.getByRole("link", { name: "Guest List" })).toBe(links[5]);
    expect(screen.getByRole("link", { name: "Category Manager" })).toBe(links[7]);
  });

  it("given the guest list route, when the sidebar is rendered, then that item is the active one", () => {
    renderWithProviders(<Sidebar />, { route: "/guests" });

    expect(screen.getByRole("link", { name: "Guest List" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("given a wedding with a date, when the sidebar is rendered, then it counts down to it", () => {
    renderWithProviders(<Sidebar />);

    expect(screen.getByText("La Bodita")).toBeInTheDocument();
    expect(screen.getByText("65 Days to Go")).toBeInTheDocument();
  });

  it("given a wedding without a date, when the sidebar is rendered, then it says so", () => {
    renderWithProviders(<Sidebar />, {
      wedding: { wedding: { id: 1, name: "La Bodita", wedding_date: null } },
    });

    expect(screen.getByText("Date to be decided")).toBeInTheDocument();
  });

  it("given the wedding day, when the sidebar is rendered, then it celebrates instead of counting", () => {
    vi.setSystemTime(new Date("2026-10-29T12:00:00Z"));

    renderWithProviders(<Sidebar />);

    expect(screen.getByText("Today is the day!")).toBeInTheDocument();
  });

  it("given the wedding is still loading, when the sidebar is rendered, then the nav is still usable", () => {
    renderWithProviders(<Sidebar />, { wedding: { wedding: null, isLoading: true } });

    expect(screen.getByRole("link", { name: "Guest List" })).toBeInTheDocument();
  });

  it("given English, when the language toggle is used, then the navigation is translated", async () => {
    renderWithProviders(<Sidebar />);

    await userEvent.click(screen.getByRole("button", { name: "Language: EN" }));

    expect(screen.getByRole("link", { name: "Lista de Invitados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Idioma: ES" })).toBeInTheDocument();
  });
});
