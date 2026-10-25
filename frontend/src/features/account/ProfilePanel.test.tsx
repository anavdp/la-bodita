import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../testing/renderWithProviders";
import { ProfilePanel } from "./ProfilePanel";

describe("ProfilePanel", () => {
  it("given a signed-in user, when their profile opens, then the name is editable and the sign-in email is not", () => {
    renderWithProviders(<ProfilePanel onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Your profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Vicky");
    expect(screen.getByLabelText("Email")).toHaveValue("vicky@example.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByText(/the Google account you sign in with/)).toBeInTheDocument();
  });

  it("given a new name, when it is saved, then the account is renamed and the profile closes", async () => {
    const saveDisplayName = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    renderWithProviders(<ProfilePanel onClose={onClose} />, { auth: { saveDisplayName } });

    const name = screen.getByLabelText("Your name");
    await userEvent.clear(name);
    await userEvent.type(name, "  Vicky De Palma ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(saveDisplayName).toHaveBeenCalledWith("Vicky De Palma");
    expect(onClose).toHaveBeenCalled();
  });

  it("given a blank name, when it is saved, then it asks for one and changes nothing", async () => {
    const saveDisplayName = vi.fn(() => Promise.resolve());
    renderWithProviders(<ProfilePanel onClose={vi.fn()} />, { auth: { saveDisplayName } });

    await userEvent.clear(screen.getByLabelText("Your name"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Tell us your name");
    expect(saveDisplayName).not.toHaveBeenCalled();
  });

  it("given the API fails, when the name is saved, then the profile stays open and says so", async () => {
    const onClose = vi.fn();
    const saveDisplayName = vi.fn(() => Promise.reject(new Error("offline")));
    renderWithProviders(<ProfilePanel onClose={onClose} />, { auth: { saveDisplayName } });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not save that");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("given the profile is open, when it is cancelled, then it closes without saving", async () => {
    const saveDisplayName = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    renderWithProviders(<ProfilePanel onClose={onClose} />, { auth: { saveDisplayName } });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(saveDisplayName).not.toHaveBeenCalled();
  });

  it("given the planner in Spanish, when the profile opens, then it speaks Spanish", () => {
    renderWithProviders(<ProfilePanel onClose={vi.fn()} />, { language: "es" });

    expect(screen.getByRole("dialog", { name: "Tu perfil" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
  });
});
