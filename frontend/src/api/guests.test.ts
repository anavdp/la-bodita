import {
  createGuest,
  deleteGuest,
  guestImportTemplateUrl,
  importGuests,
  listGuests,
  previewGuestImport,
  updateGuest,
} from "./guests";
import { listWeddings } from "./weddings";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("the guest API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its guests are listed, then they are read from its own collection", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      jsonResponse([
        {
          id: 1,
          wedding_id: 3,
          household_id: 4,
          first_name: "Maria",
          last_name: "Rossi",
          is_child: false,
          gender: null,
          relationship_type: "family",
          side: "italy",
          rsvp_status: "confirmed",
          phone: null,
          email: null,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const guests = await listGuests(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/guests");
    expect(guests).toEqual([
      {
        id: 1,
        weddingId: 3,
        householdId: 4,
        firstName: "Maria",
        lastName: "Rossi",
        isChild: false,
        gender: null,
        relationshipType: "family",
        side: "italy",
        rsvpStatus: "confirmed",
        phone: null,
        email: null,
      },
    ]);
  });

  it("given a draft guest, when it is created, then it is posted to the wedding's collection", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ id: 9 }));
    vi.stubGlobal("fetch", fetchMock);

    await createGuest(3, {
      firstName: "Maria",
      lastName: "Rossi",
      isChild: false,
      gender: null,
      relationshipType: "family",
      side: "italy",
      rsvpStatus: "pending",
      phone: null,
      email: null,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/guests");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      first_name: "Maria",
      last_name: "Rossi",
      is_child: false,
      relationship_type: "family",
      rsvp_status: "pending",
    });
  });

  it("given a change, when a guest is updated, then only that change is patched", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ id: 9, rsvp_status: "confirmed" }));
    vi.stubGlobal("fetch", fetchMock);

    await updateGuest(3, 9, { rsvpStatus: "confirmed" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/guests/9");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ rsvp_status: "confirmed" }));
  });

  it("given a new household, when a guest is moved, then the household id is patched in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ id: 9 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateGuest(3, 9, { householdId: 12 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ household_id: 12 }));
  });

  it("given a guest, when it is deleted, then it is removed from the wedding's collection", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteGuest(3, 9);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/guests/9");
    expect(init.method).toBe("DELETE");
  });

  it("given a wedding, when the import template is linked, then it is that wedding's template", () => {
    expect(guestImportTemplateUrl(3)).toBe(
      "http://localhost:8000/api/weddings/3/guests/import/template",
    );
  });

  it("given a CSV file, when it is previewed, then it is uploaded and each row comes back in app terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
      jsonResponse({
        rows: [
          {
            row_number: 2,
            guest: {
              first_name: "Maria",
              last_name: "Rossi",
              is_child: false,
              gender: null,
              relationship_type: null,
              side: "italy",
              rsvp_status: "pending",
              phone: null,
              email: null,
              household: "Rossi",
            },
            errors: [],
          },
          { row_number: 3, guest: null, errors: [{ field: "first_name", code: "missing" }] },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["first_name,last_name\nMaria,Rossi\n,Mendoza\n"], "guests.csv");

    const rows = await previewGuestImport(3, file);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/guests/import/preview");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBe(file);
    expect(rows).toEqual([
      {
        rowNumber: 2,
        guest: {
          firstName: "Maria",
          lastName: "Rossi",
          isChild: false,
          gender: null,
          relationshipType: null,
          side: "italy",
          rsvpStatus: "pending",
          phone: null,
          email: null,
          household: "Rossi",
        },
        errors: [],
      },
      { rowNumber: 3, guest: null, errors: [{ field: "first_name", code: "missing" }] },
    ]);
  });

  it("given previewed guests, when the import is confirmed, then they are posted together in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse([], 201));
    vi.stubGlobal("fetch", fetchMock);

    await importGuests(3, [
      {
        firstName: "Maria",
        lastName: "Rossi",
        isChild: false,
        gender: null,
        relationshipType: null,
        side: null,
        rsvpStatus: "pending",
        phone: null,
        email: null,
        household: "Rossi",
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/weddings/3/guests/bulk");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual([
      {
        first_name: "Maria",
        last_name: "Rossi",
        is_child: false,
        gender: null,
        relationship_type: null,
        side: null,
        rsvp_status: "pending",
        phone: null,
        email: null,
        household: "Rossi",
      },
    ]);
  });

  it("given the app starts, when weddings are listed, then the tenant roots come back", async () => {
    vi.stubGlobal("fetch", () => jsonResponse([{ id: 1, name: "La Bodita", wedding_date: null }]));

    await expect(listWeddings()).resolves.toEqual([
      { id: 1, name: "La Bodita", wedding_date: null },
    ]);
  });
});
