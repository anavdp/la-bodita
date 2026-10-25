import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "../../api/client";
import * as documentsApi from "../../api/documents";
import { aDocument, anItem, aPaperRequest, aPerson, aTask } from "../../testing/planningFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { TaskForm } from "./TaskForm";

vi.mock("../../api/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/documents")>()),
  listDocuments: vi.fn(),
  listPaperRequests: vi.fn(),
  listPeople: vi.fn(),
  uploadDocument: vi.fn(),
  createPaperRequest: vi.fn(),
  updatePaperRequest: vi.fn(),
  deletePaperRequest: vi.fn(),
}));

const vicky = aPerson({ displayName: "Vicky" });
const parish = anItem({ name: "Iglesia San José" });
const meeting = aTask({
  title: "Meeting with Padre Luis",
  itemId: parish.id,
  itemName: parish.name,
  dueDate: "2026-11-08",
  dueTime: "10:00:00",
});
const panel = () => screen.getByRole("dialog");

describe("TaskForm", () => {
  beforeEach(() => {
    vi.mocked(documentsApi.listPeople).mockResolvedValue([vicky]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([]);
    vi.mocked(documentsApi.uploadDocument).mockResolvedValue(aDocument({ id: 700 }));
    vi.mocked(documentsApi.createPaperRequest).mockResolvedValue(aPaperRequest());
    vi.mocked(documentsApi.updatePaperRequest).mockResolvedValue(aPaperRequest());
    vi.mocked(documentsApi.deletePaperRequest).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("given a new task for an item, when papers and files are added to it, then each lands on the saved task", async () => {
    const onSave = vi.fn().mockResolvedValue({ ...meeting, id: 42 });
    const onClose = vi.fn();
    renderWithProviders(<TaskForm items={[parish]} onSave={onSave} onClose={onClose} />);

    await userEvent.type(within(panel()).getByLabelText("Task"), "Meeting with Padre Luis");
    await userEvent.click(within(panel()).getByRole("combobox", { name: "Item" }));
    await userEvent.click(within(panel()).getByRole("option", { name: "Iglesia San José" }));
    await userEvent.type(within(panel()).getByLabelText("Paper to bring"), "Baptism certificate");
    await userEvent.click(within(panel()).getByRole("combobox", { name: "Whose" }));
    await userEvent.click(within(panel()).getByRole("option", { name: "Vicky" }));
    await userEvent.click(within(panel()).getByRole("button", { name: "Add paper" }));
    expect(within(panel()).getByText("Baptism certificate")).toBeInTheDocument();
    const photo = new File(["a"], "church.jpg", { type: "image/jpeg" });
    await userEvent.upload(within(panel()).getByLabelText("Attach files"), photo);
    await userEvent.click(within(panel()).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      { title: "Meeting with Padre Luis", itemId: parish.id, dueDate: null, dueTime: null },
      null,
    );
    expect(documentsApi.createPaperRequest).toHaveBeenCalledWith(1, {
      name: "Baptism certificate",
      itemId: parish.id,
      requirementId: 42,
      personId: vicky.id,
    });
    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(1, photo, {
      title: null,
      kind: "photo",
      itemId: parish.id,
      requirementId: 42,
      personId: null,
      expiresOn: null,
    });
  });

  it("given a general task, when the form shows, then papers wait for an item but files can still be attached", async () => {
    renderWithProviders(<TaskForm items={[parish]} onSave={vi.fn()} onClose={vi.fn()} />);

    expect(within(panel()).getByText("Pick an item to ask for the papers it needs.")).toBeInTheDocument();
    expect(within(panel()).queryByLabelText("Paper to bring")).not.toBeInTheDocument();
    expect(within(panel()).getByLabelText("Attach files")).toBeInTheDocument();
  });

  it("given an existing task, when it opens, then its details, papers and files are there to change", async () => {
    const banns = aPaperRequest({ name: "Banns form", itemId: parish.id, requirementId: meeting.id });
    const elsewhere = aPaperRequest({ name: "Nulla osta", itemId: parish.id, requirementId: null });
    const answered = aPaperRequest({
      name: "Baptism certificate",
      itemId: parish.id,
      requirementId: meeting.id,
      isMissing: false,
      documentId: 5,
      documentTitle: "Baptism certificate",
    });
    vi.mocked(documentsApi.listPaperRequests).mockResolvedValue([banns, elsewhere, answered]);
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([
      aDocument({ id: 5, title: "Baptism certificate", requirementId: meeting.id }),
    ]);
    const onSave = vi.fn().mockResolvedValue(meeting);
    const onClose = vi.fn();
    renderWithProviders(
      <TaskForm task={meeting} itemId={parish.id} onSave={onSave} onDelete={vi.fn()} onClose={onClose} />,
    );

    expect(within(panel()).getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
    expect(within(panel()).getByLabelText("Task")).toHaveValue("Meeting with Padre Luis");
    expect(await within(panel()).findByText("Banns form")).toBeInTheDocument();
    expect(within(panel()).queryByText("Nulla osta")).not.toBeInTheDocument();
    expect(within(panel()).getByRole("link", { name: "Open Baptism certificate" })).toBeInTheDocument();
    expect(documentsApi.listDocuments).toHaveBeenCalledWith(1, { requirementId: meeting.id });

    const paper = new File(["%PDF"], "banns.pdf", { type: "application/pdf" });
    await userEvent.upload(within(panel()).getByLabelText("Upload Banns form for Both of us"), paper);
    await waitFor(() => expect(documentsApi.updatePaperRequest).toHaveBeenCalledWith(1, banns.id, { documentId: 700 }));
    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(1, paper, {
      title: "Banns form",
      kind: "paper",
      itemId: parish.id,
      requirementId: meeting.id,
      personId: null,
      expiresOn: null,
    });

    await userEvent.click(within(panel()).getByRole("button", { name: "Stop asking for Baptism certificate" }));
    expect(documentsApi.deletePaperRequest).toHaveBeenCalledWith(1, answered.id);

    const title = within(panel()).getByLabelText("Task");
    await userEvent.clear(title);
    await userEvent.type(title, "Meeting with Padre Luis and the choir");
    await userEvent.click(within(panel()).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      {
        title: "Meeting with Padre Luis and the choir",
        itemId: parish.id,
        dueDate: "2026-11-08",
        dueTime: "10:00",
      },
      meeting.id,
    );
  });

  it("given an existing task, when Delete is pressed, then it asks the page to delete it", async () => {
    const onDelete = vi.fn();
    renderWithProviders(<TaskForm task={meeting} items={[parish]} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);

    await userEvent.click(within(panel()).getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("given a file the bucket refuses, when the task is saved, then it says so and a retry does not add the task twice", async () => {
    vi.mocked(documentsApi.uploadDocument).mockRejectedValueOnce(new ApiError("not set up", 503));
    const onSave = vi.fn().mockResolvedValue({ ...meeting, id: 42 });
    const onClose = vi.fn();
    renderWithProviders(<TaskForm itemId={parish.id} onSave={onSave} onClose={onClose} />);

    await userEvent.type(within(panel()).getByLabelText("Task"), "Fitting");
    await userEvent.upload(within(panel()).getByLabelText("Attach files"), new File(["a"], "a.jpg", { type: "image/jpeg" }));
    await userEvent.click(within(panel()).getByRole("button", { name: "Add" }));

    expect(await within(panel()).findByRole("alert")).toHaveTextContent("Uploads aren't set up yet");
    await userEvent.click(within(panel()).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenLastCalledWith(expect.anything(), 42);
    expect(documentsApi.uploadDocument).toHaveBeenCalledTimes(2);
  });

  it("given no title, when the task is saved, then nothing is sent", async () => {
    const onSave = vi.fn();
    renderWithProviders(<TaskForm items={[parish]} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.click(within(panel()).getByRole("button", { name: "Add" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(within(panel()).getByRole("alert")).toBeInTheDocument();
  });
});
