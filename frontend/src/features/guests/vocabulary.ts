import type { GuestGender, GuestRelationshipType, GuestSide, RsvpStatus } from "../../api/types";
import type { TranslationKey } from "../../i18n/translations";

export const rsvpStatuses: RsvpStatus[] = ["pending", "confirmed", "declined"];
export const guestSides: GuestSide[] = ["venezuela", "italy", "spain", "usa", "other"];
export const relationshipTypes: GuestRelationshipType[] = [
  "family",
  "friends",
  "bride_friends",
  "groom_friends",
  "plus_one",
  "other",
];
export const guestGenders: GuestGender[] = ["female", "male", "other"];

export const rsvpLabelKey = (status: RsvpStatus): TranslationKey => `guests.rsvp.${status}`;
export const sideLabelKey = (side: GuestSide): TranslationKey => `guests.side.${side}`;
export const relationshipLabelKey = (relationship: GuestRelationshipType): TranslationKey =>
  `guests.relationship.${relationship}`;
export const genderLabelKey = (gender: GuestGender): TranslationKey => `guests.gender.${gender}`;

/**
 * Each side of the family as its country code, in a circle like the guests'
 * initials. "Other" has no country behind it, so it reads WW, for worldwide.
 */
export const sideCode: Record<GuestSide, string> = {
  venezuela: "VE",
  italy: "IT",
  spain: "ES",
  usa: "US",
  other: "WW",
};

/** Each side's circle tint, so the column reads at a glance. */
export const sideTone: Record<GuestSide, string> = {
  venezuela: "bg-butter",
  italy: "bg-mint-soft",
  spain: "bg-coral-soft",
  usa: "bg-sky-soft",
  other: "bg-accent",
};


/** One icon per status, shared by the summary cards and the table's RSVP column. */
export const rsvpIcon: Record<RsvpStatus, string> = {
  confirmed: "check_circle",
  pending: "hourglass_empty",
  declined: "cancel",
};

/** Each icon is the same token as its summary card, so the two match exactly. */
export const rsvpToneClass: Record<RsvpStatus, string> = {
  confirmed: "text-secondary",
  pending: "text-tertiary",
  declined: "text-secondary-container",
};
