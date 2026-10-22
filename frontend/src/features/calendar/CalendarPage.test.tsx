import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as calendarApi from "../../api/calendar";
import * as categoriesApi from "../../api/categories";
import * as itemsApi from "../../api/items";
import * as tasksApi from "../../api/tasks";
import { aCalendarEvent, aCategory, anItem, aTask } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { CalendarPage } from "./CalendarPage";

vi.mock("../../api/calendar");
vi.mock("../../api/categories");
vi.mock("../../api/items");
vi.mock("../../api/tasks");

const church = aCategory({ name: "Church", emoji: "church", color: "#7189ff" });
const cake = aCategory({ name: "Cake", emoji: "🎂", color: "#ef6f9c" });
const parish = anItem({ name: "Iglesia de Araure", categoryId: church.id });
const dulce = anItem({ name: "Dulce Rosa", categoryId: cake.id });

const certificates = aTask({
  title: "Baptism certificates",
  dueDate: "2026-10-23",
  itemId: parish.id,
  itemName: parish.name,
  categoryId: church.id,
});
const visit = aTask({ title: "Church visit", dueDate: "2026-10-10", isDone: true, categoryId: church.id });
const tasting = aTask({
  title: "Cake tasting",
  dueDate: "2026-10-31",
  dueTime: "11:00:00",
  itemId: dulce.id,
  itemName: dulce.name,
  categoryId: cake.id,
});
const undated = aTask({ title: "Pick a florist" });
const fair = aCalendarEvent({ title: "Bridal fair", startDate: "2026-10-27" });
const honeymoon = aCalendarEvent({ title: "Honeymoon", startDate: "2026-11-01", endDate: "2026-11-08" });

/** The month grid has finished loading once a known chip is on it. */
const loaded = () => screen.findByText("Cake tasting", { selector: "[data-month] *" });
const day = (label: string) => screen.getByRole("gridcell", { name: new RegExp(`^${label}`) });

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 22, 12));
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([church, cake]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([parish, dulce]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([certificates, visit, tasting, undated]);
    vi.mocked(calendarApi.listCalendarEvents).mockResolvedValue([fair, honeymoon]);
    vi.mocked(calendarApi.createCalendarEvent).mockResolvedValue(fair);
    vi.mocked(calendarApi.updateCalendarEvent).mockResolvedValue(fair);
    vi.mocked(calendarApi.deleteCalendarEvent).mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("given dated tasks and events, when the page loads, then this month shows them on their days", async () => {
    renderWithProviders(<CalendarPage />, { route: "/calendar" });

    expect(await screen.findByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(within(day("Saturday, October 31")).getByText("Cake tasting")).toBeInTheDocument();
    expect(within(day("Tuesday, October 27")).getByRole("button", { name: /Bridal fair/ })).toBeInTheDocument();
    expect(within(day("Saturday, October 10")).getByText("Church visit")).toHaveClass("line-through");
    expect(screen.queryByText("Pick a florist")).not.toBeInTheDocument();
  });

  it("given today, when the page loads, then today is marked and so is the wedding day", async () => {
    renderWithProviders(<CalendarPage />, { route: "/calendar" });

    await loaded();
    expect(day("Thursday, October 22")).toHaveAttribute("aria-current", "date");
    expect(within(day("Thursday, October 29")).getByText("Wedding day")).toBeInTheDocument();
  });

  it("given a trip that runs into next month, when the month is moved on, then it shows on each of its days", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { route: "/calendar" });
    await loaded();

    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(within(day("Wednesday, November 4")).getByRole("button", { name: /Honeymoon/ })).toBeInTheDocument();
    expect(within(day("Sunday, November 8")).getByRole("button", { name: /Honeymoon/ })).toBeInTheDocument();
    expect(screen.queryByText("Cake tasting", { selector: "[data-month] *" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
  });

  it("given open things ahead, when the page loads, then the soonest is next up and the next two weeks are listed", async () => {
    renderWithProviders(<CalendarPage />, { route: "/calendar" });

    const nextUp = await screen.findByRole("region", { name: "Next up" });
    expect(within(nextUp).getByText("Baptism certificates")).toBeInTheDocument();
    const soon = screen.getByRole("region", { name: "Next two weeks" });
    expect(within(soon).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Bridal fair"),
      expect.stringContaining("Cake tasting"),
      expect.stringContaining("Honeymoon"),
    ]);
  });

  it("given a category picked, when the calendar narrows, then only that category's things show", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { route: "/calendar" });
    await loaded();

    await user.click(screen.getByRole("button", { name: /Cake/ }));

    expect(within(day("Saturday, October 31")).getByText("Cake tasting")).toBeInTheDocument();
    expect(within(day("Friday, October 23")).queryByText("Baptism certificates")).not.toBeInTheDocument();
    expect(within(day("Tuesday, October 27")).queryByText("Bridal fair")).not.toBeInTheDocument();
  });

  it("given a search in the top bar, when the calendar narrows, then only matching things show", async () => {
    renderWithProviders(<CalendarPage />, { route: "/calendar", searchTerm: "fair" });

    await screen.findByRole("heading", { name: "October 2026" });
    await waitFor(() =>
      expect(within(day("Tuesday, October 27")).getByRole("button", { name: /Bridal fair/ })).toBeInTheDocument(),
    );
    expect(within(day("Saturday, October 31")).queryByText("Cake tasting")).not.toBeInTheDocument();
  });

  it("given an empty day, when its add button is used, then the drawer opens on that day and saves the event", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { route: "/calendar" });
    await loaded();

    await user.click(screen.getByRole("button", { name: "Add an event on Wednesday, October 28" }));
    const drawer = screen.getByRole("dialog", { name: "New event" });
    await user.type(within(drawer).getByLabelText("What is it"), "Dinner with the padrinos");
    await user.type(within(drawer).getByLabelText("Time"), "20:00");
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calendarApi.createCalendarEvent).toHaveBeenCalledWith(1, {
        title: "Dinner with the padrinos",
        startDate: "2026-10-28",
        endDate: null,
        startTime: "20:00",
        itemId: null,
        notes: null,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("given the header's add button, when an event is saved without a name, then the drawer asks for one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { route: "/calendar" });
    await loaded();

    await user.click(screen.getByRole("button", { name: "+ Add Event" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));

    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Give it a name.");
    expect(calendarApi.createCalendarEvent).not.toHaveBeenCalled();
  });

  it("given an event, when it is opened and changed, then the change is saved", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />, { route: "/calendar" });
    await loaded();

    await user.click(within(day("Tuesday, October 27")).getByRole("button", { name: /Bridal fair/ }));
    const drawer = screen.getByRole("dialog", { name: "Edit event" });
    const title = within(drawer).getByLabelText("What is it");
    await user.clear(title);
    await user.type(title, "Bridal fair in Valencia");
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calendarApi.updateCalendarEvent).toHaveBeenCalledWith(
        1,
        fair.id,
        expect.objectContaining({ title: "Bridal fair in Valencia", startDate: "2026-10-27" }),
      ),
    );
  });

  it("given an event, when its deletion is confirmed in the drawer, then it is deleted", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<CalendarPage />, { route: "/calendar" });
    await loaded();

    await user.click(within(day("Tuesday, October 27")).getByRole("button", { name: /Bridal fair/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete “Bridal fair”?");
    await waitFor(() => expect(calendarApi.deleteCalendarEvent).toHaveBeenCalledWith(1, fair.id));
  });

  it("given the plans cannot load, when the page opens, then it offers to try again", async () => {
    const user = userEvent.setup();
    vi.mocked(calendarApi.listCalendarEvents).mockRejectedValueOnce(new Error("offline"));
    renderWithProviders(<CalendarPage />, { route: "/calendar" });

    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Cake tasting", { selector: "[data-month] *" })).toBeInTheDocument();
  });
});
