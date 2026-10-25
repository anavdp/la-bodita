import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as documentsApi from "../../api/documents";
import * as tasksApi from "../../api/tasks";
import { aDocument, anItem, aPaperRequest, aPerson } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { ItemPapers } from "./ItemPapers";

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
const parish = anItem({ name: "Iglesia San José" });
const certificate = aDocument({ title: "Baptism certificate", itemId: parish.id, itemName: parish.name });
const receipt = aDocument({ title: "Parish fee receipt", itemId: parish.id, itemName: parish.name });
const baptism = aPaperRequest({
  name: "Baptism certificate",
  personId: vicky.id,
  documentId: certificate.id,
  isMissing: false,
  itemId: parish.id,
});
const banns = aPaperRequest({ name: "Marriage banns form", personId: null, itemId: parish.id });

const panel = () => screen.getByRole("dialog");
const papers = () => screen.getByRole("region", { name: /Papers they need/ });

describe("ItemPapers", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(tasksApi.listTasks).mockResolvedValue([]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([certificate, receipt]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([baptism, banns]);
    vi.mocked(documentsApi.listPeople).mockResolvedValue([vicky]);
    vi.mocked(documentsApi.uploadDocument).mockResolvedValue(aDocument({ id: 600 }));
    vi.mocked(documentsApi.updatePaperRequest).mockResolvedValue(banns);
    vi.mocked(documentsApi.createPaperRequest).mockResolvedValue(banns);
    vi.mocked(documentsApi.deletePaperRequest).mockResolvedValue(undefined);
    vi.mocked(documentsApi.updateDocument).mockResolvedValue(receipt);
    vi.mocked(documentsApi.deleteDocument).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPapers = () => renderWithProviders(<ItemPapers weddingId={1} item={parish} items={[parish]} />, { route: "/items" });

  it("given papers the item asks for, when it opens, then each shows whose it is and whether we have it", async () => {
    renderPapers();

    await within(await screen.findByRole("region", { name: /Papers they need/ })).findByText("Marriage banns form");
    expect(papers()).toHaveTextContent("1 missing");
    expect(within(papers()).getByRole("link", { name: "Open Baptism certificate" })).toHaveAttribute(
      "href",
      `http://localhost:8000/api/weddings/1/documents/${certificate.id}/file`,
    );
    expect(within(papers()).getByText("Both of us")).toBeInTheDocument();
    expect(documentsApi.listPaperRequests).toHaveBeenCalledWith(1, { itemId: parish.id });
  });

  it("given a missing paper, when it is uploaded, then it answers the request", async () => {
    renderPapers();

    await userEvent.click(await screen.findByRole("button", { name: "Upload Marriage banns form for Both of us" }));
    const file = new File(["%PDF"], "banns.pdf", { type: "application/pdf" });
    await userEvent.upload(panel().querySelector('input[type="file"]') as HTMLInputElement, file);
    await userEvent.click(within(panel()).getByRole("button", { name: "Save 1 file" }));

    await waitFor(() => expect(documentsApi.updatePaperRequest).toHaveBeenCalledWith(1, banns.id, { documentId: 600 }));
    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(1, file, {
      title: "Marriage banns form",
      kind: "paper",
      itemId: parish.id,
      requirementId: null,
      personId: null,
      expiresOn: null,
    });
  });

  it("given a paper to ask for, when it is added here, then it is for this item", async () => {
    renderPapers();

    await userEvent.click(await screen.findByRole("button", { name: "+ Ask for a paper" }));
    expect(within(panel()).queryByRole("combobox", { name: "Item" })).not.toBeInTheDocument();
    await userEvent.type(within(panel()).getByLabelText("Paper"), "Pre-Cana certificate");
    await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(documentsApi.createPaperRequest).toHaveBeenCalledWith(1, {
        name: "Pre-Cana certificate",
        itemId: parish.id,
        requirementId: null,
        personId: null,
      }),
    );
  });

  it("given a paper no longer needed, when it is taken off, then the request goes", async () => {
    renderPapers();

    await userEvent.click(await screen.findByRole("button", { name: "Stop asking for Marriage banns form" }));

    expect(documentsApi.deletePaperRequest).toHaveBeenCalledWith(1, banns.id);
  });

  it("given files on the item, when it opens, then they show with a way to add more", async () => {
    renderPapers();

    const files = await screen.findByRole("region", { name: "Files" });
    expect(await within(files).findByText("Parish fee receipt")).toBeInTheDocument();
    await userEvent.click(within(files).getByRole("button", { name: "Add files" }));
    expect(within(panel()).getByRole("combobox", { name: "Item" })).toHaveTextContent("Iglesia San José");
  });

  it("given a file, when it is edited and then deleted, then both reach the API", async () => {
    renderPapers();

    await userEvent.click(await screen.findByRole("button", { name: "Edit Parish fee receipt" }));
    await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(documentsApi.updateDocument).toHaveBeenCalled());

    await userEvent.click(await screen.findByRole("button", { name: "Edit Parish fee receipt" }));
    await userEvent.click(within(panel()).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(documentsApi.deleteDocument).toHaveBeenCalledWith(1, receipt.id));
  });

  it("given nothing asked for and no files, when it opens, then it says so", async () => {
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([]);
    renderPapers();

    expect(await screen.findByText("No papers asked for yet.")).toBeInTheDocument();
    expect(screen.getByText("No files yet.")).toBeInTheDocument();
  });
});
