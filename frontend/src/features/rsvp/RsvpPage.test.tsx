import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "../../api/client";
import * as rsvpApi from "../../api/rsvp";
import type { RsvpInvitation } from "../../api/types";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { RsvpPage } from "./RsvpPage";

vi.mock("../../api/rsvp");

const invitation: RsvpInvitation = {
  householdName: "Famiglia Rossi",
  weddingName: "La Bodita",
  weddingDate: "2026-10-29",
  guests: [
    { id: 1, firstName: "Maria", lastName: "Rossi", rsvpStatus: "pending" },
    { id: 2, firstName: "Paolo", lastName: "Rossi", rsvpStatus: "declined" },
  ],
};

function renderPage() {
  return renderWithProviders(<RsvpPage />, { route: "/rsvp/abc", path: "/rsvp/:token" });
}

describe("RsvpPage", () => {
  beforeEach(() => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue(invitation);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given a household link, when it opens, then every member is listed with their current answer", async () => {
    renderPage();

    expect(screen.getByText("Loading your invitation...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "La Bodita" })).toBeInTheDocument();
    expect(rsvpApi.getInvitation).toHaveBeenCalledWith("abc");
    expect(screen.getByText("Invitation for Famiglia Rossi")).toBeInTheDocument();
    const maria = screen.getByRole("group", { name: "Maria Rossi" });
    expect(within(maria).getByRole("radio", { name: "Attending" })).not.toBeChecked();
    expect(within(maria).getByRole("radio", { name: "Not attending" })).not.toBeChecked();
    const paolo = screen.getByRole("group", { name: "Paolo Rossi" });
    expect(within(paolo).getByRole("radio", { name: "Not attending" })).toBeChecked();
  });

  it("given members' answers, when they are sent, then each member's own yes or no is saved", async () => {
    vi.mocked(rsvpApi.answerInvitation).mockResolvedValue({
      ...invitation,
      guests: [
        { ...invitation.guests[0], rsvpStatus: "confirmed" },
        { ...invitation.guests[1], rsvpStatus: "confirmed" },
      ],
    });
    renderPage();

    await userEvent.click(
      within(await screen.findByRole("group", { name: "Maria Rossi" })).getByRole("radio", { name: "Attending" }),
    );
    await userEvent.click(
      within(screen.getByRole("group", { name: "Paolo Rossi" })).getByRole("radio", { name: "Attending" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Send RSVP" }));

    await waitFor(() =>
      expect(rsvpApi.answerInvitation).toHaveBeenCalledWith("abc", [
        { guestId: 1, attending: true },
        { guestId: 2, attending: true },
      ]),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Thank you! Your answers are saved.");
  });

  it("given a whole household coming, when everyone is marked at once, then every member is set to attending", async () => {
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Everyone is coming" }));

    for (const name of ["Maria Rossi", "Paolo Rossi"]) {
      expect(within(screen.getByRole("group", { name })).getByRole("radio", { name: "Attending" })).toBeChecked();
    }
    expect(rsvpApi.answerInvitation).not.toHaveBeenCalled();
  });

  it("given a household that cannot come, when no one is marked at once, then every member is set to not attending", async () => {
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "No one is coming" }));

    for (const name of ["Maria Rossi", "Paolo Rossi"]) {
      expect(within(screen.getByRole("group", { name })).getByRole("radio", { name: "Not attending" })).toBeChecked();
    }
  });

  it("given nobody has answered yet, when the page opens, then sending waits for an answer", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      ...invitation,
      guests: [invitation.guests[0]],
    });
    renderPage();

    expect(await screen.findByRole("button", { name: "Send RSVP" })).toBeDisabled();
    // One person answers for themselves; the all-at-once buttons would only repeat that.
    expect(screen.queryByRole("button", { name: "Everyone is coming" })).not.toBeInTheDocument();
  });

  it("given an answer that fails to save, when it is sent, then the household is told to try again", async () => {
    vi.mocked(rsvpApi.answerInvitation).mockRejectedValue(new Error("boom"));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Send RSVP" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save your answers.");
  });

  it("given a link that does not exist, when it opens, then the page says the link is not valid", async () => {
    vi.mocked(rsvpApi.getInvitation).mockRejectedValue(new ApiError("Invitation not found", 404));

    renderPage();

    expect(await screen.findByText("This invitation link is not valid.")).toBeInTheDocument();
  });

  it("given the API is down, when the page opens, then it says the invitation could not load", async () => {
    vi.mocked(rsvpApi.getInvitation).mockRejectedValue(new Error("connection refused"));

    renderPage();

    expect(await screen.findByText("We could not load your invitation.")).toBeInTheDocument();
  });

  it("given a Spanish-speaking household, when the language is switched, then the page reads in Spanish", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Invitación para Famiglia Rossi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar respuesta" })).toBeInTheDocument();
  });
});
