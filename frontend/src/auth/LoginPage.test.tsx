import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import * as authApi from "../api/auth";
import { ApiError } from "../api/client";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { AuthProvider } from "./AuthProvider";
import { LoginPage } from "./LoginPage";

vi.mock("../api/auth", async () => {
  const actual = await vi.importActual<typeof import("../api/auth")>("../api/auth");
  return { ...actual, getSignedInUser: vi.fn(), signOut: vi.fn() };
});

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>the planner</p>} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(authApi.getSignedInUser).mockRejectedValue(new ApiError("Sign in", 401));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("given someone signed out, when the login page opens, then it offers Google sign-in", async () => {
    renderAt("/login");

    const button = await screen.findByRole("link", { name: /Sign in with Google/ });
    expect(button).toHaveAttribute("href", "http://localhost:8000/api/auth/google/start");
    expect(screen.getByRole("heading", { name: "La Bodita" })).toBeInTheDocument();
  });

  it.each([
    ["not_allowed", /isn't on the guest list for this planner/],
    ["cancelled", /Sign-in was cancelled/],
    ["failed", /Something went wrong signing in/],
    ["not_configured", /Google sign-in isn't set up yet/],
    ["mystery", /Something went wrong signing in/],
  ])("given Google sent back %s, when the page opens, then it explains what happened", async (error, message) => {
    renderAt(`/login?error=${error}`);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("given the couple reads Spanish, when they switch language, then the page follows", async () => {
    renderAt("/login");

    await userEvent.click(await screen.findByRole("button", { name: "Language: EN" }));

    expect(screen.getByRole("link", { name: /Entrar con Google/ })).toBeInTheDocument();
  });

  it("given someone already signed in, when the login page opens, then they go straight to the planner", async () => {
    vi.mocked(authApi.getSignedInUser).mockResolvedValue({ email: "vicky@example.com", displayName: "Vicky" });

    renderAt("/login");

    expect(await screen.findByText("the planner")).toBeInTheDocument();
  });
});
