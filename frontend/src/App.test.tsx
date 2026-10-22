import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "./App";
import * as budgetApi from "./api/budget";
import * as categoriesApi from "./api/categories";
import * as guestsApi from "./api/guests";
import * as householdsApi from "./api/households";
import * as itemsApi from "./api/items";
import * as rsvpApi from "./api/rsvp";
import * as tasksApi from "./api/tasks";
import * as weddingsApi from "./api/weddings";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { WeddingProvider } from "./wedding/WeddingProvider";

vi.mock("./api/budget");
vi.mock("./api/categories");
vi.mock("./api/guests");
vi.mock("./api/households");
vi.mock("./api/items");
vi.mock("./api/rsvp");
vi.mock("./api/tasks");
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
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([]);
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue([]);
  });

  it("given a household's RSVP link, when it is visited, then the RSVP page shows without the planner shell", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      householdName: "Famiglia Rossi",
      weddingName: "La Bodita",
      weddingDate: "2026-10-29",
      guests: [],
      greeting: "general",
    });

    renderAt("/rsvp/abc");

    expect(await screen.findByRole("heading", { name: "La Bodita" })).toBeInTheDocument();
    expect(rsvpApi.getInvitation).toHaveBeenCalledWith("abc");
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("given a household's thank-you address, when it is visited, then it shows without the planner shell", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      householdName: "Famiglia Rossi",
      weddingName: "La Bodita",
      weddingDate: "2026-10-29",
      guests: [{ id: 1, firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" }],
      greeting: "family",
    });

    renderAt("/rsvp/abc/gracias");

    expect(await screen.findByRole("heading", { name: "¡Gracias!" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("given the public RSVP address, when it is visited, then the name lookup shows in Spanish without the planner shell", async () => {
    renderAt("/rsvp");

    expect(await screen.findByRole("textbox", { name: "Escribe tu nombre y apellido" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("given a guest who switched to English on the lookup, when their invitation opens, then it stays in English", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([
      { token: "abc", name: "Famiglia Rossi", members: [{ firstName: "Maria", lastName: "Rossi" }] },
    ]);
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      householdName: "Famiglia Rossi",
      weddingName: "La Bodita",
      weddingDate: "2026-10-29",
      guests: [],
      greeting: "general",
    });
    renderAt("/rsvp");

    await userEvent.click(await screen.findByRole("button", { name: "English" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Type your full name" }), "Maria Rossi");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("We'll send you more information about La Bodita very soon.")).toBeInTheDocument();
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

  it("given the items route, when it is visited, then the items screen is shown inside the shell", async () => {
    renderAt("/items");

    expect(await screen.findByRole("heading", { name: "Items", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/No items yet/)).toBeInTheDocument();
  });

  it("given the checklist route, when it is visited, then the checklist is shown inside the shell", async () => {
    renderAt("/checklist");

    expect(await screen.findByRole("heading", { name: "Checklist", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/Nothing to do here/)).toBeInTheDocument();
  });

  it("given the budget route, when it is visited, then the budget is shown inside the shell", async () => {
    renderAt("/budget");

    expect(await screen.findByRole("heading", { name: "Budget", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/No costs yet/)).toBeInTheDocument();
  });

  it("given a screen that is not built yet, when it is visited, then it says it is coming", async () => {
    renderAt("/calendar");

    expect(await screen.findByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByText(/lands in a later slice/)).toBeInTheDocument();
  });

  it("given an unknown route, when it is visited, then the app falls back to the guest list", async () => {
    renderAt("/nowhere");

    expect(await screen.findByRole("heading", { name: "Guest List" })).toBeInTheDocument();
  });
});
