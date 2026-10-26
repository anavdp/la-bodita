import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as budgetApi from "../../api/budget";
import * as calendarApi from "../../api/calendar";
import * as categoriesApi from "../../api/categories";
import * as documentsApi from "../../api/documents";
import * as guestsApi from "../../api/guests";
import * as itemsApi from "../../api/items";
import * as tasksApi from "../../api/tasks";
import { aGuest } from "../../testing/guestFactory";
import {
  aBudgetLine,
  aCalendarEvent,
  aCategory,
  aDocument,
  aPaperRequest,
  aPerson,
  aTask,
  anItem,
} from "../../testing/planningFactory";
import { aWedding, renderWithProviders } from "../../testing/renderWithProviders";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../api/budget");
vi.mock("../../api/calendar");
vi.mock("../../api/categories");
vi.mock("../../api/documents");
vi.mock("../../api/guests");
vi.mock("../../api/items");
vi.mock("../../api/tasks");

const vicky = aPerson({ displayName: "Vicky" });
const gerardo = aPerson({ displayName: "Gerardo" });
const cake = aCategory({ name: "Cake", emoji: "cake", color: "#e86a92" });
const church = anItem({ name: "Iglesia San José", status: "booked" });

const lateTask = aTask({
  title: "Pay the choir deposit",
  dueDate: "2026-10-22",
  itemName: "Iglesia San José",
});
const tasting = aTask({
  title: "Cake tasting",
  dueDate: "2026-10-31",
  dueTime: "11:00:00",
  itemName: "Dulce Rosa",
  categoryId: cake.id,
});
const doneTask = aTask({
  title: "Church visit",
  dueDate: "2026-10-10",
  isDone: true,
});
const videoCall = aCalendarEvent({
  title: "Video call",
  startDate: "2026-10-27",
  startTime: "19:00:00",
});

const passport = aDocument({
  title: "Vicky's passport",
  expiresOn: "2026-12-15",
  personId: vicky.id,
});
const baptism = aPaperRequest({
  name: "Baptism certificate",
  itemId: church.id,
  itemName: "Iglesia San José",
});

const card = (name: string) => screen.getByRole("region", { name });

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 25, 9, 0));
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([cake]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([church]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([lateTask, tasting, doneTask]);
    vi.mocked(calendarApi.listCalendarEvents).mockResolvedValue([videoCall]);
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue([
      aBudgetLine({ status: "paid", estimatedAmount: 300 }),
      aBudgetLine({ status: "confirmed", estimatedAmount: 1200 }),
      aBudgetLine({ status: "considering", estimatedAmount: 500 }),
      aBudgetLine({ status: "idea", estimatedAmount: 9000 }),
    ]);
    vi.mocked(guestsApi.listGuests).mockResolvedValue([
      aGuest({ rsvpStatus: "confirmed" }),
      aGuest({ rsvpStatus: "confirmed" }),
      aGuest({ rsvpStatus: "pending" }),
      aGuest({ rsvpStatus: "declined" }),
    ]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([baptism]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([passport]);
    vi.mocked(documentsApi.listPeople).mockResolvedValue([vicky, gerardo]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("given a wedding date ahead, when the page opens, then its tagline counts down to it", async () => {
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("4 days to go · Thursday, October 29")).toBeInTheDocument();
  });

  it("given the wedding is tomorrow, when the page opens, then the tagline says so", async () => {
    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      wedding: { wedding: { ...aWedding, wedding_date: "2026-10-26" } },
    });

    expect(await screen.findByText("Tomorrow is the day! · Monday, October 26")).toBeInTheDocument();
  });

  it("given the wedding day has come, when the page opens, then the tagline celebrates it", async () => {
    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      wedding: { wedding: { ...aWedding, wedding_date: "2026-10-25" } },
    });

    expect(await screen.findByText("Today is the day!")).toBeInTheDocument();
  });

  it("given no wedding date yet, when the page opens, then the tagline points at Settings", async () => {
    renderWithProviders(<DashboardPage />, {
      route: "/dashboard",
      wedding: { wedding: { ...aWedding, wedding_date: null } },
    });

    expect(await screen.findByText("Pick your wedding date in Settings")).toBeInTheDocument();
  });

  it("given guests in every state, when the page loads, then the Guest List card charts their RSVPs", async () => {
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    await screen.findByText("3 days late");
    const guests = card("Guest List");
    expect(within(guests).getByRole("img", { name: "2 said yes, 1 still waiting, 1 can't come" })).toBeInTheDocument();
    expect(within(guests).getByText("said yes").closest("li")).toHaveTextContent("2said yes");
    expect(within(guests).getByRole("link", { name: "Guest List" })).toHaveAttribute("href", "/guests");
    expect(guests.querySelector("img[src='/icons/title-cheers.png']")).not.toBeNull();
  });

  it("given booked and paid lines, when the page loads, then the Budget card charts them per category", async () => {
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue([
      aBudgetLine({ status: "paid", estimatedAmount: 300, categoryId: cake.id }),
      aBudgetLine({ status: "confirmed", estimatedAmount: 1200 }),
      aBudgetLine({ status: "considering", estimatedAmount: 500 }),
      aBudgetLine({ status: "paid", currency: "EUR", estimatedAmount: 600 }),
    ]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    await screen.findByText("3 days late");
    const budget = card("Budget");
    expect(budget).toHaveTextContent("$1,500 booked & paid");
    expect(within(budget).getByTitle("No category: $1,200")).toBeInTheDocument();
    expect(within(budget).getByTitle("Cake: $300")).toBeInTheDocument();
    expect(within(budget).getByText("Also €600")).toBeInTheDocument();
    expect(within(budget).getByText("of $2,000 + €600 planned")).toBeInTheDocument();
  });

  it("given more categories than bars, when the Budget card charts them, then the smallest share one bar", async () => {
    const categories = ["Cake", "Church", "Dress", "Decor", "Photos"].map((name) => aCategory({ name }));
    vi.mocked(categoriesApi.listCategories).mockResolvedValue(categories);
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue(
      categories.map((category, index) =>
        aBudgetLine({ status: "paid", estimatedAmount: 500 - index * 100, categoryId: category.id }),
      ),
    );

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(
      await within(await screen.findByRole("region", { name: "Budget" })).findByTitle("Everything else: $100"),
    ).toBeInTheDocument();
  });

  it("given tasks done, late and ahead, when the page loads, then the Checklist card charts them and names the next", async () => {
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    await screen.findByText("3 days late");
    const checklist = card("Checklist");
    expect(within(checklist).getByRole("img", { name: "1 of 3 tasks done" })).toBeInTheDocument();
    expect(within(checklist).getByText("2 to do")).toBeInTheDocument();
    expect(within(checklist).getByText("1 late")).toBeInTheDocument();
    expect(within(checklist).getByText("Next: Cake tasting · Sat, Oct 31")).toBeInTheDocument();
  });

  it("given papers asked for, when the page loads, then the Documents card charts them and names the next to get", async () => {
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    await screen.findByText("3 days late");
    const papers = card("Documents");
    expect(within(papers).getByRole("img", { name: "0 of 2 papers in hand" })).toBeInTheDocument();
    expect(within(papers).getByText("2 still to get")).toBeInTheDocument();
    expect(within(papers).getByText("1 running out")).toBeInTheDocument();
    expect(within(papers).getByText("Next to get: Baptism certificate · Iglesia San José")).toBeInTheDocument();
  });

  it("given every task on time, when the Checklist card is read, then it says so", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue([tasting]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(
      await within(await screen.findByRole("region", { name: "Checklist" })).findByText("All on time"),
    ).toBeInTheDocument();
  });

  it("given no guests, nothing booked and no papers asked for, when the page loads, then each card says so", async () => {
    vi.mocked(guestsApi.listGuests).mockResolvedValue([]);
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue([]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(await screen.findByText("No guests yet.")).toBeInTheDocument();
    expect(screen.getByText("Nothing booked or paid yet.")).toBeInTheDocument();
    expect(screen.getByText("No office has asked for a paper yet.")).toBeInTheDocument();
  });

  it("given a late task in a category with a drawing, when it needs us, then its row wears the category", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue([
      aTask({ title: "Pay the cake deposit", dueDate: "2026-10-20", categoryId: cake.id }),
    ]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    const row = (await screen.findByText("Pay the cake deposit")).closest("a") as HTMLElement;
    expect(row.querySelector("img[src='/icons/cake.png']")).not.toBeNull();
    expect((row.querySelector("span[style]") as HTMLElement).style.backgroundColor).toContain("color-mix");
  });

  it("given a late task, a paper running out and an item waiting on papers, when the page loads, then each needs us", async () => {
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    await screen.findByText("3 days late");
    const rows = within(card("Needs you")).getAllByRole("link");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("3 days late"),
      expect.stringContaining("Runs out Dec 15, 2026"),
      expect.stringContaining("Waiting on Baptism certificate"),
    ]);
    expect(rows[0]).toHaveTextContent("Pay the choir deposit · Iglesia San José");
    expect(rows[0]).toHaveAttribute("href", "/checklist");
    expect(rows[1]).toHaveTextContent("Vicky's passport");
    expect(rows[1]).toHaveAttribute("href", "/documents");
    expect(rows[2]).toHaveTextContent("Iglesia San José");
    expect(rows[2]).toHaveAttribute("href", `/items?item=${church.id}`);
  });

  it("given an item waiting on many papers, when it needs us, then only the first few are named", async () => {
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue(
      ["Baptism", "Confirmation", "Course", "Banns", "Birth"].map((name) =>
        aPaperRequest({ name, itemId: church.id, itemName: church.name }),
      ),
    );

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(
      await within(await screen.findByRole("region", { name: "Needs you" })).findByText(
        "Waiting on Baptism, Confirmation, Course and 2 more",
      ),
    ).toBeInTheDocument();
  });

  it("given a task only a day late, when it needs us, then the lateness reads in the singular", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue([aTask({ title: "Send the table plan", dueDate: "2026-10-24" })]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(await screen.findByText("1 day late")).toBeInTheDocument();
  });

  it("given a paper already expired, when it needs us, then it says when it ran out", async () => {
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([aDocument({ title: "Old ID", expiresOn: "2026-09-01" })]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(await screen.findByText("Ran out Sep 1, 2026")).toBeInTheDocument();
  });

  it("given nothing late, running out or missing, when the page loads, then nothing needs us", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue([tasting]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(
      await within(await screen.findByRole("region", { name: "Needs you" })).findByText(
        "Nothing needs you right now. Enjoy it!",
      ),
    ).toBeInTheDocument();
  });

  it("given dated tasks and events ahead, when the page loads, then the soonest is next up and the rest come after", async () => {
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    await screen.findByText("3 days late");
    expect(within(card("Next up")).getByText("Video call")).toBeInTheDocument();
    expect(within(card("Next up")).getByText("Tue, Oct 27 · 19:00")).toBeInTheDocument();
    const comingUp = within(card("Next two weeks")).getAllByRole("link");
    expect(comingUp[0]).toHaveTextContent("Cake tasting · Dulce Rosa");
    expect(comingUp[0]).toHaveAttribute("href", "/checklist");
    expect(
      within(card("Next two weeks")).getByRole("link", {
        name: "See the calendar",
      }),
    ).toHaveAttribute("href", "/calendar");
  });

  it("given an event in the next two weeks, when it is listed, then it leads to the calendar", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue([aTask({ title: "Pinterest board", dueDate: "2026-10-25" })]);

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    const row = await within(await screen.findByRole("region", { name: "Next two weeks" })).findByText("Video call");
    expect(row.closest("a")).toHaveAttribute("href", "/calendar");
  });

  it("given the API fails, when the page loads, then it says so and can try again", async () => {
    vi.mocked(guestsApi.listGuests).mockRejectedValueOnce(new Error("offline"));

    renderWithProviders(<DashboardPage />, { route: "/dashboard" });

    expect(await screen.findByText("We could not load your plans.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("3 days late")).toBeInTheDocument();
  });
});
