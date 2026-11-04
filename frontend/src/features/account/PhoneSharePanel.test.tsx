import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { getPhoneKey, makePhoneKey, removePhoneKey } from "../../api/auth";
import { renderWithProviders } from "../../testing/renderWithProviders";
import { PhoneSharePanel } from "./PhoneSharePanel";

vi.mock("../../api/auth");

describe("PhoneSharePanel", () => {
  beforeEach(() => {
    vi.mocked(getPhoneKey).mockResolvedValue({ createdAt: null });
    vi.mocked(makePhoneKey).mockResolvedValue("s3cret-key");
    vi.mocked(removePhoneKey).mockResolvedValue();
  });

  it("given no phone key, when the panel opens, then it offers to make one and lists the Shortcut steps", async () => {
    renderWithProviders(<PhoneSharePanel onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Share from your iPhone" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Make a phone key" })).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: /Build the Shortcut/ });
    expect(within(steps).getAllByRole("listitem").length).toBeGreaterThanOrEqual(6);
    expect(steps).toHaveTextContent("http://localhost:8000/api/share/items");
    expect(steps).toHaveTextContent("Show in Share Sheet");
  });

  it("given no phone key, when one is made, then it is shown once with a copy button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PhoneSharePanel onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "Make a phone key" }));

    expect(screen.getByLabelText("Your phone key")).toHaveValue("Bearer s3cret-key");
    expect(screen.getByText(/only this once/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy the key" }));
    await expect(navigator.clipboard.readText()).resolves.toBe("Bearer s3cret-key");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("given a phone key, when the panel opens, then it says when it was made and can replace or remove it", async () => {
    vi.mocked(getPhoneKey).mockResolvedValue({ createdAt: "2026-11-03T22:10:00Z" });
    const user = userEvent.setup();
    renderWithProviders(<PhoneSharePanel onClose={vi.fn()} />);

    expect(await screen.findByText(/Your iPhone has a key since/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make a new key" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Turn sharing off" }));

    expect(removePhoneKey).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Make a phone key" })).toBeInTheDocument();
  });

  it("given the API fails, when a key is made, then it says so", async () => {
    vi.mocked(makePhoneKey).mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderWithProviders(<PhoneSharePanel onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "Make a phone key" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that");
  });

  it("given the panel is open, when it is closed, then it goes away", async () => {
    const onClose = vi.fn();
    renderWithProviders(<PhoneSharePanel onClose={onClose} />);

    await userEvent.click(await screen.findByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("given the planner in Spanish, when the panel opens, then it speaks Spanish", async () => {
    renderWithProviders(<PhoneSharePanel onClose={vi.fn()} />, { language: "es" });

    expect(screen.getByRole("dialog", { name: "Compartir desde tu iPhone" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Crear una llave del móvil" })).toBeInTheDocument();
  });
});
