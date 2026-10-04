import { request } from "./client";
import type { Household } from "./types";

interface HouseholdPayload {
  id: number;
  name: string | null;
  rsvp_token: string;
  guest_ids: number[];
}

export async function listHouseholds(weddingId: number): Promise<Household[]> {
  const payloads = await request<HouseholdPayload[]>(`/api/weddings/${weddingId}/households`);
  return payloads.map((payload) => ({
    id: payload.id,
    name: payload.name,
    rsvpToken: payload.rsvp_token,
    guestIds: payload.guest_ids,
  }));
}
