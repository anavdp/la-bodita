import type { ItemStatus } from "../../api/types";

/** In the order a vendor usually moves through them. */
export const itemStatuses: ItemStatus[] = ["idea", "contacted", "meeting_set", "booked", "discarded"];

/** Booked stands out in solid purple; the rest stay soft, and discarded fades. */
export function statusPill(status: ItemStatus): string {
  const base = "inline-block rounded-full px-3 py-1 font-label-md text-[11px] uppercase tracking-wide";
  if (status === "booked") return `${base} bg-primary text-on-primary`;
  if (status === "discarded") return `${base} bg-surface-variant text-on-surface-variant line-through`;
  return `${base} bg-primary-container text-on-primary-container`;
}
