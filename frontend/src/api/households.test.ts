import { createHousehold, deleteHousehold, listHouseholds, updateHousehold } from "./households";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const payload = { id: 4, name: "Rossi", rsvp_token: "secret-token", guest_ids: [1, 2] };
const household = { id: 4, name: "Rossi", rsvpToken: "secret-token", guestIds: [1, 2] };

describe("the household API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its households are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([payload]));
    vi.stubGlobal("fetch", fetchMock);

    const households = await listHouseholds(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/households");
    expect(households).toEqual([household]);
  });

  it("given a name and guests, when a household is created, then it is posted in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(payload, 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createHousehold(3, { name: "Rossi", guestIds: [1, 2] })).resolves.toEqual(household);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/households");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Rossi", guest_ids: [1, 2] });
  });

  it("given a rename, when a household is updated, then only the name is patched", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    await updateHousehold(3, 4, { name: "Famiglia Rossi" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/households/4");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Famiglia Rossi" });
  });

  it("given new members, when a household is updated, then the guest ids go in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    await updateHousehold(3, 4, { name: "Rossi", guestIds: [1, 5] });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: "Rossi", guest_ids: [1, 5] });
  });

  it("given a household, when it is deleted with its guests, then the API is told to delete them too", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteHousehold(3, 4, true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/households/4?delete_guests=true");
    expect(init.method).toBe("DELETE");
  });

  it("given a household, when it is deleted keeping its guests, then the API is told to keep them", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteHousehold(3, 4, false);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/households/4?delete_guests=false");
  });
});
