import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "../../api/client";
import * as guestsApi from "../../api/guests";
import type { GuestDraft, GuestImportRow } from "../../api/types";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestImportDialog } from "./GuestImportDialog";

vi.mock("../../api/guests");

const aDraft = (overrides: Partial<GuestDraft> = {}): GuestDraft => ({
  firstName: "Maria",
  lastName: "Rossi",
  isChild: false,
  gender: null,
  relationshipType: null,
  side: null,
  rsvpStatus: "pending",
  phone: null,
  email: null,
  ...overrides,
});

const maria = aDraft();
const carlos = aDraft({ firstName: "Carlos", lastName: "Mendoza", side: "venezuela", isChild: true });

const mixedPreview: GuestImportRow[] = [
  { rowNumber: 2, guest: maria, errors: [] },
  { rowNumber: 3, guest: null, errors: [{ field: "first_name", code: "missing" }] },
  { rowNumber: 4, guest: carlos, errors: [] },
  {
    rowNumber: 5,
    guest: null,
    errors: [
      { field: "side", code: "invalid" },
      { field: "email", code: "too_long" },
    ],
  },
];

const csvFile = () => new File(["first_name,last_name\n"], "guests.csv", { type: "text/csv" });

function renderDialog(handlers: { onImport?: (drafts: GuestDraft[]) => Promise<void>; onClose?: () => void } = {}) {
  const onImport = handlers.onImport ?? vi.fn().mockResolvedValue(undefined);
  const onClose = handlers.onClose ?? vi.fn();
  renderWithProviders(<GuestImportDialog weddingId={1} onImport={onImport} onClose={onClose} />);
  return { onImport, onClose };
}

async function uploadFile() {
  await userEvent.upload(screen.getByLabelText("CSV file"), csvFile());
}

describe("GuestImportDialog", () => {
  beforeEach(() => {
    vi.mocked(guestsApi.guestImportTemplateUrl).mockReturnValue(
      "http://localhost:8000/api/weddings/1/guests/import/template",
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given the dialog opens, when nothing is uploaded yet, then it offers the template and a file picker", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Import guests from CSV" })).toBeInTheDocument();
    const template = screen.getByRole("link", { name: "Download the CSV template" });
    expect(template).toHaveAttribute("href", "http://localhost:8000/api/weddings/1/guests/import/template");
    expect(template).toHaveAttribute("download");
    expect(guestsApi.guestImportTemplateUrl).toHaveBeenCalledWith(1);
    expect(screen.getByLabelText("CSV file")).toHaveAttribute("accept", ".csv,text/csv");
  });

  it("given a filled-in template, when it is uploaded, then the valid guests and the bad rows are previewed", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue(mixedPreview);
    renderDialog();

    await uploadFile();

    expect(guestsApi.previewGuestImport).toHaveBeenCalledWith(1, expect.any(File));
    expect(await screen.findByText("2 guests ready to import")).toBeInTheDocument();
    const ready = screen.getByRole("table", { name: "Guests to import" });
    expect(within(ready).getByRole("row", { name: /Maria Rossi/ })).toBeInTheDocument();
    const carlosRow = within(ready).getByRole("row", { name: /Carlos Mendoza/ });
    expect(carlosRow).toHaveTextContent("Child");
    expect(carlosRow).toHaveTextContent("Venezuela");

    expect(screen.getByText("2 rows have problems and will be skipped")).toBeInTheDocument();
    const problems = screen.getByRole("list", { name: "Rows with problems" });
    expect(within(problems).getByText("Row 3: first_name is missing.")).toBeInTheDocument();
    expect(
      within(problems).getByText("Row 5: side has a value we don't recognise. email is too long."),
    ).toBeInTheDocument();
  });

  it("given a preview, when the import is confirmed, then only the valid guests are handed over", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue(mixedPreview);
    const { onImport } = renderDialog();
    await uploadFile();

    await userEvent.click(await screen.findByRole("button", { name: "Import 2 guests" }));

    expect(onImport).toHaveBeenCalledWith([maria, carlos]);
  });

  it("given a single valid guest, when the preview is shown, then the wording is singular", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue([
      { rowNumber: 2, guest: maria, errors: [] },
      { rowNumber: 3, guest: null, errors: [{ field: "last_name", code: "missing" }] },
    ]);
    renderDialog();

    await uploadFile();

    expect(await screen.findByText("1 guest ready to import")).toBeInTheDocument();
    expect(screen.getByText("1 row has problems and will be skipped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import 1 guest" })).toBeInTheDocument();
  });

  it("given a file where every row is wrong, when it is previewed, then there is nothing to confirm", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue([
      { rowNumber: 2, guest: null, errors: [{ field: "first_name", code: "missing" }] },
    ]);
    renderDialog();

    await uploadFile();

    expect(await screen.findByText("0 guests ready to import")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import 0 guests" })).toBeDisabled();
  });

  it("given a template with no rows filled in, when it is previewed, then it says the file is empty", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue([]);
    renderDialog();

    await uploadFile();

    expect(await screen.findByText("This file has no guests in it.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Import/ })).not.toBeInTheDocument();
  });

  it("given a file without the template's columns, when it is uploaded, then it says to start from the template", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockRejectedValue(new ApiError("csv_missing_columns", 422));
    renderDialog();

    await uploadFile();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This file needs first_name and last_name columns. Start from the template.",
    );
  });

  it("given a file saved in another encoding, when it is uploaded, then it asks for UTF-8", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockRejectedValue(new ApiError("csv_not_utf8", 422));
    renderDialog();

    await uploadFile();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not read this file. Save it as CSV (UTF-8) and try again.",
    );
  });

  it("given a huge file, when it is uploaded, then it is refused as too large", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockRejectedValue(new ApiError("csv_too_large", 422));
    renderDialog();

    await uploadFile();

    expect(await screen.findByRole("alert")).toHaveTextContent("This file is too large for a guest list.");
  });

  it("given the API is down, when a file is uploaded, then a general failure is shown", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockRejectedValue(new Error("connection refused"));
    renderDialog();

    await uploadFile();

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not check this file.");
  });

  it("given a preview, when another file is chosen, then the dialog goes back to the file picker", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue(mixedPreview);
    renderDialog();
    await uploadFile();

    await userEvent.click(await screen.findByRole("button", { name: "Choose another file" }));

    expect(screen.getByLabelText("CSV file")).toBeInTheDocument();
    expect(screen.queryByText("2 guests ready to import")).not.toBeInTheDocument();
  });

  it("given an import that fails, when it is confirmed, then the preview stays and explains", async () => {
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue(mixedPreview);
    const onImport = vi.fn().mockRejectedValue(new Error("boom"));
    renderDialog({ onImport });
    await uploadFile();

    await userEvent.click(await screen.findByRole("button", { name: "Import 2 guests" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not import these guests.");
    expect(screen.getByText("2 guests ready to import")).toBeInTheDocument();
  });

  it("given an open dialog, when it is cancelled or escape is pressed, then it closes", async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
