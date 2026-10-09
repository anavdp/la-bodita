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
  await userEvent.type(screen.getByRole("textbox", { name: "Type your full name" }), name);
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
    expect(screen.getByRole("textbox", { name: "Type your full name" })).toHaveAttribute("placeholder", "e.g. Ana García");
    // The steps say what to do now; no separate prompt line above the box.
    expect(screen.queryByText(/We'd love to have you with us/)).not.toBeInTheDocument();
  });

  it("given less than two letters, when the guest tries to search, then the search cannot be sent", async () => {
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: "Type your full name" }), " R ");

    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("given the page in English, when the language is switched, then it reads in Spanish", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByRole("heading", { name: "Bienvenidos a La Bodita" })).toBeInTheDocument();
    expect(
      screen.getByText("¡Hola a todos! Estamos planificando nuestro gran día y queremos que sean parte de él."),
    ).toBeInTheDocument();
    expect(screen.getByText("— Gerardo y Vicky")).toBeInTheDocument();
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps[0]).toHaveTextContent("Confirmen aquí antes del 1 de Enero de 2027");
    expect(steps[0]).toHaveTextContent("…o asumiremos que no vienen 😄");
    expect(steps[1]).toHaveTextContent("Les enviaremos la invitación completa con todos los detalles");
    expect(steps[2]).toHaveTextContent("Nos vemos en Araure, Venezuela, el 14 · 08 · 2027");
    expect(screen.getByRole("textbox", { name: "Escribe tu nombre y apellido" })).toHaveAttribute("placeholder", "Ej.: Ana García");
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("given the lookup page, when it opens, then its own picture sits above the search", () => {
    renderPage();

    const picture = screen.getByRole("presentation");
    expect(picture).toHaveAttribute("src", "/rsvp-lookup.jpg");
    // Phones get their own crop, with paper under the arches so the card leaves the names in view.
    expect(picture.parentElement?.querySelector("source")).toHaveAttribute("srcset", "/rsvp-lookup-phone.jpg");
  });

  it("given the lookup page, when it opens, then the couple welcomes everyone and signs it", () => {
    renderPage();

    expect(
      screen.getByText("Hi everyone! We're planning our big day and we want you to be part of it."),
    ).toBeInTheDocument();
    // Signed like a letter: on the right, under the message.
    expect(screen.getByText("— Gerardo & Vicky")).toHaveClass("font-bold", "text-on-secondary-fixed-variant", "text-right");
  });

  it("given the lookup page, when it opens, then three numbered steps lead from answering to the wedding", () => {
    renderPage();

    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Let us know here by January 1, 2027");
    expect(within(steps[0]).getByText("January 1, 2027").tagName).toBe("STRONG");
    expect(within(steps[0]).getByText("…or we'll assume you're not coming 😄")).toHaveClass("text-on-surface-variant");
    expect(steps[1]).toHaveTextContent("We'll send you the full invitation with all the details");
    expect(steps[2]).toHaveTextContent("See you in Araure, Venezuela, on 14 · 08 · 2027");
    expect(within(steps[2]).getByText("Araure, Venezuela").tagName).toBe("STRONG");
    expect(within(steps[2]).getByText("14 · 08 · 2027").tagName).toBe("STRONG");
    // Each step's number sits in its own circle; the list itself already reads as numbered.
    steps.forEach((step, index) => {
      expect(within(step).getByText(String(index + 1))).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("given the lookup page, when it opens, then the title stands alone, with the date carried by the last step", () => {
    renderPage();

    const title = screen.getByRole("heading", { name: "Welcome to La Bodita" });
    expect(title.parentElement).not.toHaveTextContent("14 · 08 · 2027");
    expect(screen.getAllByText("14 · 08 · 2027")).toHaveLength(1);
    // "Bienvenidos" alone is wider than the room beside the language switch at 40px on a phone.
    expect(title).toHaveClass("text-[32px]", "sm:text-[40px]");
    expect(screen.queryByText(/will take place/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Each person answers for themselves/)).not.toBeInTheDocument();
  });

  it("given the lookup page, when it opens, then the steps are introduced as what comes next", async () => {
    renderPage();

    expect(screen.getByRole("list").previousElementSibling).toHaveTextContent("Next steps:");

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(screen.getByRole("list").previousElementSibling).toHaveTextContent("Siguientes pasos:");
  });
});
