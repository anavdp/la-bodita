import { listHouseholds } from "./households";

const jsonResponse = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }));

describe("the household API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its households are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) =>
      jsonResponse([{ id: 4, name: "Rossi", rsvp_token: "secret-token", guest_ids: [1, 2] }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const households = await listHouseholds(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/households");
    expect(households).toEqual([{ id: 4, name: "Rossi", rsvpToken: "secret-token", guestIds: [1, 2] }]);
  });
});
