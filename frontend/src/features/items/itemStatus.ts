import type { ItemStatus } from "../../api/types";

/** In the order a vendor usually moves through them. */
export const itemStatuses: ItemStatus[] = ["idea", "contacted", "meeting_set", "booked", "discarded"];

const statusFill: Record<ItemStatus, string> = {
  idea: "bg-cream-light",
  contacted: "bg-sky-soft",
  meeting_set: "bg-butter",
  booked: "bg-mint-soft",
  discarded: "bg-cream text-ink/50 line-through",
};

/** An outlined pill like the guests' RSVP: each step its own soft colour, booked in green, discarded struck out. */
export function statusPill(status: ItemStatus): string {
  return `inline-block rounded-[14px] border-2 border-ink px-3 py-0.5 font-playful text-base text-ink ${statusFill[status]}`;
}
