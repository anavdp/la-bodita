import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 22, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("given a wedding, when settings open, then they show its title and date with the countdown it gives", () => {
    renderWithProviders(<SettingsPanel onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Wedding title")).toHaveValue("La Bodita");
    expect(screen.getByText("Thursday, October 29, 2026")).toBeInTheDocument();
    expect(screen.getByText("7 Days to Go")).toBeInTheDocument();
  });

  it("given settings open, when the title band shows, then its sticker is the hand-drawn engagement ring", () => {
    renderWithProviders(<SettingsPanel onClose={vi.fn()} />);

    const sticker = screen.getByRole("dialog").querySelector("header img");
    expect(sticker).toHaveAttribute("src", "/icons/engagement.png");
  });

  it("given a new title and date, when they are saved, then the wedding is changed and settings close", async () => {
    const saveWedding = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    renderWithProviders(<SettingsPanel onClose={onClose} />, { wedding: { saveWedding } });

    const title = screen.getByLabelText("Wedding title");
    await userEvent.clear(title);
    await userEvent.type(title, "  Vicky & Vitale ");
    await userEvent.click(screen.getByRole("button", { name: "Wedding date" }));
    await userEvent.click(screen.getByRole("button", { name: "Saturday, October 31, 2026" }));
    expect(screen.getByText("9 Days to Go")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(saveWedding).toHaveBeenCalledWith({ name: "Vicky & Vitale", wedding_date: "2026-10-31" });
    expect(onClose).toHaveBeenCalled();
  });

  it("given the date is cleared, when it is saved, then the countdown waits for a date", async () => {
    const saveWedding = vi.fn(() => Promise.resolve());
    renderWithProviders(<SettingsPanel onClose={vi.fn()} />, { wedding: { saveWedding } });

    await userEvent.click(screen.getByRole("button", { name: "Wedding date" }));
    await userEvent.click(screen.getByRole("button", { name: "No date" }));
    expect(screen.getByText("Date to be decided")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(saveWedding).toHaveBeenCalledWith({ name: "La Bodita", wedding_date: null });
  });

  it("given a blank title, when it is saved, then it asks for one and changes nothing", async () => {
    const saveWedding = vi.fn(() => Promise.resolve());
    renderWithProviders(<SettingsPanel onClose={vi.fn()} />, { wedding: { saveWedding } });

    await userEvent.clear(screen.getByLabelText("Wedding title"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Give the wedding a title");
    expect(saveWedding).not.toHaveBeenCalled();
  });

  it("given the API fails, when settings are saved, then they stay open and say so", async () => {
    const onClose = vi.fn();
    const saveWedding = vi.fn(() => Promise.reject(new Error("offline")));
    renderWithProviders(<SettingsPanel onClose={onClose} />, { wedding: { saveWedding } });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("given the planner in Spanish, when settings open, then they speak Spanish", () => {
    renderWithProviders(<SettingsPanel onClose={vi.fn()} />, { language: "es" });

    expect(screen.getByRole("dialog", { name: "Ajustes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título de la boda")).toBeInTheDocument();
    expect(screen.getByText("Faltan 7 días")).toBeInTheDocument();
  });
});
