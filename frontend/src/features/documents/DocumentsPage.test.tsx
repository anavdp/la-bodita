import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as categoriesApi from "../../api/categories";
import { ApiError } from "../../api/client";
import * as documentsApi from "../../api/documents";
import * as itemsApi from "../../api/items";
import * as tasksApi from "../../api/tasks";
import { aCategory, aDocument, anItem, aPaperRequest, aPerson, aTask } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { DocumentsPage } from "./DocumentsPage";

vi.mock("../../api/categories");
vi.mock("../../api/items");
vi.mock("../../api/tasks");
vi.mock("../../api/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/documents")>()),
  listDocuments: vi.fn(),
  listPaperRequests: vi.fn(),
  listPeople: vi.fn(),
  uploadDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  createPaperRequest: vi.fn(),
  updatePaperRequest: vi.fn(),
  deletePaperRequest: vi.fn(),
}));

const vicky = aPerson({ displayName: "Vicky" });
const gerardo = aPerson({ displayName: "Gerardo" });
const church = aCategory({ name: "Church", emoji: "⛪" });
const dress = aCategory({ name: "Dress", emoji: "👗" });
const parish = anItem({ name: "Iglesia San José", categoryId: church.id });
const atelier = anItem({ name: "Atelier Valentina", categoryId: dress.id });
const ofItem = (item: typeof parish) => ({ itemId: item.id, itemName: item.name, categoryId: item.categoryId });

const baptism = aDocument({ title: "Baptism certificate", personId: gerardo.id, ...ofItem(parish) });
const fitting = aDocument({
  title: "Fitting 1",
  kind: "photo",
  fileName: "IMG_0412.jpg",
  contentType: "image/jpeg",
  ...ofItem(atelier),
});
const engagement = aDocument({ title: "Engagement photo", kind: "photo", contentType: "image/jpeg" });

const confirmation = (person: typeof vicky) =>
  aPaperRequest({ name: "Confirmation certificate", personId: person.id, ...ofItem(parish) });
const vickyConfirmation = confirmation(vicky);
const gerardoConfirmation = aPaperRequest({
  name: "Confirmation certificate",
  personId: gerardo.id,
  documentId: baptism.id,
  isMissing: false,
  ...ofItem(parish),
});
const banns = aPaperRequest({ name: "Marriage banns form", personId: null, ...ofItem(parish) });

const row = (name: string) => screen.getByRole("row", { name: new RegExp(name) });
const panel = () => screen.getByRole("dialog");

function fileInput(): HTMLInputElement {
  return panel().querySelector('input[type="file"]') as HTMLInputElement;
}

describe("DocumentsPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([church, dress]);
    vi.mocked(itemsApi.listItems).mockResolvedValue([parish, atelier]);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([fitting, baptism, engagement]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([vickyConfirmation, gerardoConfirmation, banns]);
    vi.mocked(documentsApi.listPeople).mockResolvedValue([vicky, gerardo]);
    vi.mocked(documentsApi.uploadDocument).mockResolvedValue(aDocument({ id: 500 }));
    vi.mocked(documentsApi.updatePaperRequest).mockResolvedValue(vickyConfirmation);
    vi.mocked(documentsApi.createPaperRequest).mockResolvedValue(banns);
    vi.mocked(documentsApi.updateDocument).mockResolvedValue(fitting);
    vi.mocked(documentsApi.deleteDocument).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("the Papers tab", () => {
    it("given papers asked for, when the tab opens, then each is a row with a cell for each of us", async () => {
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      await screen.findByRole("table", { name: "Our papers" });
      expect(screen.getByRole("columnheader", { name: "Vicky" })).toBeInTheDocument();
      const [vickyCell, gerardoCell] = within(row("Confirmation certificate")).getAllByRole("cell").slice(1, 3);
      expect(vickyCell).toHaveTextContent("Missing");
      expect(gerardoCell).toHaveTextContent("Have it");
      expect(row("Confirmation certificate")).toHaveTextContent("Iglesia San José");
      expect(within(row("Marriage banns form")).getAllByText("Missing")).toHaveLength(2);
    });

    it("given an item waiting on papers, when the tab opens, then an alert says which", async () => {
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      const alert = await screen.findByRole("region", { name: "Iglesia San José is waiting on 2 papers" });
      expect(alert).toHaveTextContent("Confirmation certificate (Vicky), Marriage banns form");
      expect(within(alert).getByRole("link", { name: "See what's missing" })).toHaveAttribute(
        "href",
        `/items?item=${parish.id}`,
      );
      const [tabs] = screen.getAllByRole("navigation", { name: "Documents views" });
      expect(within(tabs).getByRole("link", { name: /Papers/ })).toHaveTextContent("2");
    });

    it("given a paper running out, when the tab opens, then an alert offers a new one", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-25T12:00:00"));
      const passport = aDocument({ title: "Passport", personId: vicky.id, expiresOn: "2026-12-01" });
      vi.mocked(documentsApi.listDocuments).mockResolvedValue([passport]);
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      const alert = await screen.findByRole("region", { name: "Passport · Vicky" });
      expect(alert).toHaveTextContent("Expires Dec 1, 2026");
      await userEvent.click(within(alert).getByRole("button", { name: "Upload a new one" }));
      expect(within(panel()).getByLabelText("Name (optional)")).toHaveValue("Passport");
    });

    it("given a missing paper, when one is uploaded from its cell, then it answers the request", async () => {
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      await screen.findByRole("table", { name: "Our papers" });
      await userEvent.click(
        within(row("Confirmation certificate")).getByRole("button", { name: "Upload Confirmation certificate for Vicky" }),
      );
      expect(within(panel()).getByRole("combobox", { name: "What is it" })).toHaveTextContent("A paper");
      expect(within(panel()).getByRole("combobox", { name: "Whose" })).toHaveTextContent("Vicky");
      const file = new File(["%PDF"], "confirmation.pdf", { type: "application/pdf" });
      await userEvent.upload(fileInput(), file);
      await userEvent.click(within(panel()).getByRole("button", { name: "Save 1 file" }));

      await waitFor(() =>
        expect(documentsApi.uploadDocument).toHaveBeenCalledWith(1, file, {
          title: "Confirmation certificate",
          kind: "paper",
          itemId: parish.id,
          requirementId: null,
          personId: vicky.id,
          expiresOn: null,
        }),
      );
      expect(documentsApi.updatePaperRequest).toHaveBeenCalledWith(1, vickyConfirmation.id, { documentId: 500 });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("given a paper we have and another item asking for it, when it is reused, then it answers that one too", async () => {
      const passport = aDocument({ title: "Passport", personId: vicky.id });
      const answered = aPaperRequest({ name: "Passport", personId: vicky.id, documentId: passport.id, isMissing: false });
      const asking = aPaperRequest({ name: "Passport", personId: vicky.id, itemId: 99, itemName: "Consolato" });
      vi.mocked(documentsApi.listDocuments).mockResolvedValue([passport]);
      vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([answered, asking]);
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      await userEvent.click(await screen.findByRole("button", { name: "Use it for 1 more" }));

      expect(documentsApi.updatePaperRequest).toHaveBeenCalledWith(1, asking.id, { documentId: passport.id });
    });

    it("given a paper to ask for, when it is added, then it is saved for the item and person picked", async () => {
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      await userEvent.click(await screen.findByRole("button", { name: "+ Ask for a paper" }));
      await userEvent.type(within(panel()).getByLabelText("Paper"), "Nulla osta");
      await userEvent.click(within(panel()).getByRole("combobox", { name: "Item" }));
      await userEvent.click(within(panel()).getByRole("option", { name: "Iglesia San José" }));
      await userEvent.click(within(panel()).getByRole("combobox", { name: "Whose" }));
      await userEvent.click(within(panel()).getByRole("option", { name: "Gerardo" }));
      await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(documentsApi.createPaperRequest).toHaveBeenCalledWith(1, {
          name: "Nulla osta",
          itemId: parish.id,
          requirementId: null,
          personId: gerardo.id,
        }),
      );
    });

    it("given no item picked, when a paper is asked for, then it says an item is needed", async () => {
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      await userEvent.click(await screen.findByRole("button", { name: "+ Ask for a paper" }));
      await userEvent.type(within(panel()).getByLabelText("Paper"), "Nulla osta");
      await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));

      expect(within(panel()).getByRole("alert")).toHaveTextContent("Pick the item that asks for it.");
      expect(documentsApi.createPaperRequest).not.toHaveBeenCalled();
    });

    it("given nothing asked for yet, when the tab opens, then it says how to start", async () => {
      vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([]);
      renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

      expect(await screen.findByText(/No papers asked for yet/)).toBeInTheDocument();
    });
  });

  describe("the All files tab", () => {
    it("given files on items and on none, when the tab opens, then they sit on their category's shelf, ours last", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      const dressShelf = await screen.findByRole("region", { name: "👗 Dress" });
      expect(within(dressShelf).getByText("Atelier Valentina")).toBeInTheDocument();
      expect(within(dressShelf).getByRole("img", { name: "Fitting 1" })).toHaveAttribute(
        "src",
        "http://localhost:8000/api/weddings/1/documents/" + fitting.id + "/file",
      );
      expect(within(screen.getByRole("region", { name: "⛪ Church" })).getByText("Baptism certificate")).toBeInTheDocument();
      expect(within(screen.getByRole("region", { name: "Just ours" })).getByText("Engagement photo")).toBeInTheDocument();
      expect(within(screen.getByRole("region", { name: "Just ours" })).getByText("1 file")).toBeInTheDocument();
    });

    it("given photos and papers, when Papers is picked, then only papers stay", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Papers · 1" }));

      expect(screen.getByText("Baptism certificate")).toBeInTheDocument();
      expect(screen.queryByText("Fitting 1")).not.toBeInTheDocument();
    });

    it("given a search, when files are listed, then only matching ones show", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all", searchTerm: "valentina" });

      await screen.findByText("Fitting 1");
      expect(screen.queryByText("Engagement photo")).not.toBeInTheDocument();
    });

    it("given photos picked for an item's task, when saved, then each goes up to that task", async () => {
      const secondFitting = aTask({ title: "Second fitting", itemId: atelier.id });
      vi.mocked(tasksApi.listTasks).mockResolvedValue([secondFitting]);
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
      const photos = [
        new File(["a"], "one.jpg", { type: "image/jpeg" }),
        new File(["b"], "two.jpg", { type: "image/jpeg" }),
      ];
      await userEvent.upload(fileInput(), photos);
      expect(within(panel()).getByText("2 files picked")).toBeInTheDocument();
      await userEvent.click(within(panel()).getByRole("combobox", { name: "Item" }));
      await userEvent.click(within(panel()).getByRole("option", { name: "Atelier Valentina" }));
      await userEvent.click(await within(panel()).findByRole("combobox", { name: "Task (optional)" }));
      await userEvent.click(within(panel()).getByRole("option", { name: "Second fitting" }));
      await userEvent.click(within(panel()).getByRole("button", { name: "Remove two.jpg" }));
      await userEvent.click(within(panel()).getByRole("button", { name: "Save 1 file" }));

      await waitFor(() =>
        expect(documentsApi.uploadDocument).toHaveBeenCalledWith(1, photos[0], {
          title: null,
          kind: "photo",
          itemId: atelier.id,
          requirementId: secondFitting.id,
          personId: null,
          expiresOn: null,
        }),
      );
      expect(tasksApi.listTasks).toHaveBeenCalledWith(1, { itemId: atelier.id });
      expect(documentsApi.uploadDocument).toHaveBeenCalledTimes(1);
    });

    it("given only PDFs picked, when the kind was not chosen, then they go up as papers", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
      await userEvent.upload(fileInput(), new File(["%PDF"], "contract.pdf", { type: "application/pdf" }));

      expect(within(panel()).getByRole("combobox", { name: "What is it" })).toHaveTextContent("A paper");
    });

    it("given no file picked, when saved, then it asks for one", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
      await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));

      expect(within(panel()).getByRole("alert")).toHaveTextContent("Pick at least one photo or PDF.");
    });

    it("given the bucket isn't set up, when a file is saved, then it says so", async () => {
      vi.mocked(documentsApi.uploadDocument).mockRejectedValue(new ApiError("Documents aren't set up yet", 503));
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
      await userEvent.upload(fileInput(), new File(["a"], "one.jpg", { type: "image/jpeg" }));
      await userEvent.click(within(panel()).getByRole("button", { name: "Save 1 file" }));

      expect(await within(panel()).findByRole("alert")).toHaveTextContent("Uploads aren't set up yet");
    });

    it("given a file, when it is renamed and given an expiry, then only that is saved", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Edit Baptism certificate" }));
      expect(within(panel()).getByRole("link", { name: /Open/ })).toHaveAttribute("target", "_blank");
      const name = within(panel()).getByLabelText("Name (optional)");
      await userEvent.clear(name);
      await userEvent.type(name, "Baptism, Gerardo");
      await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(documentsApi.updateDocument).toHaveBeenCalledWith(1, baptism.id, {
          title: "Baptism, Gerardo",
          kind: "paper",
          itemId: parish.id,
          requirementId: null,
          personId: gerardo.id,
          expiresOn: null,
        }),
      );
    });

    it("given a file, when it is deleted, then it is gone after asking", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "Edit Fitting 1" }));
      await userEvent.click(within(panel()).getByRole("button", { name: "Delete" }));

      expect(window.confirm).toHaveBeenCalled();
      await waitFor(() => expect(documentsApi.deleteDocument).toHaveBeenCalledWith(1, fitting.id));
    });

    it("given no files yet, when the tab opens, then it says how to start", async () => {
      vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      expect(await screen.findByText(/No files yet/)).toBeInTheDocument();
    });

    it("given photos on the shelves, when one is tapped, then it opens in the viewer and can be edited from there", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      await userEvent.click(await screen.findByRole("button", { name: "View Fitting 1" }));

      const viewer = screen.getByRole("dialog", { name: "Photos" });
      expect(within(viewer).getByText("1 of 2")).toBeInTheDocument();
      await userEvent.click(within(viewer).getByRole("button", { name: "Next photo" }));
      expect(within(viewer).getByRole("img", { name: "Engagement photo" })).toBeInTheDocument();
      await userEvent.click(within(viewer).getByRole("button", { name: "Edit Engagement photo" }));
      expect(screen.queryByRole("dialog", { name: "Photos" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveTextContent("Edit file");
    });

    it("given a photo the browser can't show, when it fails to load, then a plain tile stands in", async () => {
      renderWithProviders(<DocumentsPage tab="all" />, { route: "/documents/all" });

      const image = await screen.findByRole("img", { name: "Fitting 1" });
      image.dispatchEvent(new Event("error"));

      await waitFor(() => expect(screen.queryByRole("img", { name: "Fitting 1" })).not.toBeInTheDocument());
      expect(screen.getByText("Fitting 1")).toBeInTheDocument();
    });
  });

  it("given the API fails, when the page loads, then it offers to try again", async () => {
    vi.mocked(documentsApi.listDocuments).mockRejectedValueOnce(new Error("down"));
    renderWithProviders(<DocumentsPage tab="papers" />, { route: "/documents" });

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("table", { name: "Our papers" })).toBeInTheDocument();
  });
});
