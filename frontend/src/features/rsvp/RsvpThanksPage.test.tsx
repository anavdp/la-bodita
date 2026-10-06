import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

import * as rsvpApi from "../../api/rsvp";
import type { RsvpInvitation } from "../../api/types";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { RsvpThanksPage } from "./RsvpThanksPage";

vi.mock("../../api/rsvp");

const household: RsvpInvitation = {
  householdName: "Famiglia Rossi",
  weddingName: "La Bodita",
  weddingDate: "2026-10-29",
  guests: [
    { id: 1, firstName: "Maria", lastName: "Rossi", rsvpStatus: "confirmed" },
    { id: 2, firstName: "Paolo", lastName: "Rossi", rsvpStatus: "declined" },
  ],
  greeting: "family",
};

const everyone = (rsvpStatus: "confirmed" | "declined") => household.guests.map((guest) => ({ ...guest, rsvpStatus }));

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/rsvp/:token/gracias" element={<RsvpThanksPage />} />
      <Route path="/rsvp/:token" element={<p>Invitation page</p>} />
    </Routes>,
    { route: "/rsvp/abc/gracias" },
  );
}

describe("RsvpThanksPage", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given at least one member is coming, when the page opens, then it celebrates with its own picture", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue(household);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    expect(rsvpApi.getInvitation).toHaveBeenCalledWith("abc");
    expect(screen.getByText("We're so happy you're coming! We'll send you more details very soon.")).toBeInTheDocument();
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-thanks-yes.jpg");
  });

  it("given nobody in the household is coming, when the page opens, then it says they will be missed, with its own picture", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...household, guests: everyone("declined") });
    renderPage();

    expect(await screen.findByText("We'll miss you. Thank you for letting us know.")).toBeInTheDocument();
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-thanks-no.jpg");
  });

  it("given a household, when the page opens in Spanish, then it speaks to them in the plural", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...household, guests: everyone("confirmed") });
    renderPage();
    await screen.findByRole("heading", { name: "Thank you!" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByRole("heading", { name: "¡Gracias!" })).toBeInTheDocument();
    expect(screen.getByText("¡Qué alegría que vengan! Muy pronto les enviaremos más detalles.")).toBeInTheDocument();
  });

  it("given a guest invited alone who cannot come, when the page opens in Spanish, then it speaks to them alone", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      ...household,
      guests: [{ ...household.guests[0], rsvpStatus: "declined" }],
    });
    renderPage();
    await screen.findByRole("heading", { name: "Thank you!" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Te vamos a extrañar. Gracias por avisarnos.")).toBeInTheDocument();
  });

  it("given a guest who changed their mind, when they follow the link, then they are back on their invitation", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue(household);
    renderPage();

    await userEvent.click(await screen.findByRole("link", { name: "Change my answer" }));

    expect(screen.getByText("Invitation page")).toBeInTheDocument();
  });

  it("given a link that does not exist, when the page opens, then it says the link is not valid", async () => {
    const { ApiError } = await import("../../api/client");
    vi.mocked(rsvpApi.getInvitation).mockRejectedValue(new ApiError("Invitation not found", 404));
    renderPage();

    expect(await screen.findByText("This invitation link is not valid.")).toBeInTheDocument();
  });
});
