import { apiUrl, request } from "./client";
import type { Guest, GuestDraft, GuestImportDraft, GuestImportError, GuestImportRow } from "./types";

/** The wire shape: the API speaks snake_case, the app speaks camelCase. */
interface GuestPayload {
  id: number;
  wedding_id: number;
  household_id: number;
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

type GuestDraftPayload = Omit<GuestPayload, "id" | "wedding_id" | "household_id">;

type GuestImportDraftPayload = GuestDraftPayload & { household: string | null };

interface GuestImportRowPayload {
  row_number: number;
  guest: GuestImportDraftPayload | null;
  errors: GuestImportError[];
}

const payloadKeys: Record<keyof GuestDraft | keyof GuestImportDraft, string> = {
  firstName: "first_name",
  lastName: "last_name",
  isChild: "is_child",
  gender: "gender",
  relationshipType: "relationship_type",
  side: "side",
  rsvpStatus: "rsvp_status",
  phone: "phone",
  email: "email",
  householdId: "household_id",
  household: "household",
};

function toGuest(payload: GuestPayload): Guest {
  return {
    ...toDraft(payload),
    id: payload.id,
    weddingId: payload.wedding_id,
    householdId: payload.household_id,
  };
}

function toDraft(payload: GuestDraftPayload): GuestDraft {
  return {
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
function toPayload(changes: Partial<GuestDraft> | GuestImportDraft): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => [payloadKeys[field as keyof typeof payloadKeys], value]),
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

export function guestImportTemplateUrl(weddingId: number): string {
  return apiUrl(`${guestsUrl(weddingId)}/import/template`);
}

/** Validates a filled-in template without saving anything. */
export async function previewGuestImport(weddingId: number, file: File): Promise<GuestImportRow[]> {
  const form = new FormData();
  form.append("file", file);
  const payload = await request<{ rows: GuestImportRowPayload[] }>(
    `${guestsUrl(weddingId)}/import/preview`,
    { method: "POST", body: form },
  );
  return payload.rows.map((row) => ({
    rowNumber: row.row_number,
    guest: row.guest === null ? null : { ...toDraft(row.guest), household: row.guest.household },
    errors: row.errors,
  }));
}

/** Creates every previewed guest in one request. */
export async function importGuests(weddingId: number, drafts: GuestImportDraft[]): Promise<void> {
  await request<GuestPayload[]>(`${guestsUrl(weddingId)}/bulk`, {
    method: "POST",
    body: drafts.map(toPayload),
  });
}
