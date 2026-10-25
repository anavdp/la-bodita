import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import * as authApi from "../api/auth";
import { ApiError, request } from "../api/client";
import { AuthProvider, RequireSignIn, useAuth } from "./AuthProvider";

vi.mock("../api/auth");

function Planner() {
  const { user, signOut } = useAuth();
  return (
    <>
      <p>planner for {user?.displayName}</p>
      <button type="button" onClick={() => void signOut()}>
        out
      </button>
      <button type="button" onClick={() => void request("/api/weddings").catch(() => undefined)}>
        call
      </button>
    </>
  );
}

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<RequireSignIn />}>
            <Route path="/guests" element={<Planner />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("given no session, when a planner screen is opened, then the login page shows instead", async () => {
    vi.mocked(authApi.getSignedInUser).mockRejectedValue(new ApiError("Sign in", 401));

    renderAt("/guests");

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("given a session, when a planner screen is opened, then it shows for the signed-in user", async () => {
    vi.mocked(authApi.getSignedInUser).mockResolvedValue({ email: "vicky@example.com", displayName: "Vicky" });

    renderAt("/guests");

    expect(await screen.findByText("planner for Vicky")).toBeInTheDocument();
  });

  it("given the API cannot be reached, when the session is checked, then the login page shows rather than the planner", async () => {
    vi.mocked(authApi.getSignedInUser).mockRejectedValue(new Error("offline"));

    renderAt("/guests");

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("given a signed-in user, when they sign out, then the login page shows", async () => {
    vi.mocked(authApi.getSignedInUser).mockResolvedValue({ email: "vicky@example.com", displayName: "Vicky" });
    vi.mocked(authApi.signOut).mockResolvedValue(undefined);
    renderAt("/guests");

    await userEvent.click(await screen.findByRole("button", { name: "out" }));

    expect(authApi.signOut).toHaveBeenCalled();
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("given a session that runs out mid-visit, when a call answers 401, then the login page shows", async () => {
    vi.mocked(authApi.getSignedInUser).mockResolvedValue({ email: "vicky@example.com", displayName: "Vicky" });
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("{}", { status: 401 })));
    renderAt("/guests");

    await userEvent.click(await screen.findByRole("button", { name: "call" }));

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("given no provider, when the hook is used, then it says where it belongs", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Planner />)).toThrow("useAuth must be used inside an AuthProvider");
  });
});
