import type { Guest, RsvpStatus } from "../../api/types";

export interface RsvpSummary {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  shareConfirmed: number;
  sharePending: number;
  shareDeclined: number;
}

/** The three stat cards at the top of the guest list, as whole counts and percentages. */
export function summariseRsvps(guests: Guest[]): RsvpSummary {
  const total = guests.length;
  const countOf = (status: RsvpStatus) =>
    guests.filter((guest) => guest.rsvpStatus === status).length;
  const shareOf = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));

  const confirmed = countOf("confirmed");
  const pending = countOf("pending");
  const declined = countOf("declined");

  return {
    total,
    confirmed,
    pending,
    declined,
    shareConfirmed: shareOf(confirmed),
    sharePending: shareOf(pending),
    shareDeclined: shareOf(declined),
  };
}
