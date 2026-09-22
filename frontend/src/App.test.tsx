import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "./App";
import * as guestsApi from "./api/guests";
import * as weddingsApi from "./api/weddings";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { WeddingProvider } from "./wedding/WeddingProvider";

vi.mock("./api/guests");
vi.mock("./api/weddings");

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LanguageProvider>
        <WeddingProvider>
          <AppRoutes />
        </WeddingProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    vi.mocked(weddingsApi.listWeddings).mockResolvedValue([
      { id: 1, name: "La Bodita", wedding_date: "2026-10-29" },
    ]);
    vi.mocked(guestsApi.listGuests).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given the guest list route, when it is visited, then the screen is shown inside the shell", async () => {
    renderAt("/guests");

    expect(await screen.findByRole("heading", { name: "Guest List" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("given the root, when it is visited, then the guest list is where the app opens", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Guest List" })).toBeInTheDocument();
  });

  it("given a screen that is not built yet, when it is visited, then it says it is coming", async () => {
    renderAt("/budget");

    expect(await screen.findByRole("heading", { name: "Budget" })).toBeInTheDocument();
    expect(screen.getByText(/lands in a later slice/)).toBeInTheDocument();
  });

  it("given an unknown route, when it is visited, then the app falls back to the guest list", async () => {
    renderAt("/nowhere");

    expect(await screen.findByRole("heading", { name: "Guest List" })).toBeInTheDocument();
  });
});
