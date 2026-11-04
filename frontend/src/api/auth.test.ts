import {
  getPhoneKey,
  getSignedInUser,
  googleSignInUrl,
  makePhoneKey,
  removePhoneKey,
  signOut,
  updateDisplayName,
} from "./auth";

function respondWith(body: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status }));
}

describe("auth api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a session, when the signed-in user is asked for, then their name and email come back", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      respondWith({ email: "vicky@example.com", display_name: "Vicky" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSignedInUser()).resolves.toEqual({ email: "vicky@example.com", displayName: "Vicky" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/auth/me");
  });

  it("given a signed-in user, when they rename themselves, then only the name is sent and the account comes back", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      respondWith({ email: "vicky@example.com", display_name: "Vicky De Palma" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateDisplayName("Vicky De Palma")).resolves.toEqual({
      email: "vicky@example.com",
      displayName: "Vicky De Palma",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/auth/me");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ display_name: "Vicky De Palma" });
  });

  it("given a signed-in browser, when it signs out, then the session is ended on the server", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await signOut();

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/auth/logout");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("given the login page, when Google sign-in is offered, then it points at the API's start", () => {
    expect(googleSignInUrl()).toBe("http://localhost:8000/api/auth/google/start");
  });

  it("given no phone key, when it is asked about, then it says there is none", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respondWith({ created_at: null })));

    await expect(getPhoneKey()).resolves.toEqual({ createdAt: null });
  });

  it("given a signed-in user, when they make a phone key, then the new key comes back once", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith({ key: "k3y" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(makePhoneKey()).resolves.toBe("k3y");
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/auth/phone-key");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("given a phone key, when it is removed, then the server forgets it", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await removePhoneKey();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
