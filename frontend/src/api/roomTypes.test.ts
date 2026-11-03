import { createRoomType, deleteRoomType, listRoomTypes, updateRoomType } from "./roomTypes";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const payload = { id: 2, name: "Doble", beds: "2 single beds", available: 10 };

describe("the room type API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its room types are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([payload]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listRoomTypes(3)).resolves.toEqual([payload]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/room-types");
  });

  it("given a new room type, when it is created, then it is posted", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(payload, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createRoomType(3, { name: "Doble", beds: "2 single beds", available: 10 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Doble", beds: "2 single beds", available: 10 });
  });

  it("given a change, when a room type is updated, then it is patched at its address", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    await updateRoomType(3, 2, { name: "Doble", beds: "", available: 11 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/room-types/2");
    expect(init.method).toBe("PATCH");
  });

  it("given a room type, when it is deleted, then the API is told", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteRoomType(3, 2);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/room-types/2");
    expect(init.method).toBe("DELETE");
  });
});
