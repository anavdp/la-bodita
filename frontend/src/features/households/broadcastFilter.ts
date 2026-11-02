import type { BroadcastList, Household } from "../../api/types";
import type { NotSet } from "../guests/filtering";

/** The broadcast lists ticked under the Broadcast funnel; empty lets every household through. */
export type BroadcastFilter = (BroadcastList | NotSet)[];

/** The households on any ticked list; "not set" picks out those on none. */
export function filterHouseholdsByBroadcast(households: Household[], ticked: BroadcastFilter): Household[] {
  if (ticked.length === 0) return households;
  return households.filter((household) => ticked.includes(household.broadcastList ?? "notSet"));
}

/** Ticks a list under the funnel, or unticks it if it was ticked. */
export function toggleBroadcastFilter(ticked: BroadcastFilter, value: BroadcastList | NotSet): BroadcastFilter {
  return ticked.includes(value) ? ticked.filter((current) => current !== value) : [...ticked, value];
}
