import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useParams } from "react-router-dom";

import { ApiError } from "../../api/client";
import * as rsvpApi from "../../api/rsvp";
import type { RsvpHouseholdMatch } from "../../api/types";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { RsvpLookupPage } from "./RsvpLookupPage";

vi.mock("../../api/rsvp");

const rossi: RsvpHouseholdMatch = {
  token: "rossi-token",
  name: "Famiglia Rossi",
  members: [
    { firstName: "Maria", lastName: "Rossi" },
    { firstName: "Paolo", lastName: "Rossi" },
  ],
};

const otherMaria: RsvpHouseholdMatch = {
  token: "other-token",
  name: "Maria Rossi",
  members: [{ firstName: "Maria", lastName: "Rossi" }],
};

/** Stands in for the household page, to show where the lookup sent the guest. */
function OpenedInvitation() {
  const { token } = useParams();
  return <p>Opened invitation {token}</p>;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/rsvp" element={<RsvpLookupPage />} />
      <Route path="/rsvp/:token" element={<OpenedInvitation />} />
    </Routes>,
    { route: "/rsvp" },
  );
}

async function searchFor(firstName: string, lastName: string) {
  await userEvent.type(screen.getByRole("textbox", { name: "First name" }), firstName);
  await userEvent.type(screen.getByRole("textbox", { name: "Last name" }), lastName);
  await userEvent.click(screen.getByRole("button", { name: "Find my invitation" }));
}

describe("RsvpLookupPage", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given a name that matches one household, when it is looked up, then that household's invitation opens", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([rossi]);
    renderPage();

    await searchFor("Maria", "Rossi");

    expect(await screen.findByText("Opened invitation rossi-token")).toBeInTheDocument();
    expect(rsvpApi.lookUpInvitation).toHaveBeenCalledWith("Maria", "Rossi");
  });

  it("given a name shared by several households, when it is looked up, then the guest picks theirs by who is in it", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([rossi, otherMaria]);
    renderPage();

    await searchFor("Maria", "Rossi");

    expect(await screen.findByText("We found more than one invitation. Which one is yours?")).toBeInTheDocument();
    // Only who is in each household: its own name is for the couple's planning.
    expect(screen.queryByText("Famiglia Rossi")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Maria Rossi, Paolo Rossi" }));
    expect(await screen.findByText("Opened invitation rossi-token")).toBeInTheDocument();
  });

  it("given a name nobody is invited under, when it is looked up, then the guest is asked to check the spelling", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([]);
    renderPage();

    await searchFor("Mario", "Bianchi");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't find your invitation. Check the spelling, or contact us.",
    );
  });

  it("given too many lookups, when another is made, then the guest is asked to wait a minute", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockRejectedValue(new ApiError("Too many lookups", 429));
    renderPage();

    await searchFor("Maria", "Rossi");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many searches. Please wait a minute and try again.",
    );
  });

  it("given the API is unreachable, when a name is looked up, then the guest is told it failed", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockRejectedValue(new Error("network down"));
    renderPage();

    await searchFor("Maria", "Rossi");

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not search for your invitation.");
  });

  it("given only a first name, when the guest tries to search, then the search cannot be sent", async () => {
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: "First name" }), "Maria");
    await userEvent.type(screen.getByRole("textbox", { name: "Last name" }), "   ");

    expect(screen.getByRole("button", { name: "Find my invitation" })).toBeDisabled();
  });

  it("given the page in English, when the language is switched, then it reads in Spanish", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar mi invitación" })).toBeInTheDocument();
  });

  it("given the lookup page, when it opens, then its own picture sits above the search", () => {
    renderPage();

    expect(screen.getByRole("presentation")).toHaveAttribute("src", "/rsvp-lookup.jpg");
  });

  it("given the lookup page, when it opens, then the wedding date shows with the title", () => {
    renderPage();

    const title = screen.getByRole("heading", { name: "Find your invitation" });
    const date = screen.getByText("August 14, 2027");
    expect(title.parentElement).toContainElement(date);
    expect(date).not.toHaveClass("text-secondary-container");
    expect(screen.queryByText(/will take place/)).not.toBeInTheDocument();
  });
});
