import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as categoriesApi from "../../api/categories";
import * as itemsApi from "../../api/items";
import * as tasksApi from "../../api/tasks";
import { aCategory, anItem } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { CategoriesPage } from "./CategoriesPage";

vi.mock("../../api/categories");
vi.mock("../../api/items");
vi.mock("../../api/tasks");

const church = aCategory({
  name: "Church",
  emoji: "church",
  color: "#624cab",
  subcategories: [
    { id: 501, categoryId: 0, name: "Ceremony", emoji: null, color: "#624cab" },
    { id: 502, categoryId: 0, name: "Choir", emoji: null, color: "#624cab" },
  ],
});
const photographer = aCategory({ name: "Photographer", emoji: "📸", color: "#f39237" });

const rowOf = (name: string) => screen.getByRole("row", { name: new RegExp(name) });

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([church, photographer]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([
      anItem({ name: "Iglesia San José", categoryId: church.id }),
      anItem({ name: "Capilla del Ávila", categoryId: church.id }),
      anItem({ name: "Hacienda La Vega", categoryId: null }),
    ]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("given categories, when the page loads, then each row shows its icon, color, subcategories and item count", async () => {
    renderWithProviders(<CategoriesPage />, { route: "/categories" });

    const title = await screen.findByRole("heading", { name: "Categories", level: 1 });
    expect(title.closest("header")?.querySelector("img")).toHaveAttribute("src", "/icons/generic.png");
    const churchRow = await screen.findByRole("row", { name: /Church/ });
    expect(churchRow.querySelector("img")).toHaveAttribute("src", "/icons/church.png");
    expect(within(churchRow).getByTitle("#624cab")).toHaveStyle({ backgroundColor: "#624cab" });
    expect(churchRow).toHaveTextContent("Ceremony, Choir");
    expect(churchRow).toHaveTextContent("2 items");

    const photographerRow = rowOf("Photographer");
    expect(photographerRow).toHaveTextContent("📸");
    expect(photographerRow).toHaveTextContent("No items");
    expect(screen.getByText("Showing 2 of 2 categories")).toBeInTheDocument();
  });

  it("given no categories, when the page loads, then it invites adding the first one", async () => {
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([]);
    renderWithProviders(<CategoriesPage />, { route: "/categories" });

    expect(await screen.findByText(/No categories yet/)).toBeInTheDocument();
  });

  it("given a search term, when the page loads, then only categories with that name are listed", async () => {
    renderWithProviders(<CategoriesPage />, { route: "/categories", searchTerm: "photo" });

    expect(await screen.findByRole("row", { name: /Photographer/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Church/ })).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 categories")).toBeInTheDocument();
  });

  it("given a search nothing matches, when the page loads, then it says so", async () => {
    renderWithProviders(<CategoriesPage />, { route: "/categories", searchTerm: "cake" });

    expect(await screen.findByText("No categories match “cake”.")).toBeInTheDocument();
  });

  it("given the categories fail to load, when Try again is pressed, then they are read again", async () => {
    vi.mocked(categoriesApi.listCategories).mockRejectedValueOnce(new Error("offline"));
    renderWithProviders(<CategoriesPage />, { route: "/categories" });

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("row", { name: /Church/ })).toBeInTheDocument();
  });

  it("given the add drawer, when a category is saved, then it is created and the drawer closes", async () => {
    vi.mocked(categoriesApi.createCategory).mockResolvedValue(aCategory({ name: "Cake" }));
    renderWithProviders(<CategoriesPage />, { route: "/categories" });
    await screen.findByRole("row", { name: /Church/ });

    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    const drawer = screen.getByRole("dialog", { name: "New category" });
    await userEvent.type(within(drawer).getByLabelText("Name"), "Cake");
    await userEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(categoriesApi.createCategory).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Cake", emoji: null }));
    expect(categoriesApi.listCategories).toHaveBeenCalledTimes(2);
  });

  it("given a category, when it is edited, then the drawer opens filled in and saves the changes", async () => {
    vi.mocked(categoriesApi.updateCategory).mockResolvedValue(photographer);
    renderWithProviders(<CategoriesPage />, { route: "/categories" });
    await screen.findByRole("row", { name: /Photographer/ });

    await userEvent.click(within(rowOf("Photographer")).getByRole("button", { name: "Actions for Photographer" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const drawer = screen.getByRole("dialog", { name: "Edit category" });
    const name = within(drawer).getByLabelText("Name");
    expect(name).toHaveValue("Photographer");
    expect(within(drawer).getByLabelText("Color")).toHaveValue("#f39237");
    await userEvent.clear(name);
    await userEvent.type(name, "Photo & video");
    await userEvent.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(categoriesApi.updateCategory).toHaveBeenCalledWith(1, photographer.id, {
      name: "Photo & video",
      emoji: "📸",
      color: "#f39237",
    });
  });

  it("given a category with items, when it is deleted, then it asks first and says its items stay", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockResolvedValue();
    renderWithProviders(<CategoriesPage />, { route: "/categories" });
    await screen.findByRole("row", { name: /Church/ });

    await userEvent.click(within(rowOf("Church")).getByRole("button", { name: "Actions for Church" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Its 2 items stay, with no category.")).toBeInTheDocument();
    expect(categoriesApi.deleteCategory).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Yes, delete “Church”" }));

    await waitFor(() => expect(categoriesApi.deleteCategory).toHaveBeenCalledWith(1, church.id));
    expect(categoriesApi.listCategories).toHaveBeenCalledTimes(2);
  });

  it("given a delete that is thought better of, when Cancel is pressed, then nothing is deleted", async () => {
    renderWithProviders(<CategoriesPage />, { route: "/categories" });
    await screen.findByRole("row", { name: /Photographer/ });

    await userEvent.click(within(rowOf("Photographer")).getByRole("button", { name: "Actions for Photographer" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("No items use it.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: /Yes, delete/ })).not.toBeInTheDocument();
    expect(categoriesApi.deleteCategory).not.toHaveBeenCalled();
  });

  it("given the API refuses a delete, when it is confirmed, then the page says so", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockRejectedValue(new Error("offline"));
    vi.mocked(itemsApi.listItems).mockResolvedValue([anItem({ categoryId: photographer.id })]);
    renderWithProviders(<CategoriesPage />, { route: "/categories" });
    await screen.findByRole("row", { name: /Photographer/ });

    await userEvent.click(within(rowOf("Photographer")).getByRole("button", { name: "Actions for Photographer" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Its item stays, with no category.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes, delete “Photographer”" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not delete that category.");
  });
});
