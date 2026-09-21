import { request } from "./client";
import type { Guest, GuestDraft } from "./types";

/** The wire shape: the API speaks snake_case, the app speaks camelCase. */
interface GuestPayload {
  id: number;
  wedding_id: number;
  first_name: string;
  last_name: string;
  is_child: boolean;
  gender: Guest["gender"];
  relationship_type: Guest["relationshipType"];
  side: Guest["side"];
  rsvp_status: Guest["rsvpStatus"];
  phone: string | null;
  email: string | null;
}

const payloadKeys: Record<keyof GuestDraft, keyof GuestPayload> = {
  firstName: "first_name",
  lastName: "last_name",
  isChild: "is_child",
  gender: "gender",
  relationshipType: "relationship_type",
  side: "side",
  rsvpStatus: "rsvp_status",
  phone: "phone",
  email: "email",
};

function toGuest(payload: GuestPayload): Guest {
  return {
    id: payload.id,
    weddingId: payload.wedding_id,
    firstName: payload.first_name,
    lastName: payload.last_name,
    isChild: payload.is_child,
    gender: payload.gender,
    relationshipType: payload.relationship_type,
    side: payload.side,
    rsvpStatus: payload.rsvp_status,
    phone: payload.phone,
    email: payload.email,
  };
}

/** Only the fields the caller actually set, so a PATCH stays partial. */
function toPayload(changes: Partial<GuestDraft>): Partial<GuestPayload> {
  return Object.fromEntries(
    Object.entries(changes).map(([field, value]) => [payloadKeys[field as keyof GuestDraft], value]),
  );
}

function guestsUrl(weddingId: number): string {
  return `/api/weddings/${weddingId}/guests`;
}

export async function listGuests(weddingId: number): Promise<Guest[]> {
  const payloads = await request<GuestPayload[]>(guestsUrl(weddingId));
  return payloads.map(toGuest);
}

export async function createGuest(weddingId: number, draft: GuestDraft): Promise<Guest> {
  const payload = await request<GuestPayload>(guestsUrl(weddingId), {
    method: "POST",
    body: toPayload(draft),
  });
  return toGuest(payload);
}

export async function updateGuest(
  weddingId: number,
  guestId: number,
  changes: Partial<GuestDraft>,
): Promise<Guest> {
  const payload = await request<GuestPayload>(`${guestsUrl(weddingId)}/${guestId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toGuest(payload);
}

export function deleteGuest(weddingId: number, guestId: number): Promise<void> {
  return request<void>(`${guestsUrl(weddingId)}/${guestId}`, { method: "DELETE" });
}
