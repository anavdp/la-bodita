import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from "./calendar";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const eventPayload = {
  id: 5,
  title: "Honeymoon",
  start_date: "2026-11-01",
  end_date: "2026-11-08",
  start_time: "09:30:00",
  notes: "Pack light",
  item_id: 7,
  item_name: "Los Roques",
  category_id: 2,
};

const honeymoon = {
  id: 5,
  title: "Honeymoon",
  startDate: "2026-11-01",
  endDate: "2026-11-08",
  startTime: "09:30:00",
  notes: "Pack light",
  itemId: 7,
  itemName: "Los Roques",
  categoryId: 2,
};

describe("the calendar API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a wedding, when its events are listed, then they come back in app terms", async () => {
    const fetchMock = vi.fn((_url: string) => jsonResponse([eventPayload]));
    vi.stubGlobal("fetch", fetchMock);

    const events = await listCalendarEvents(3);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/calendar-events");
    expect(events).toEqual([honeymoon]);
  });

  it("given a new event, when it is created, then it is posted in API terms", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(eventPayload, 201));
    vi.stubGlobal("fetch", fetchMock);

    const created = await createCalendarEvent(3, {
      title: "Honeymoon",
      startDate: "2026-11-01",
      endDate: "2026-11-08",
      startTime: "09:30",
      itemId: 7,
      notes: "Pack light",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/weddings/3/calendar-events");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      title: "Honeymoon",
      start_date: "2026-11-01",
      end_date: "2026-11-08",
      start_time: "09:30",
      item_id: 7,
      notes: "Pack light",
    });
    expect(created).toEqual(honeymoon);
  });

  it("given an event, when only its end is cleared, then only that field is sent", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse({ ...eventPayload, end_date: null }));
    vi.stubGlobal("fetch", fetchMock);

    const updated = await updateCalendarEvent(3, 5, { endDate: null });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/weddings/3/calendar-events/5");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ end_date: null });
    expect(updated.endDate).toBeNull();
  });

  it("given an event, when it is deleted, then the API is told to delete it", async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    vi.stubGlobal("fetch", fetchMock);

    await deleteCalendarEvent(3, 5);

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/weddings/3/calendar-events/5");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
