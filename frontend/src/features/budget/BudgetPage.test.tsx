import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as budgetApi from "../../api/budget";
import { ApiError } from "../../api/client";
import * as categoriesApi from "../../api/categories";
import * as itemsApi from "../../api/items";
import type { BudgetLine } from "../../api/types";
import { aBudgetLine, aCategory, anItem } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { BudgetPage } from "./BudgetPage";

vi.mock("../../api/budget");
vi.mock("../../api/categories");
vi.mock("../../api/items");

const church = aCategory({ name: "Church", emoji: "church" });
const photo = aCategory({ name: "Photographer", emoji: "📸" });
const luz = anItem({ name: "Luz de Agua Fotografía", categoryId: photo.id });
const andres = anItem({ name: "Andrés Rivas Photo", categoryId: photo.id });
const parish = anItem({ name: "Iglesia San José", categoryId: church.id });

const ofItem = (item: typeof luz) => ({ itemId: item.id, itemName: item.name, categoryId: item.categoryId });

const fee = aBudgetLine({ title: "Parish fee", status: "paid", estimatedAmount: 300, ...ofItem(parish) });
const choir = aBudgetLine({ title: "Choir", status: "considering", estimatedAmount: 250, ...ofItem(parish) });
const video = aBudgetLine({
  title: "Photo + video",
  status: "considering",
  estimatedAmount: 1800,
  notes: "8 hours",
  ...ofItem(luz),
});
const photoOnly = aBudgetLine({ title: "Photo only", status: "idea", estimatedAmount: 1500, ...ofItem(andres) });
const caracola = aBudgetLine({ title: "Studio Caracola", status: "idea", estimatedAmount: null });
const dress = aBudgetLine({ title: "Church dress", status: "confirmed", estimatedAmount: 1200 });

const allLines = [fee, choir, video, photoOnly, caracola, dress];

/** Answers a PATCH with the line as changed, the way the API does. */
function patchEchoes() {
  vi.mocked(budgetApi.updateBudgetLine).mockImplementation(async (_wedding, lineId, changes) => {
    const line = allLines.find((each) => each.id === lineId) as BudgetLine;
    return { ...line, ...changes };
  });
}

const totals = () => screen.getByRole("group", { name: "Budget totals" });
const categoryCard = (name: string) => screen.getByRole("region", { name });
const rowOf = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

describe("BudgetPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([church, photo]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([andres, parish, luz]);
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue(allLines);
    patchEchoes();
  });

  it("given lines of several categories, when the page loads, then they are grouped under their category", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await screen.findByText("Parish fee");
    expect(within(categoryCard("Church")).getByText("Choir")).toBeInTheDocument();
    expect(categoryCard("Church").querySelector("img")).toHaveAttribute("src", "/icons/church.png");
    expect(within(categoryCard("📸 Photographer")).getByText("Photo only")).toBeInTheDocument();
    expect(within(categoryCard("No category")).getByText("Church dress")).toBeInTheDocument();
  });

  it("given a category, when it is open, then its header counts the lines on and adds them up", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await screen.findByText("Parish fee");
    const header = within(categoryCard("📸 Photographer")).getByRole("button", { expanded: true });
    expect(header).toHaveTextContent("1 of 2 on");
    expect(header).toHaveTextContent("$1,800");
  });

  it("given a line of an item, when it is listed, then it shows the item, its notes and its amount", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await screen.findByText("Photo + video");
    expect(rowOf("Photo + video")).toHaveTextContent("Luz de Agua Fotografía · 8 hours");
    expect(rowOf("Photo + video")).toHaveTextContent("$1,800");
  });

  it("given lines on, booked and paid, when the totals show, then off lines are left out", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await screen.findByText("Parish fee");
    expect(within(totals()).getByText("$3,550")).toBeInTheDocument();
    expect(within(totals()).getByText("Confirmed").parentElement).toHaveTextContent("$1,500");
    expect(within(totals()).getByText("Still deciding").parentElement).toHaveTextContent("$2,050");
  });

  it("given an alternative that is off, when it is switched on, then it is saved and joins the total", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await userEvent.click(await screen.findByRole("switch", { name: "Count Photo only in this plan" }));

    expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, photoOnly.id, { status: "considering" });
    expect(screen.getByRole("switch", { name: "Count Photo only in this plan" })).toBeChecked();
    expect(within(totals()).getByText("$5,050")).toBeInTheDocument();
  });

  it("given a switch the API refuses, when it is flipped, then it goes back and says so", async () => {
    vi.mocked(budgetApi.updateBudgetLine).mockRejectedValue(new Error("offline"));
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await userEvent.click(await screen.findByRole("switch", { name: "Count Choir in this plan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that.");
    expect(screen.getByRole("switch", { name: "Count Choir in this plan" })).toBeChecked();
  });

  it("given a line still waiting for its quote, when it is listed, then it cannot be switched on", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    const toggle = await screen.findByRole("switch", { name: "Count Studio Caracola in this plan" });
    expect(toggle).toBeDisabled();
    expect(rowOf("Studio Caracola")).toHaveTextContent("No quote");
  });

  it("given a line that is on, when it is confirmed as booked, then it locks on and the page says so", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Choir");

    await userEvent.click(within(rowOf("Choir")).getByRole("button", { name: "Confirm" }));
    await userEvent.click(within(rowOf("Choir")).getByRole("button", { name: "Booked" }));

    expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, choir.id, { status: "confirmed" });
    expect(await screen.findByText("Choir is booked. It stays in every plan now.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Count Choir in this plan" })).toBeDisabled();
    expect(within(totals()).getByText("Confirmed").parentElement).toHaveTextContent("$1,750");
  });

  it("given the confirm choice, when it is called off, then the line stays simply on", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Choir");

    await userEvent.click(within(rowOf("Choir")).getByRole("button", { name: "Confirm" }));
    await userEvent.click(within(rowOf("Choir")).getByRole("button", { name: "Not yet" }));

    expect(within(rowOf("Choir")).getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(budgetApi.updateBudgetLine).not.toHaveBeenCalled();
  });

  it("given a booked line, when it is marked paid or undone, then its status changes", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Church dress");
    expect(rowOf("Church dress")).toHaveTextContent("Booked");

    await userEvent.click(within(rowOf("Church dress")).getByRole("button", { name: "Mark paid" }));
    expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, dress.id, { status: "paid" });

    await userEvent.click(within(rowOf("Parish fee")).getByRole("button", { name: "Undo" }));
    expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, fee.id, { status: "considering" });
  });

  it("given lines on, when everything is switched off, then only booked and paid lines stay on", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Parish fee");

    await userEvent.click(screen.getByRole("button", { name: "Switch all off" }));

    await waitFor(() => expect(budgetApi.updateBudgetLine).toHaveBeenCalledTimes(2));
    expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, choir.id, { status: "idea" });
    expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, video.id, { status: "idea" });
    expect(await screen.findByText("Only booked and paid lines are left on.")).toBeInTheDocument();
    expect(within(totals()).getByText("$1,500", { selector: "[data-figure='total']" })).toBeInTheDocument();
  });

  it("given an open category, when it is folded, then its lines hide and the header names what is picked", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Parish fee");

    await userEvent.click(within(categoryCard("Church")).getByRole("button", { expanded: true }));

    const header = within(categoryCard("Church")).getByRole("button", { expanded: false });
    expect(header).toHaveTextContent("Parish fee, Choir");
    expect(header).toHaveTextContent("$550");
    expect(within(categoryCard("Church")).queryByRole("switch")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("la-bodita.budget.collapsed") ?? "[]")).toEqual([String(church.id)]);
  });

  it("given every category open, when Collapse all is pressed, then all fold and it offers to expand them", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Parish fee");

    await userEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.queryAllByRole("switch")).toEqual([]);
    expect(within(categoryCard("No category")).getByRole("button", { expanded: false })).toHaveTextContent(
      "Church dress",
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getAllByRole("switch")).toHaveLength(6);
  });

  it("given a category folded last visit, when the page loads, then it is still folded", async () => {
    localStorage.setItem("la-bodita.budget.collapsed", JSON.stringify([String(photo.id)]));
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await screen.findByText("Parish fee");
    expect(within(categoryCard("📸 Photographer")).getByRole("button", { expanded: false })).toHaveTextContent(
      "Photo + video",
    );
    expect(screen.queryByText("Photo only")).not.toBeInTheDocument();
  });

  it("given a new quote for an item, when it is added, then the item names it and the amount is saved", async () => {
    vi.mocked(budgetApi.createBudgetLine).mockResolvedValue(aBudgetLine());
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Parish fee");

    await userEvent.click(screen.getByRole("button", { name: "Add Cost" }));
    const drawer = screen.getByRole("dialog", { name: "New cost" });
    await userEvent.click(within(drawer).getByRole("combobox", { name: "Item" }));
    await userEvent.type(within(drawer).getByRole("searchbox"), "andr");
    await userEvent.click(within(drawer).getByRole("option", { name: "Andrés Rivas Photo" }));
    await userEvent.type(within(drawer).getByLabelText("Quote"), "1450,50");
    await userEvent.click(within(drawer).getByRole("combobox", { name: "Currency" }));
    await userEvent.click(within(drawer).getByRole("option", { name: "EUR (€)" }));
    await userEvent.type(within(drawer).getByLabelText("Notes"), "Photo only, 6 hours");
    await userEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(budgetApi.createBudgetLine).toHaveBeenCalledWith(1, {
        title: "Andrés Rivas Photo",
        itemId: andres.id,
        currency: "EUR",
        estimatedAmount: 1450.5,
        actualAmount: null,
        notes: "Photo only, 6 hours",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("given a new cost with neither a name nor an item, when it is saved, then the form asks for one", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Parish fee");

    await userEvent.click(screen.getByRole("button", { name: "Add Cost" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Give it a name, or pick an item.");
    expect(budgetApi.createBudgetLine).not.toHaveBeenCalled();
  });

  it("given an amount that is not a number, when it is saved, then the form says how to write it", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Parish fee");

    await userEvent.click(screen.getByRole("button", { name: "Add Cost" }));
    await userEvent.type(screen.getByLabelText("What is it"), "Flights");
    await userEvent.type(screen.getByLabelText("Quote"), "about 2000");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Write the amount as a number");
  });

  it("given a line that is on, when its amounts are both cleared, then the form refuses", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Choir");

    await userEvent.click(screen.getByRole("button", { name: "Edit Choir" }));
    await userEvent.clear(screen.getByLabelText("Quote"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("A line that counts needs an amount.");
  });

  it("given a line, when it is edited, then the drawer starts from it and saves the changes", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Photo + video");

    await userEvent.click(screen.getByRole("button", { name: "Edit Photo + video" }));
    const drawer = screen.getByRole("dialog", { name: "Edit cost" });
    expect(within(drawer).getByRole("combobox", { name: "Item" })).toHaveTextContent("Luz de Agua Fotografía");
    await userEvent.type(within(drawer).getByLabelText("Final price"), "1750");
    await userEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(budgetApi.updateBudgetLine).toHaveBeenCalledWith(1, video.id, {
        title: "Photo + video",
        itemId: luz.id,
        currency: "USD",
        estimatedAmount: 1800,
        actualAmount: 1750,
        notes: "8 hours",
      }),
    );
  });

  it("given a line, when its deletion is confirmed in the drawer, then it is deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(budgetApi.deleteBudgetLine).mockResolvedValue();
    renderWithProviders(<BudgetPage />, { route: "/budget" });
    await screen.findByText("Choir");

    await userEvent.click(screen.getByRole("button", { name: "Edit Choir" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete “Choir”?");
    await waitFor(() => expect(budgetApi.deleteBudgetLine).toHaveBeenCalledWith(1, choir.id));
  });

  it("given a search term, when the page shows, then only matching lines are listed", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget", searchTerm: "luz" });

    expect(await screen.findByText("Photo + video")).toBeInTheDocument();
    expect(screen.queryByText("Parish fee")).not.toBeInTheDocument();
    expect(within(totals()).getByText("$3,550")).toBeInTheDocument();
  });

  it("given no lines yet, when the page loads, then it says how to start", async () => {
    vi.mocked(budgetApi.listBudgetLines).mockResolvedValue([]);
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    expect(await screen.findByText(/No costs yet/)).toBeInTheDocument();
  });

  it("given the API is down, when the page loads, then it offers to try again", async () => {
    vi.mocked(budgetApi.listBudgetLines).mockRejectedValueOnce(new Error("offline"));
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Parish fee")).toBeInTheDocument();
  });

  it("given Spanish, when the page loads, then it speaks Spanish", async () => {
    renderWithProviders(<BudgetPage />, { route: "/budget", language: "es" });

    await screen.findByText("Parish fee");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Presupuesto");
    expect(screen.getByRole("button", { name: "Apagar todo" })).toBeInTheDocument();
  });

  it("given the items fail to load, when the page opens, then the costs still show and it says what failed", async () => {
    vi.mocked(itemsApi.listItems).mockRejectedValue(new ApiError("", 502));
    renderWithProviders(<BudgetPage />, { route: "/budget" });

    expect(await screen.findByText("Parish fee")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your items.");
    expect(screen.getByRole("alert")).toHaveTextContent("isn't answering");
  });
});
