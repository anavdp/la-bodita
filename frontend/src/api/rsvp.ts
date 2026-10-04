import { request } from "./client";
import type { RsvpAnswer, RsvpInvitation, RsvpStatus } from "./types";

interface RsvpInvitationPayload {
  household_name: string | null;
  wedding_name: string;
  wedding_date: string | null;
  guests: { id: number; first_name: string; last_name: string; rsvp_status: RsvpStatus }[];
}

function toInvitation(payload: RsvpInvitationPayload): RsvpInvitation {
  return {
    householdName: payload.household_name,
    weddingName: payload.wedding_name,
    weddingDate: payload.wedding_date,
    guests: payload.guests.map((guest) => ({
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      rsvpStatus: guest.rsvp_status,
    })),
  };
}

const rsvpPath = (token: string) => `/api/rsvp/${encodeURIComponent(token)}`;

export async function getInvitation(token: string): Promise<RsvpInvitation> {
  return toInvitation(await request<RsvpInvitationPayload>(rsvpPath(token)));
}

/** Each member answers for themselves; members left out keep their current answer. */
export async function answerInvitation(token: string, answers: RsvpAnswer[]): Promise<RsvpInvitation> {
  const payload = await request<RsvpInvitationPayload>(rsvpPath(token), {
    method: "PUT",
    body: { answers: answers.map((answer) => ({ guest_id: answer.guestId, attending: answer.attending })) },
  });
  return toInvitation(payload);
}
