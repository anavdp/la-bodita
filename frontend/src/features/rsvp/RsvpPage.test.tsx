import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

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
  greeting: "general",
};

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/rsvp/:token" element={<RsvpPage />} />
      <Route path="/rsvp/:token/gracias" element={<p>Thank-you page</p>} />
    </Routes>,
    { route: "/rsvp/abc" },
  );
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
    // The household's own name is for the couple's planning, not for guests.
    expect(screen.queryByText(/Famiglia Rossi/)).not.toBeInTheDocument();
    const maria = screen.getByRole("group", { name: "Maria Rossi" });
    expect(within(maria).getByRole("radio", { name: "I'll be there" })).not.toBeChecked();
    expect(within(maria).getByRole("radio", { name: "I can't make it" })).not.toBeChecked();
    const paolo = screen.getByRole("group", { name: "Paolo Rossi" });
    expect(within(paolo).getByRole("radio", { name: "I can't make it" })).toBeChecked();
  });

  it("given members' answers, when they are sent, then each member's own yes or no is saved and the thank-you page opens", async () => {
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
    expect(await screen.findByText("Thank-you page")).toBeInTheDocument();
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

    expect(screen.getByText("Les enviaremos más información sobre La Bodita muy pronto.")).toBeInTheDocument();
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

  it("given a photo address is configured, when the link opens, then the banner comes from there", async () => {
    vi.stubEnv("VITE_PHOTOS_URL", "https://photos.example");
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(screen.getByRole("presentation")).toHaveAttribute("src", "https://photos.example/rsvp-banner.jpg");
    vi.unstubAllEnvs();
  });

  it("given a household link, when it opens, then the title and send button share the muted periwinkle", async () => {
    renderPage();
    const title = await screen.findByRole("heading", { name: "La Bodita" });

    expect(title).toHaveClass("text-on-secondary-fixed-variant");
    expect(screen.getByRole("button", { name: "Send RSVP" })).toHaveClass("bg-on-secondary-fixed-variant");
  });

  it("given a household link, when a member picks an answer, then it lights up in the light periwinkle", async () => {
    renderPage();
    const maria = within(await screen.findByRole("group", { name: "Maria Rossi" }));

    await userEvent.click(maria.getByRole("radio", { name: "I'll be there" }));

    expect(maria.getByText("I'll be there")).toHaveClass("peer-checked:bg-primary-container");
  });

  it("given a household link, when it opens, then the page uses the guests' own typeface rather than the planner's", async () => {
    renderPage();
    const title = await screen.findByRole("heading", { name: "La Bodita" });

    expect(title.closest("main")).toHaveClass("font-guest");
  });

  it("given a household link, when it opens, then the language switch sits on the card, not on the photo", async () => {
    renderPage();
    const title = await screen.findByRole("heading", { name: "La Bodita" });

    expect(title.closest(".organic-shape-1")).toContainElement(screen.getByRole("button", { name: "Español" }));
  });

  it("given a household link, when it opens, then the wedding date sits under the title", async () => {
    renderPage();
    const title = await screen.findByRole("heading", { name: "La Bodita" });

    expect(title.parentElement).toHaveClass("flex-col");
    expect(title.nextElementSibling).toHaveTextContent("14 · 08 · 2027");
  });

  it("given a household link, when it opens, then the photo spans the screen and the invitation card overlaps it", async () => {
    renderPage();
    const title = await screen.findByRole("heading", { name: "La Bodita" });

    const photo = screen.getByRole("presentation");
    // Edge to edge, framed on its upper part where faces usually sit.
    expect(photo).toHaveClass("w-full", "object-cover", "object-[center_35%]");
    expect(photo).not.toHaveClass("max-w-xl");
    // The card is pulled up over the bottom of the photo, less on a phone where the photo is shorter.
    expect(title.closest(".organic-shape-1")?.parentElement).toHaveClass("-mt-12", "sm:-mt-20");
  });

  it("given a household of several, when it opens, then a banner asks them together to answer by the deadline", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(screen.getByText("We'll send you more information about La Bodita very soon.")).toBeInTheDocument();
    const banner = screen.getByRole("note");
    expect(banner).toHaveTextContent("Please let us know whether you can come by January 1, 2027.");
    expect(within(banner).getByText("January 1, 2027").tagName).toBe("STRONG");

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Les enviaremos más información sobre La Bodita muy pronto.")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Por favor confírmennos si podrán asistir antes del 1 de Enero de 2027.",
    );
  });

  it("given a guest invited alone, when they open their link, then the note and banner speak to them alone", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...invitation, guests: [invitation.guests[0]] });
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Te enviaremos más información sobre La Bodita muy pronto.")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Por favor confírmanos si podrás asistir antes del 1 de Enero de 2027.",
    );
  });

  it("given a household link, when it opens, then the wedding date shows with the title, and only once", async () => {
    renderPage();
    const title = await screen.findByRole("heading", { name: "La Bodita" });

    const date = screen.getByText("14 · 08 · 2027");
    expect(title.parentElement).toContainElement(date);
    expect(date).not.toHaveClass("text-secondary-container");
    expect(screen.queryByText(/will take place/)).not.toBeInTheDocument();
    // The wedding record holds an older date, so guests never see two.
    expect(screen.queryByText("29 October 2026")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    // Written the same way in both languages, like the save-the-date.
    expect(screen.getByText("14 · 08 · 2027")).toBeInTheDocument();
    expect(screen.queryByText(/se celebrará/)).not.toBeInTheDocument();
  });

  it("given a household link, when it opens, then there is no extra instruction line under the deadline", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(screen.queryByText(/Each person answers for themselves/)).not.toBeInTheDocument();
  });

  it("given a household with family in it, when it opens, then it is greeted as family", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...invitation, greeting: "family" });
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(
      screen.getByText(
        "Dear family, it would make us so happy to have you with us on this very special day. We need to know if we can count on you.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("We'll send you more information about La Bodita very soon.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      screen.getByText(
        "Hola, querida familia: nos haría muy felices contar con su presencia en este día tan especial para nosotros. Necesitamos saber si contamos con ustedes.",
      ),
    ).toBeInTheDocument();
  });

  it("given a family member invited alone, when they open their link, then the family greeting speaks to them alone", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...invitation, guests: [invitation.guests[0]], greeting: "family" });
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      screen.getByText(
        "Hola, querida familia: nos haría muy felices contar con tu presencia en este día tan especial para nosotros. Necesitamos saber si contamos contigo.",
      ),
    ).toBeInTheDocument();
  });

  it("given a household of friends, when it opens, then it is greeted as friends", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...invitation, greeting: "friends" });
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    expect(
      screen.getByText(
        "Amiguiss/Friendchiss! The most awaited event of the year has finally arrived: our beautiful union. We hope you'll be there and won't let us down.",
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      screen.getByText(
        "¡Amiguiss/Friendchiss! Finalmente llegó el evento más esperado del año: nuestra hermosa unión. Esperamos contar con ustedes y que no nos fallen.",
      ),
    ).toBeInTheDocument();
  });

  it("given a friend invited alone, when they open their link, then the friends greeting speaks to them alone", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...invitation, guests: [invitation.guests[0]], greeting: "friends" });
    renderPage();
    await screen.findByRole("heading", { name: "La Bodita" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      screen.getByText(
        "¡Amiguiss/Friendchiss! Finalmente llegó el evento más esperado del año: nuestra hermosa unión. Esperamos contar contigo y que no nos falles.",
      ),
    ).toBeInTheDocument();
  });
});
