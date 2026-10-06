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

  it("given everyone in the household is coming, when the page opens, then it cheers with its own picture", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...household, guests: everyone("confirmed") });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    expect(rsvpApi.getInvitation).toHaveBeenCalledWith("abc");
    expect(screen.getByText("Let's gooo! That's the spirit, see you soon 🫶")).toBeInTheDocument();
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-thanks-all.jpg");

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("¡Vamoooos! Esa es la actitud, nos vemos pronto 🫶")).toBeInTheDocument();
  });

  it("given only some of the household are coming, when the page opens, then it is sorry for the rest, with its own picture", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue(household);
    renderPage();

    expect(await screen.findByText("Well, what a shame that not everyone can enjoy this grand event 🫢")).toBeInTheDocument();
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-thanks-some.jpg");

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Bueno, una lástima que no todos puedan disfrutar de este magno evento 🫢")).toBeInTheDocument();
  });

  it("given nobody in the household is coming, when the page opens, then it jokes goodbye to them all, with its own picture", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({ ...household, guests: everyone("declined") });
    renderPage();

    expect(await screen.findByText("Fly high, we won't remember you 👀 #justkidding")).toBeInTheDocument();
    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-thanks-none.jpg");

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Vuelen alto, no los recordaremos 👀 #chistecito")).toBeInTheDocument();
  });

  it("given a guest invited alone who cannot come, when the page opens in Spanish, then the joke speaks to them alone", async () => {
    vi.mocked(rsvpApi.getInvitation).mockResolvedValue({
      ...household,
      guests: [{ ...household.guests[0], rsvpStatus: "declined" }],
    });
    renderPage();
    await screen.findByRole("heading", { name: "Thank you!" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByText("Vuela alto, no te recordaremos 👀 #chistecito")).toBeInTheDocument();
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
