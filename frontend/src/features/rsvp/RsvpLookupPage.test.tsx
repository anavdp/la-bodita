import { screen, within } from "@testing-library/react";
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

async function searchFor(name: string) {
  await userEvent.type(screen.getByRole("textbox", { name: "Full name" }), name);
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
}

describe("RsvpLookupPage", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given a name that matches one household, when it is looked up, then that household's invitation opens", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([rossi]);
    renderPage();

    await searchFor("Maria Rossi");

    expect(await screen.findByText("Opened invitation rossi-token")).toBeInTheDocument();
    expect(rsvpApi.lookUpInvitation).toHaveBeenCalledWith("Maria Rossi");
  });

  it("given a name shared by several households, when it is looked up, then the guest picks theirs by who is in it", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([rossi, otherMaria]);
    renderPage();

    await searchFor("Maria Rossi");

    expect(await screen.findByText("We found more than one person with that name. Which is your family?")).toBeInTheDocument();
    // Only who is in each household: its own name is for the couple's planning.
    expect(screen.queryByText("Famiglia Rossi")).not.toBeInTheDocument();
    const choice = screen.getByRole("button", { name: "Maria Rossi, Paolo Rossi" });
    // An option to pick, not a heading: regular weight.
    expect(within(choice).getByText("Maria Rossi, Paolo Rossi")).not.toHaveClass("font-label-lg");
    await userEvent.click(choice);
    expect(await screen.findByText("Opened invitation rossi-token")).toBeInTheDocument();
  });

  it("given a name nobody is invited under, when it is looked up, then the guest is asked to check the spelling", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockResolvedValue([]);
    renderPage();

    await searchFor("Mario Bianchi");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't find that name. Check the spelling, or contact us.",
    );
  });

  it("given too many lookups, when another is made, then the guest is asked to wait a minute", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockRejectedValue(new ApiError("Too many lookups", 429));
    renderPage();

    await searchFor("Maria Rossi");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many searches. Please wait a minute and try again.",
    );
  });

  it("given the API is unreachable, when a name is looked up, then the guest is told it failed", async () => {
    vi.mocked(rsvpApi.lookUpInvitation).mockRejectedValue(new Error("network down"));
    renderPage();

    await searchFor("Maria Rossi");

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not run the search.");
  });

  it("given the page, when it opens, then it asks for the full name in a single box", () => {
    renderPage();

    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveAttribute("placeholder", "e.g. Ana García");
    expect(screen.getByText("We'd love to have you with us. Enter your full name and let us know if you can join us.")).toBeInTheDocument();
  });

  it("given less than two letters, when the guest tries to search, then the search cannot be sent", async () => {
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: "Full name" }), " R ");

    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("given the page in English, when the language is switched, then it reads in Spanish", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByRole("heading", { name: "Dinos si vienes" })).toBeInTheDocument();
    expect(
      screen.getByText("Nos gustaría contar con tu presencia. Introduce tu nombre y apellido y confírmanos si nos acompañas."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nombre y apellido" })).toHaveAttribute("placeholder", "Ej.: Ana García");
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("given the lookup page, when it opens, then its own picture sits above the search", () => {
    renderPage();

    const picture = screen.getByRole("presentation");
    expect(picture).toHaveAttribute("src", "/rsvp-lookup.jpg");
    // Phones get their own crop, with paper under the arches so the card leaves the names in view.
    expect(picture.parentElement?.querySelector("source")).toHaveAttribute("srcset", "/rsvp-lookup-phone.jpg");
  });

  it("given the lookup page, when it opens, then the wedding date shows with the title", () => {
    renderPage();

    const title = screen.getByRole("heading", { name: "Let us know if you're coming" });
    const date = screen.getByText("August 14, 2027");
    expect(title.parentElement).toContainElement(date);
    expect(date).not.toHaveClass("text-secondary-container");
    expect(screen.queryByText(/will take place/)).not.toBeInTheDocument();
  });
});
