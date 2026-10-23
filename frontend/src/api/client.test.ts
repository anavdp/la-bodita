import { ApiError, apiUrl, onUnauthorized, request } from "./client";

function respondWith(body: unknown, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  return Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a path, when it is requested, then it is called against the API base url", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith([{ id: 1 }]));
    vi.stubGlobal("fetch", fetchMock);

    await request("/api/weddings");

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings");
  });

  it("given a body, when it is sent, then it goes as JSON", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await request("/api/weddings/1/guests", { method: "POST", body: { first_name: "Maria" } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ first_name: "Maria" }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("given a file upload, when it is sent, then the browser is left to set the multipart headers", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith({ rows: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const form = new FormData();
    form.append("file", new File(["first_name"], "guests.csv"));

    await request("/api/weddings/1/guests/import/preview", { method: "POST", body: form });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("given a path, when it is turned into a link, then it points at the API base url", () => {
    expect(apiUrl("/api/weddings/1/guests/import/template")).toBe(
      "http://localhost:8000/api/weddings/1/guests/import/template",
    );
  });

  it("given a successful response, when it is parsed, then the payload is returned", async () => {
    vi.stubGlobal("fetch", () => respondWith({ id: 7, name: "La Bodita" }));

    await expect(request<{ id: number }>("/api/weddings")).resolves.toEqual({
      id: 7,
      name: "La Bodita",
    });
  });

  it("given a 204, when it is parsed, then nothing is returned and no body is read", async () => {
    vi.stubGlobal("fetch", () => respondWith(null, { status: 204 }));

    await expect(request("/api/weddings/1/guests/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("given an error response, when it carries a detail, then that detail becomes the message", async () => {
    vi.stubGlobal("fetch", () => respondWith({ detail: "Guest not found" }, { status: 404 }));

    await expect(request("/api/weddings/1/guests/404")).rejects.toThrow("Guest not found");
  });

  it("given an error response, when it has no detail, then the status is reported", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 500, statusText: "Internal Server Error" })),
    );

    const failure = await request("/api/weddings").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(500);
    expect((failure as ApiError).message).toContain("500");
  });

  it("given the planner on another port in development, when it calls the API, then the session cookie goes along", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => respondWith([]));
    vi.stubGlobal("fetch", fetchMock);

    await request("/api/weddings");

    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("include");
  });

  it("given a session that has ended, when any call answers 401, then the sign-in listener hears it", async () => {
    vi.stubGlobal("fetch", () => respondWith({ detail: "Sign in to use the planner" }, { status: 401 }));
    const listener = vi.fn();
    const stopListening = onUnauthorized(listener);

    await expect(request("/api/weddings")).rejects.toThrow("Sign in to use the planner");
    stopListening();
    await expect(request("/api/weddings")).rejects.toThrow();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
