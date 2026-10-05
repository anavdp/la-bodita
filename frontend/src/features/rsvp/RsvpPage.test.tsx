import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "../../api/client";
import * as rsvpApi from "../../api/rsvp";
import type { RsvpInvitation } from "../../api/types";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { RsvpPage } from "./RsvpPage";

vi.mock("../../api/rsvp");

/** A sentence that is split across elements (its bold parts), matched as one paragraph. */
const withText = (sentence: string) => (_content: string, element: Element | null) =>
  element?.tagName === "P" && element.textContent === sentence;

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
    expect(within(maria).getByRole("radio", { name: "I'll be there" })).not.toBeChecked();
    expect(within(maria).getByRole("radio", { name: "I can't make it" })).not.toBeChecked();
    const paolo = screen.getByRole("group", { name: "Paolo Rossi" });
    expect(within(paolo).getByRole("radio", { name: "I can't make it" })).toBeChecked();
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
      within(await screen.findByRole("group", { name: "Maria Rossi" })).getByRole("radio", { name: "I'll be there" }),
    );
    await userEvent.click(
      within(screen.getByRole("group", { name: "Paolo Rossi" })).getByRole("radio", { name: "I'll be there" }),
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

    await userEvent.click(await screen.findByRole("button", { name: "We're all coming" }));

    for (const name of ["Maria Rossi", "Paolo Rossi"]) {
      expect(within(screen.getByRole("group", { name })).getByRole("radio", { name: "I'll be there" })).toBeChecked();
    }
    expect(rsvpApi.answerInvitation).not.toHaveBeenCalled();
  });

  it("given a household that cannot come, when no one is marked at once, then every member is set to not attending", async () => {
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "None of us can make it" }));

    for (const name of ["Maria Rossi", "Paolo Rossi"]) {
      expect(within(screen.getByRole("group", { name })).getByRole("radio", { name: "I can't make it" })).toBeChecked();
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
    expect(screen.queryByRole("button", { name: "We're all coming" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Vamos todos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nadie podrá ir" })).toBeInTheDocument();
    const maria = screen.getByRole("group", { name: "Maria Rossi" });
    expect(within(maria).getByRole("radio", { name: "Iré" })).toBeInTheDocument();
    expect(within(maria).getByRole("radio", { name: "No puedo ir" })).toBeInTheDocument();
  });

  it("given a household link, when it opens, then a banner picture crowns the invitation", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-banner.jpg");
  });

  it("given a household of several, when it opens, then they are asked together to answer by the deadline, in bold", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(
      screen.getByText(withText("We'll send you more information about La Bodita very soon. For now, please let us know whether you can come by January 1, 2027.")),
    ).toBeInTheDocument();
    expect(screen.getByText("January 1, 2027").tagName).toBe("STRONG");

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      screen.getByText(withText("Les enviaremos más información sobre La Bodita muy pronto. Por ahora, por favor confírmennos si podrán asistir antes del 1 de enero de 2027.")),
    ).toBeInTheDocument();
    expect(screen.getByText("1 de enero de 2027").tagName).toBe("STRONG");
  });

  it("given a guest invited alone, when they open their link, then the deadline speaks to them alone", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...invitation, guests: [invitation.guests[0]] });
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      screen.getByText(withText("Te enviaremos más información sobre La Bodita muy pronto. Por ahora, por favor confírmanos si podrás asistir antes del 1 de enero de 2027.")),
    ).toBeInTheDocument();
  });

  it("given a household link, when it opens, then the date and place stand out, and the record's own date is not shown", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(screen.getByText(withText("La Bodita will take place on August 14, 2027, in Araure, Venezuela."))).toBeInTheDocument();
    expect(screen.getByText("August 14, 2027").tagName).toBe("STRONG");
    expect(screen.getByText("Araure, Venezuela").tagName).toBe("STRONG");
    // The wedding record holds an older date, so guests never see two.
    expect(screen.queryByText("29 October 2026")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText(withText("La Bodita se celebrará el 14 de agosto de 2027 en Araure, Venezuela."))).toBeInTheDocument();
  });

  it("given a household link, when it opens, then there is no extra instruction line under the deadline", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(screen.queryByText(/Each person answers for themselves/)).not.toBeInTheDocument();
  });
});
