import { request } from "./client";
import type { CalendarEvent, CalendarEventChanges, CalendarEventDraft } from "./types";

interface CalendarEventPayload {
  id: number;
  title: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  notes: string | null;
  item_id: number | null;
  item_name: string | null;
  category_id: number | null;
}

const payloadKeys: Record<keyof CalendarEventChanges, string> = {
  title: "title",
  startDate: "start_date",
  endDate: "end_date",
  startTime: "start_time",
  itemId: "item_id",
  notes: "notes",
};

function toCalendarEvent(payload: CalendarEventPayload): CalendarEvent {
  return {
    id: payload.id,
    title: payload.title,
    startDate: payload.start_date,
    endDate: payload.end_date,
    startTime: payload.start_time,
    notes: payload.notes,
    itemId: payload.item_id,
    itemName: payload.item_name,
    categoryId: payload.category_id,
  };
}

/** Only the fields named, so moving an event leaves everything else alone. */
function toPayload(changes: CalendarEventChanges): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [payloadKeys[key as keyof CalendarEventChanges], value]),
  );
}

const eventsUrl = (weddingId: number) => `/api/weddings/${weddingId}/calendar-events`;

/** Soonest first. */
export async function listCalendarEvents(weddingId: number): Promise<CalendarEvent[]> {
  const payloads = await request<CalendarEventPayload[]>(eventsUrl(weddingId));
  return payloads.map(toCalendarEvent);
}

export async function createCalendarEvent(weddingId: number, draft: CalendarEventDraft): Promise<CalendarEvent> {
  const payload = await request<CalendarEventPayload>(eventsUrl(weddingId), { method: "POST", body: toPayload(draft) });
  return toCalendarEvent(payload);
}

export async function updateCalendarEvent(
  weddingId: number,
  eventId: number,
  changes: CalendarEventChanges,
): Promise<CalendarEvent> {
  const payload = await request<CalendarEventPayload>(`${eventsUrl(weddingId)}/${eventId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toCalendarEvent(payload);
}

export function deleteCalendarEvent(weddingId: number, eventId: number): Promise<void> {
  return request<void>(`${eventsUrl(weddingId)}/${eventId}`, { method: "DELETE" });
}
