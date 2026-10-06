import { answerInvitation, getInvitation, lookUpInvitation } from "./rsvp";

const invitationPayload = {
  household_name: "Rossi",
  wedding_name: "La Bodita",
  wedding_date: "2026-10-29",
  guests: [{ id: 1, first_name: "Maria", last_name: "Rossi", rsvp_status: "pending" }],
  greeting: "family",
};

const invitation = {
  householdName: "Rossi",
  weddingName: "La Bodita",
  weddingDate: "2026-10-29",
  guests: [{ id: 1, firstName: "Maria", lastName: "Rossi", rsvpStatus: "pending" }],
  greeting: "family",
};

const jsonResponse = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }));

describe("the RSVP API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a household link, when the invitation is read, then it comes back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse(invitationPayload));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getInvitation("abc")).resolves.toEqual(invitation);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/rsvp/abc");
  });

  it("given answers, when they are sent, then each member's yes or no goes in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(invitationPayload));
    vi.stubGlobal("fetch", fetchMock);

    const updated = await answerInvitation("abc", [{ guestId: 1, attending: true }]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/rsvp/abc");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ answers: [{ guest_id: 1, attending: true }] });
    expect(updated).toEqual(invitation);
  });

  it("given a full name, when it is looked up, then the matching households come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      jsonResponse({
        households: [
          {
            token: "abc",
            name: "Famiglia Rossi",
            members: [{ first_name: "Maria", last_name: "Rossi" }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const matches = await lookUpInvitation("Maria Rossi");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/rsvp/lookup");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Maria Rossi" });
    expect(matches).toEqual([
      { token: "abc", name: "Famiglia Rossi", members: [{ firstName: "Maria", lastName: "Rossi" }] },
    ]);
  });
});
