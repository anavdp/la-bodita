import { request } from "./client";
import type { Household, HouseholdDraft } from "./types";

interface HouseholdPayload {
  id: number;
  name: string;
  rsvp_token: string;
  guest_ids: number[];
}

function toHousehold(payload: HouseholdPayload): Household {
  return {
    id: payload.id,
    name: payload.name,
    rsvpToken: payload.rsvp_token,
    guestIds: payload.guest_ids,
  };
}

/** Only the fields being changed, so a rename leaves the members alone. */
function toPayload(changes: Partial<HouseholdDraft>): Record<string, unknown> {
  return {
    ...(changes.name === undefined ? {} : { name: changes.name }),
    ...(changes.guestIds === undefined ? {} : { guest_ids: changes.guestIds }),
  };
}

const householdsUrl = (weddingId: number) => `/api/weddings/${weddingId}/households`;

export async function listHouseholds(weddingId: number): Promise<Household[]> {
  const payloads = await request<HouseholdPayload[]>(householdsUrl(weddingId));
  return payloads.map(toHousehold);
}

/** Guests listed move out of wherever they were. */
export async function createHousehold(weddingId: number, draft: HouseholdDraft): Promise<Household> {
  const payload = await request<HouseholdPayload>(householdsUrl(weddingId), {
    method: "POST",
    body: toPayload(draft),
  });
  return toHousehold(payload);
}

/** `guestIds` is the full membership: anyone left out goes on to a household of their own. */
export async function updateHousehold(
  weddingId: number,
  householdId: number,
  changes: Partial<HouseholdDraft>,
): Promise<Household> {
  const payload = await request<HouseholdPayload>(`${householdsUrl(weddingId)}/${householdId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toHousehold(payload);
}

/** Kept guests are not left without a household: each gets one of their own. */
export function deleteHousehold(weddingId: number, householdId: number, deleteGuests: boolean): Promise<void> {
  return request<void>(`${householdsUrl(weddingId)}/${householdId}?delete_guests=${deleteGuests}`, {
    method: "DELETE",
  });
}
