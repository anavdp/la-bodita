import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as categoriesApi from "../../api/categories";
import * as itemsApi from "../../api/items";
import * as tasksApi from "../../api/tasks";
import { aCategory, anItem, aTask } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { ItemsPage } from "./ItemsPage";

vi.mock("../../api/categories");
vi.mock("../../api/items");
vi.mock("../../api/tasks");

const church = aCategory({ name: "Church", emoji: "⛪" });
const photographer = aCategory({ name: "Photographer", emoji: "📸", color: "#f39237" });

const iglesia = anItem({
  name: "Iglesia San José",
  categoryId: church.id,
  status: "booked",
  contactName: "Padre Luis",
  phone: "+58 212 555 0142",
  instagramUrl: "https://instagram.com/parroquiasanjose",
  notes: "Ask if the choir is included.",
  taskCount: 2,
  doneTaskCount: 1,
  nextTask: { id: 900, title: "Meeting with Padre Luis", dueDate: "2026-10-24", dueTime: "10:00:00" },
});
const luz = anItem({ name: "Luz de Agua Fotografía", categoryId: photographer.id, status: "meeting_set" });

const certificates = aTask({ title: "Bring baptism certificates", itemId: iglesia.id, dueDate: "2026-10-24" });
const reserved = aTask({ title: "Reserve the date", itemId: iglesia.id, isDone: true });
const moodboard = aTask({ title: "Send Pinterest board", itemId: luz.id });

describe("ItemsPage", () => {
  beforeEach(() => {
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([church, photographer]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([iglesia, luz]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([certificates, reserved, moodboard]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("given items, when the page loads, then each row shows its contact, open tasks, next date and status", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });

    const row = await screen.findByRole("button", { name: /Iglesia San José/ });
    expect(row).toHaveTextContent("Padre Luis · 1 open");
    expect(row).toHaveTextContent("Sat, Oct 24");
    expect(row.querySelector('img[src="/icons/title-calendar.png"]')).not.toBeNull();
    expect(row).toHaveTextContent("Booked");
    expect(screen.getByRole("button", { name: /Luz de Agua Fotografía/ })).toHaveTextContent("Meeting set");
    expect(itemsApi.listItems).toHaveBeenCalledWith(1);
  });

  it("given a category drawn with an icon, when the page loads, then its chip and its items show that icon", async () => {
    const venue = aCategory({ name: "Venue", emoji: "venue" });
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([venue]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([anItem({ name: "Hacienda La Vega", categoryId: venue.id })]);
    renderWithProviders(<ItemsPage />, { route: "/items" });

    const row = await screen.findByRole("button", { name: /Hacienda La Vega/ });
    expect(row.querySelector("img")).toHaveAttribute("src", "/icons/venue.png");
    const chip = within(screen.getByRole("group", { name: "Filter by category" })).getByRole("button", { name: "Venue 1" });
    expect(chip.querySelector("img")).toHaveAttribute("src", "/icons/venue.png");
  });

  it("given categories, when one is picked, then only its items are listed", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    const chips = screen.getByRole("group", { name: "Filter by category" });
    expect(within(chips).getByRole("button", { name: "All 2" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(chips).getByRole("button", { name: "📸 Photographer 1" }));

    expect(screen.queryByRole("button", { name: /Iglesia San José/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Luz de Agua Fotografía/ })).toBeInTheDocument();
  });

  it("given the first item, when the page loads, then its details, tasks and notes are shown", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });

    const detail = await screen.findByRole("region", { name: "Iglesia San José" });
    expect(within(detail).getByText("⛪ Church")).toBeInTheDocument();
    expect(within(detail).getByText("+58 212 555 0142")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /parroquiasanjose/ })).toHaveAttribute(
      "href",
      "https://instagram.com/parroquiasanjose",
    );
    expect(within(detail).getByText("Sat, Oct 24, 10:00 · Meeting with Padre Luis")).toBeInTheDocument();
    expect(within(detail).getByRole("checkbox", { name: "Bring baptism certificates" })).not.toBeChecked();
    expect(within(detail).getByRole("checkbox", { name: "Reserve the date" })).toBeChecked();
    expect(within(detail).queryByText("Send Pinterest board")).not.toBeInTheDocument();
    expect(within(detail).getByText("Ask if the choir is included.")).toBeInTheDocument();
  });

  it("given another item, when it is clicked, then the panel shows it instead", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });

    await userEvent.click(await screen.findByRole("button", { name: /Luz de Agua Fotografía/ }));

    const detail = screen.getByRole("region", { name: "Luz de Agua Fotografía" });
    expect(within(detail).getByRole("checkbox", { name: "Send Pinterest board" })).toBeInTheDocument();
  });

  it("given a phone, when an item is tapped, then its panel below the list is scrolled into view", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    renderWithProviders(<ItemsPage />, { route: "/items" });

    await userEvent.click(await screen.findByRole("button", { name: /Luz de Agua Fotografía/ }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toContainElement(
      screen.getByRole("heading", { name: "Luz de Agua Fotografía" }),
    );
  });

  it("given a laptop, when an item is clicked, then the page stays put since its panel is beside the list", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) => ({ matches: query.includes("min-width"), addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
    );
    renderWithProviders(<ItemsPage />, { route: "/items" });

    await userEvent.click(await screen.findByRole("button", { name: /Luz de Agua Fotografía/ }));

    expect(screen.getByRole("region", { name: "Luz de Agua Fotografía" })).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("given an open task, when it is ticked, then it is saved as done", async () => {
    vi.mocked(tasksApi.updateTask).mockResolvedValue({ ...certificates, isDone: true });
    renderWithProviders(<ItemsPage />, { route: "/items" });
    const checkbox = await screen.findByRole("checkbox", { name: "Bring baptism certificates" });
    vi.mocked(tasksApi.listTasks).mockResolvedValue([{ ...certificates, isDone: true }, reserved, moodboard]);

    await userEvent.click(checkbox);

    expect(tasksApi.updateTask).toHaveBeenCalledWith(1, certificates.id, { isDone: true });
    expect(screen.getByRole("checkbox", { name: "Bring baptism certificates" })).toBeChecked();
  });

  it("given a task that fails to save, when it is ticked, then it goes back and says so", async () => {
    vi.mocked(tasksApi.updateTask).mockRejectedValue(new Error("offline"));
    renderWithProviders(<ItemsPage />, { route: "/items" });

    await userEvent.click(await screen.findByRole("checkbox", { name: "Bring baptism certificates" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that.");
    expect(screen.getByRole("checkbox", { name: "Bring baptism certificates" })).not.toBeChecked();
  });

  it("given an appointment, when it is added on the item, then it is created with its date and time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 22, 9, 0));
    vi.mocked(tasksApi.createTask).mockResolvedValue(aTask());
    renderWithProviders(<ItemsPage />, { route: "/items" });
    const detail = await screen.findByRole("region", { name: "Iglesia San José" });

    await userEvent.click(within(detail).getByRole("button", { name: "+ Add task" }));
    const drawer = screen.getByRole("dialog", { name: "New task" });
    await userEvent.type(within(drawer).getByLabelText("Task"), "Meet the choir");
    expect(within(drawer).getByLabelText("Time")).toBeDisabled();
    await userEvent.click(within(drawer).getByRole("button", { name: "Date" }));
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: "Monday, November 2, 2026" }));
    await userEvent.type(within(drawer).getByLabelText("Time"), "18:30");
    await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(tasksApi.createTask).toHaveBeenCalledWith(1, {
        title: "Meet the choir",
        itemId: iglesia.id,
        dueDate: "2026-11-02",
        dueTime: "18:30",
      }),
    );
    vi.useRealTimers();
  });

  it("given a task with no title, when it is added, then nothing is sent", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });
    const detail = await screen.findByRole("region", { name: "Iglesia San José" });

    await userEvent.click(within(detail).getByRole("button", { name: "+ Add task" }));
    const drawer = screen.getByRole("dialog", { name: "New task" });
    await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

    expect(within(drawer).getByRole("alert")).toHaveTextContent("Give it a name.");
    expect(tasksApi.createTask).not.toHaveBeenCalled();
  });

  it("given a task, when it is deleted, then it is removed", async () => {
    vi.mocked(tasksApi.deleteTask).mockResolvedValue();
    renderWithProviders(<ItemsPage />, { route: "/items" });

    await userEvent.click(await screen.findByRole("button", { name: "Delete “Reserve the date”" }));

    expect(tasksApi.deleteTask).toHaveBeenCalledWith(1, reserved.id);
  });

  it("given the status picker, when a new status is chosen, then only the status is saved", async () => {
    vi.mocked(itemsApi.updateItem).mockResolvedValue({ ...luz, status: "booked" });
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await userEvent.click(await screen.findByRole("button", { name: /Luz de Agua Fotografía/ }));

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(screen.getByRole("option", { name: "Booked" }));

    expect(itemsApi.updateItem).toHaveBeenCalledWith(1, luz.id, { status: "booked" });
  });

  it("given a new item, when the panel opens, then it asks for one contact, a phone unless another type was picked before", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    await userEvent.click(screen.getByRole("button", { name: "+ Add Item" }));
    const panel = screen.getByRole("dialog", { name: "New item" });

    expect(within(panel).getByRole("combobox", { name: "Contact type" })).toHaveTextContent("Phone");
    expect(within(panel).getByLabelText("Phone")).toBeInTheDocument();
    expect(within(panel).getByRole("combobox", { name: "Category" })).toHaveTextContent("No category");

    await userEvent.click(within(panel).getByRole("combobox", { name: "Contact type" }));
    await userEvent.click(within(panel).getByRole("option", { name: "Email" }));
    expect(within(panel).getByLabelText("Email")).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "+ Add Item" }));
    expect(screen.getByRole("combobox", { name: "Contact type" })).toHaveTextContent("Email");
  });

  it("given one contact, when another is added and removed, then each new one takes a type not used yet", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });
    await userEvent.click(screen.getByRole("button", { name: "+ Add Item" }));
    const panel = screen.getByRole("dialog", { name: "New item" });

    await userEvent.click(within(panel).getByRole("button", { name: "+ Add contact" }));
    await userEvent.click(within(panel).getByRole("button", { name: "+ Add contact" }));
    await userEvent.click(within(panel).getByRole("button", { name: "+ Add contact" }));

    expect(within(panel).getAllByRole("combobox", { name: "Contact type" }).map((field) => field.textContent)).toEqual([
      "Phone",
      "Instagram",
      "Email",
      "Website",
    ]);
    expect(within(panel).queryByRole("button", { name: "+ Add contact" })).not.toBeInTheDocument();
    await userEvent.click(within(panel).getByRole("button", { name: "Remove Instagram" }));
    expect(within(panel).queryByLabelText("Instagram")).not.toBeInTheDocument();
  });

  it("given a new vendor, when it is added, then it is created with its category and Instagram", async () => {
    vi.mocked(itemsApi.createItem).mockResolvedValue(anItem());
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    await userEvent.click(screen.getByRole("button", { name: "+ Add Item" }));
    const dialog = screen.getByRole("dialog", { name: "New item" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "Dulce Rosa Pastelería");
    await userEvent.click(within(dialog).getByRole("combobox", { name: "Category" }));
    await userEvent.type(within(dialog).getByRole("searchbox"), "photo");
    await userEvent.click(within(dialog).getByRole("option", { name: "📸 Photographer" }));
    await userEvent.click(within(dialog).getByRole("combobox", { name: "Contact type" }));
    await userEvent.click(within(dialog).getByRole("option", { name: "Instagram" }));
    await userEvent.type(within(dialog).getByLabelText("Instagram"), "https://instagram.com/dulcerosa");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(itemsApi.createItem).toHaveBeenCalledWith(1, {
        name: "Dulce Rosa Pastelería",
        categoryId: photographer.id,
        subcategoryId: null,
        status: "idea",
        contactName: null,
        phone: null,
        email: null,
        instagramUrl: "https://instagram.com/dulcerosa",
        websiteUrl: null,
        notes: null,
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("given an item with no name, when it is saved, then the dialog asks for one", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    await userEvent.click(screen.getByRole("button", { name: "+ Add Item" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Give it a name.");
    expect(itemsApi.createItem).not.toHaveBeenCalled();
  });

  it("given the API refuses, when an item is saved, then the dialog stays open and says so", async () => {
    vi.mocked(itemsApi.createItem).mockRejectedValue(new Error("offline"));
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    await userEvent.click(screen.getByRole("button", { name: "+ Add Item" }));
    await userEvent.type(screen.getByLabelText("Name"), "Deco Bonita");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("given an item, when it is edited, then the dialog opens filled in and saves the changes", async () => {
    vi.mocked(itemsApi.updateItem).mockResolvedValue(iglesia);
    renderWithProviders(<ItemsPage />, { route: "/items" });
    const detail = await screen.findByRole("region", { name: "Iglesia San José" });

    await userEvent.click(within(detail).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit item" });
    expect(within(dialog).getByLabelText("Contact")).toHaveValue("Padre Luis");
    expect(within(dialog).getByRole("combobox", { name: "Category" })).toHaveTextContent("⛪ Church");
    expect(within(dialog).getByLabelText("Instagram")).toHaveValue("https://instagram.com/parroquiasanjose");
    expect(within(dialog).queryByLabelText("Email")).not.toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText("Notes"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(itemsApi.updateItem).toHaveBeenCalledWith(
        1,
        iglesia.id,
        expect.objectContaining({ name: "Iglesia San José", contactName: "Padre Luis", notes: null }),
      ),
    );
  });

  it("given an item, when its deletion is confirmed, then it is deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(itemsApi.deleteItem).mockResolvedValue();
    renderWithProviders(<ItemsPage />, { route: "/items" });
    const detail = await screen.findByRole("region", { name: "Iglesia San José" });

    await userEvent.click(within(detail).getByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete “Iglesia San José” and its tasks?");
    expect(itemsApi.deleteItem).toHaveBeenCalledWith(1, iglesia.id);
  });

  it("given an item, when its deletion is cancelled, then nothing is deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithProviders(<ItemsPage />, { route: "/items" });
    const detail = await screen.findByRole("region", { name: "Iglesia San José" });

    await userEvent.click(within(detail).getByRole("button", { name: "Delete" }));

    expect(itemsApi.deleteItem).not.toHaveBeenCalled();
  });

  it("given a new category, when it is added, then it is created", async () => {
    vi.mocked(categoriesApi.createCategory).mockResolvedValue(aCategory({ name: "Cake", emoji: "cake" }));
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    await userEvent.click(screen.getByRole("button", { name: "+ Category" }));
    const dialog = screen.getByRole("dialog", { name: "New category" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "Cake");
    await userEvent.click(within(dialog).getByRole("button", { name: "Icon" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Cake" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(categoriesApi.createCategory).toHaveBeenCalledWith(1, {
        name: "Cake",
        emoji: "cake",
        color: expect.stringMatching(/^#[0-9a-f]{6}$/),
      }),
    );
  });

  it("given a category with no name, when it is saved, then the dialog asks for one", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items" });
    await screen.findByRole("button", { name: /Iglesia San José/ });

    await userEvent.click(screen.getByRole("button", { name: "+ Category" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Give it a name.");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("given a search term, when the list shows, then only matching items are listed", async () => {
    renderWithProviders(<ItemsPage />, { route: "/items", searchTerm: "luz de" });

    expect(await screen.findByRole("button", { name: /Luz de Agua Fotografía/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Iglesia San José/ })).not.toBeInTheDocument();
  });

  it("given no items yet, when the page loads, then it says what to add", async () => {
    vi.mocked(itemsApi.listItems).mockResolvedValue([]);
    renderWithProviders(<ItemsPage />, { route: "/items" });

    expect(await screen.findByText(/No items yet/)).toBeInTheDocument();
  });

  it("given the API is down, when the page loads, then it offers to try again", async () => {
    vi.mocked(itemsApi.listItems).mockRejectedValueOnce(new Error("offline"));
    renderWithProviders(<ItemsPage />, { route: "/items" });

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("button", { name: /Iglesia San José/ })).toBeInTheDocument();
  });
});
