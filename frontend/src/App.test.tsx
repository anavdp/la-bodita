import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "./App";
import * as guestsApi from "./api/guests";
import * as householdsApi from "./api/households";
import * as rsvpApi from "./api/rsvp";
import * as weddingsApi from "./api/weddings";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { WeddingProvider } from "./wedding/WeddingProvider";

vi.mock("./api/guests");
vi.mock("./api/households");
vi.mock("./api/rsvp");
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
    vi.mocked(householdsApi.listHouseholds).mockResolvedValue([]);
  });

  it("given a household's RSVP link, when it is visited, then the RSVP page shows without the planner shell", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      householdName: "Famiglia Rossi",
      weddingName: "La Bodita",
      weddingDate: "2026-10-29",
      guests: [],
    });

    renderAt("/rsvp/abc");

    expect(await screen.findByRole("heading", { name: "La Bodita" })).toBeInTheDocument();
    expect(rsvpApi.getInvitation).toHaveBeenCalledWith("abc");
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("given the public RSVP address, when it is visited, then the name lookup shows without the planner shell", async () => {
    renderAt("/rsvp");

    expect(await screen.findByRole("textbox", { name: "First name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Last name" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given the guest list route, when it is visited, then the screen is shown inside the shell", async () => {
    renderAt("/guests");

    expect(await screen.findByRole("heading", { name: "Guest List" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("given the households route, when it is visited, then the guest list opens on its households tab", async () => {
    renderAt("/guests/households");

    expect(await screen.findByRole("button", { name: "Add Household" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Households" })).toHaveAttribute("aria-current", "page");
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
