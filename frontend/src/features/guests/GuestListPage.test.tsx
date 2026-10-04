import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as guestsApi from "../../api/guests";
import { aGuest } from "../../testing/guestFactory";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { GuestListPage } from "./GuestListPage";

vi.mock("../../api/guests");

const maria = aGuest({ firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" });
const carlos = aGuest({
  firstName: "Carlos",
  lastName: "Mendoza",
  rsvpStatus: "pending",
  side: "venezuela",
  relationshipType: "friends",
});

describe("GuestListPage", () => {
  beforeEach(() => {
    vi.mocked(guestsApi.listGuests).mockResolvedValue([carlos, maria]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given the screen opens, when the guests load, then they fill the table", async () => {
    renderWithProviders(<GuestListPage />);

    expect(screen.getByText("Loading guests...")).toBeInTheDocument();
    expect(await screen.findByText("Maria Rossi")).toBeInTheDocument();
    expect(screen.getByText("Carlos Mendoza")).toBeInTheDocument();
    expect(guestsApi.listGuests).toHaveBeenCalledWith(1);
  });

  it("given the screen opens, when it is rendered, then it carries the mockup's page header", async () => {
    renderWithProviders(<GuestListPage />);

    expect(screen.getByRole("heading", { name: "Guest List" })).toBeInTheDocument();
    expect(screen.getByText("Manage your wedding guests and RSVPs")).toBeInTheDocument();
    expect(await screen.findByRole("group", { name: "Confirmed" })).toHaveTextContent("1");
  });

  it("given a wedding with no guests, when the list loads, then the screen invites adding one", async () => {
    vi.mocked(guestsApi.listGuests).mockResolvedValue([]);

    renderWithProviders(<GuestListPage />);

    expect(await screen.findByText("No guests yet. Add the first one.")).toBeInTheDocument();
  });

  it("given the API is down, when the list fails, then the failure is shown and can be retried", async () => {
    vi.mocked(guestsApi.listGuests).mockRejectedValueOnce(new Error("connection refused"));

    renderWithProviders(<GuestListPage />);

    expect(await screen.findByText("We could not load your guests.")).toBeInTheDocument();
    vi.mocked(guestsApi.listGuests).mockResolvedValue([maria]);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Maria Rossi")).toBeInTheDocument();
  });

  it("given the wedding has not loaded yet, when the screen renders, then it waits instead of asking for guests", () => {
    renderWithProviders(<GuestListPage />, { wedding: { wedding: null, isLoading: true } });

    expect(guestsApi.listGuests).not.toHaveBeenCalled();
    expect(screen.getByText("Loading guests...")).toBeInTheDocument();
  });

  it("given a search term in the top bar, when guests are listed, then only matches are shown", async () => {
    renderWithProviders(<GuestListPage />, { searchTerm: "mendo" });

    expect(await screen.findByText("Carlos Mendoza")).toBeInTheDocument();
    expect(screen.queryByText("Maria Rossi")).not.toBeInTheDocument();
  });

  it("given a search that matches nobody, when guests are listed, then the screen says so", async () => {
    renderWithProviders(<GuestListPage />, { searchTerm: "zzz" });

    expect(await screen.findByText('No guests match “zzz”.')).toBeInTheDocument();
  });

  it("given a new guest, when it is added, then it is created against this wedding and the list refreshes", async () => {
    const alejandro = aGuest({ firstName: "Alejandro", lastName: "Garcia" });
    vi.mocked(guestsApi.createGuest).mockResolvedValue(alejandro);
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Maria Rossi");
    vi.mocked(guestsApi.listGuests).mockResolvedValue([alejandro, carlos, maria]);

    await userEvent.click(screen.getByRole("button", { name: "Add Guest" }));
    await userEvent.type(screen.getByLabelText("First name"), "Alejandro");
    await userEvent.type(screen.getByLabelText("Last name"), "Garcia");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(guestsApi.createGuest).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ firstName: "Alejandro", lastName: "Garcia" }),
      ),
    );
    expect(await screen.findByText("Alejandro Garcia")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("given an existing guest, when it is edited, then only the changed fields are patched", async () => {
    vi.mocked(guestsApi.updateGuest).mockResolvedValue({ ...carlos, rsvpStatus: "confirmed" });
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.selectOptions(screen.getByLabelText("RSVP status"), "confirmed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(guestsApi.updateGuest).toHaveBeenCalledWith(
        1,
        carlos.id,
        expect.objectContaining({ rsvpStatus: "confirmed" }),
      ),
    );
  });

  it("given a guest, when the deletion is confirmed, then it is removed from the wedding", async () => {
    vi.mocked(guestsApi.deleteGuest).mockResolvedValue(undefined);
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");
    vi.mocked(guestsApi.listGuests).mockResolvedValue([maria]);

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Carlos Mendoza from the guest list?" }),
    );

    await waitFor(() => expect(guestsApi.deleteGuest).toHaveBeenCalledWith(1, carlos.id));
    await waitFor(() => expect(screen.queryByText("Carlos Mendoza")).not.toBeInTheDocument());
    expect(screen.getByText("Maria Rossi")).toBeInTheDocument();
  });

  it("given a delete that fails, when the API rejects it, then the failure is reported", async () => {
    vi.mocked(guestsApi.deleteGuest).mockRejectedValue(new Error("Guest not found"));
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");

    await userEvent.click(screen.getByRole("button", { name: "Actions for Carlos Mendoza" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Carlos Mendoza from the guest list?" }),
    );

    expect(await screen.findByText("We could not remove this guest.")).toBeInTheDocument();
  });

  it("given a guest row, when the table is rendered, then the side is shown as its flag", async () => {
    renderWithProviders(<GuestListPage />);

    const row = await screen.findByRole("row", { name: /Carlos Mendoza/ });
    expect(within(row).getByRole("img", { name: "Venezuela" })).toHaveTextContent("🇻🇪");
  });
});

describe("changing an RSVP from the table", () => {
  beforeEach(() => {
    vi.mocked(guestsApi.listGuests).mockResolvedValue([carlos, maria]);
  });

  it("given a pending guest, when a new status is chosen, then only the RSVP is patched", async () => {
    vi.mocked(guestsApi.updateGuest).mockResolvedValue({ ...carlos, rsvpStatus: "confirmed" });
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");

    await userEvent.click(screen.getByRole("button", { name: /Carlos Mendoza — Pending/ }));
    await userEvent.click(screen.getByRole("button", { name: "Mark as Confirmed" }));

    await waitFor(() =>
      expect(guestsApi.updateGuest).toHaveBeenCalledWith(1, carlos.id, {
        rsvpStatus: "confirmed",
      }),
    );
  });

  it("given the API rejects it, when the RSVP is changed, then the failure is reported", async () => {
    vi.mocked(guestsApi.updateGuest).mockRejectedValue(new Error("Guest not found"));
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");

    await userEvent.click(screen.getByRole("button", { name: /Carlos Mendoza — Pending/ }));
    await userEvent.click(screen.getByRole("button", { name: "Mark as Declined" }));

    expect(await screen.findByText("We could not update this RSVP.")).toBeInTheDocument();
  });

  it("given a filled-in CSV, when it is imported, then the guests are created and the list reloads", async () => {
    const lucia = aGuest({ firstName: "Lucia", lastName: "Mendoza", side: null, relationshipType: null });
    const { id: _id, weddingId: _weddingId, ...luciaDraft } = lucia;
    vi.mocked(guestsApi.previewGuestImport).mockResolvedValue([
      { rowNumber: 2, guest: luciaDraft, errors: [] },
    ]);
    vi.mocked(guestsApi.importGuests).mockResolvedValue(undefined);
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");
    vi.mocked(guestsApi.listGuests).mockResolvedValue([carlos, lucia, maria]);

    await userEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    await userEvent.upload(
      screen.getByLabelText("CSV file"),
      new File(["first_name,last_name\nLucia,Mendoza\n"], "guests.csv", { type: "text/csv" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Import 1 guest" }));

    expect(guestsApi.importGuests).toHaveBeenCalledWith(1, [luciaDraft]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Lucia Mendoza")).toBeInTheDocument();
  });

  it("given the import dialog is open, when it is cancelled, then nothing is imported", async () => {
    renderWithProviders(<GuestListPage />);
    await screen.findByText("Carlos Mendoza");

    await userEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(guestsApi.importGuests).not.toHaveBeenCalled();
  });
});
