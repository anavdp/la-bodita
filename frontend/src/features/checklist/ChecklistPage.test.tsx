import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as categoriesApi from "../../api/categories";
import * as itemsApi from "../../api/items";
import * as tasksApi from "../../api/tasks";
import { aCategory, anItem, aTask } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { ChecklistPage } from "./ChecklistPage";

vi.mock("../../api/categories");
vi.mock("../../api/items");
vi.mock("../../api/tasks");

const church = aCategory({ name: "Church", emoji: "⛪" });
const cake = aCategory({ name: "Cake", emoji: "🎂" });
const iglesia = anItem({ name: "Iglesia San José", categoryId: church.id });
const dulceRosa = anItem({ name: "Dulce Rosa Pastelería", categoryId: cake.id });

const ofItem = (item: typeof iglesia) => ({ itemId: item.id, itemName: item.name, categoryId: item.categoryId });

const lateCall = aTask({ title: "Call the parish office", dueDate: "2026-10-19", ...ofItem(iglesia) });
const certificates = aTask({ title: "Bring baptism certificates", dueDate: "2026-10-24", ...ofItem(iglesia) });
const flavors = aTask({ title: "Pick 3 flavors", dueDate: "2026-10-30", dueTime: "16:00:00", ...ofItem(dulceRosa) });
const readings = aTask({ title: "Confirm readings", ...ofItem(iglesia) });
const rings = aTask({ title: "Buy the rings" });
const reserved = aTask({ title: "Reserve the date", isDone: true, ...ofItem(iglesia) });

describe("ChecklistPage", () => {
  beforeEach(() => {
    // A Wednesday: this week runs to Sunday 25 October.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0));
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([cake, church]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([dulceRosa, iglesia]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([lateCall, certificates, flavors, readings, rings, reserved]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const section = (name: string) => screen.getByRole("region", { name });

  it("given open tasks, when the page loads, then they are grouped by when they are due", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });

    await screen.findByText("Bring baptism certificates");
    expect(within(section("Overdue")).getByText("Call the parish office")).toBeInTheDocument();
    expect(within(section("This week")).getByText("Bring baptism certificates")).toBeInTheDocument();
    expect(within(section("Later")).getByText("Pick 3 flavors")).toBeInTheDocument();
    expect(within(section("No date")).getByText("Confirm readings")).toBeInTheDocument();
    expect(screen.queryByText("Reserve the date")).not.toBeInTheDocument();
  });

  it("given a task of an item, when it is listed, then it shows the item and its due date", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });

    const row = (await screen.findByText("Pick 3 flavors")).closest("li") as HTMLElement;
    expect(row).toHaveTextContent("🎂 Dulce Rosa Pastelería");
    expect(row).toHaveTextContent("Fri, Oct 30 · 16:00");
  });

  it("given the done chip, when it is picked, then only done tasks are listed", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });
    await screen.findByText("Bring baptism certificates");

    const show = screen.getByRole("group", { name: "Show tasks" });
    expect(within(show).getByRole("button", { name: "To do 5" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(show).getByRole("button", { name: "Done 1" }));

    expect(screen.getByRole("checkbox", { name: "Reserve the date" })).toBeChecked();
    expect(screen.queryByText("Bring baptism certificates")).not.toBeInTheDocument();
  });

  it("given a category chip, when it is picked, then only that category's tasks are listed", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });
    await screen.findByText("Bring baptism certificates");

    await userEvent.click(
      within(screen.getByRole("group", { name: "Filter by category" })).getByRole("button", { name: "🎂 Cake" }),
    );

    expect(screen.getByText("Pick 3 flavors")).toBeInTheDocument();
    expect(screen.queryByText("Bring baptism certificates")).not.toBeInTheDocument();
    expect(screen.queryByText("Buy the rings")).not.toBeInTheDocument();
  });

  it("given an open task, when it is ticked, then it is saved and leaves the to-do list", async () => {
    vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...certificates, isDone: true });
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });
    const checkbox = await screen.findByRole("checkbox", { name: "Bring baptism certificates" });
    vi.mocked(tasksApi.listTasks).mockResolvedValue([
      lateCall,
      { ...certificates, isDone: true },
      flavors,
      readings,
      rings,
      reserved,
    ]);

    await userEvent.click(checkbox);

    expect(tasksApi.updateTask).toHaveBeenCalledWith(1, certificates.id, { isDone: true });
    expect(screen.queryByText("Bring baptism certificates")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done 2" })).toBeInTheDocument();
  });

  it("given a new task, when it is added for an item, then it is created for that item", async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue(aTask());
    renderWithProviders(<ChecklistPage />, { route: "/checklist?add=task" });
    await screen.findByText("Bring baptism certificates");

    await userEvent.type(screen.getByLabelText("Task"), "Book the tasting");
    await userEvent.click(screen.getByRole("combobox", { name: "Item" }));
    await userEvent.type(screen.getByRole("searchbox"), "dulce");
    await userEvent.click(screen.getByRole("option", { name: "Dulce Rosa Pastelería" }));
    await userEvent.click(screen.getByRole("button", { name: "Date" }));
    await userEvent.click(screen.getByRole("button", { name: "Wednesday, October 28, 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(tasksApi.createTask).toHaveBeenCalledWith(1, {
        title: "Book the tasting",
        itemId: dulceRosa.id,
        dueDate: "2026-10-28",
        dueTime: null,
      }),
    );
  });

  it("given a task the API refuses, when it is added, then the form says so", async () => {
    vi.mocked(tasksApi.createTask).mockRejectedValue(new Error("offline"));
    renderWithProviders(<ChecklistPage />, { route: "/checklist?add=task" });
    await screen.findByText("Bring baptism certificates");

    await userEvent.type(screen.getByLabelText("Task"), "Buy the veil");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that.");
    expect(screen.getByLabelText("Task")).toHaveValue("Buy the veil");
  });

  it("given the new task form, when it is cancelled, then it closes", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist?add=task" });
    await screen.findByText("Bring baptism certificates");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Task")).not.toBeInTheDocument();
  });

  it("given the checklist, when its own Add Task is pressed, then the new task form opens", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });
    await screen.findByText("Bring baptism certificates");
    expect(screen.queryByLabelText("Task")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+ Add Task" }));

    expect(screen.getByLabelText("Task")).toBeInTheDocument();
    expect(screen.getByText("Every task from every item, by due date")).toBeInTheDocument();
  });

  it("given a search term, when the list shows, then only matching tasks are listed", async () => {
    renderWithProviders(<ChecklistPage />, { route: "/checklist", searchTerm: "rings" });

    expect(await screen.findByText("Buy the rings")).toBeInTheDocument();
    expect(screen.queryByText("Bring baptism certificates")).not.toBeInTheDocument();
  });

  it("given nothing to do, when the page loads, then it says so", async () => {
    vi.mocked(tasksApi.listTasks).mockResolvedValue([]);
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });

    expect(await screen.findByText(/Nothing to do here/)).toBeInTheDocument();
  });

  it("given the API is down, when the page loads, then it offers to try again", async () => {
    vi.mocked(tasksApi.listTasks).mockRejectedValueOnce(new Error("offline"));
    renderWithProviders(<ChecklistPage />, { route: "/checklist" });

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Bring baptism certificates")).toBeInTheDocument();
  });
});
