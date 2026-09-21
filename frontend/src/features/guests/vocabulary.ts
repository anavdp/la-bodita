import type { GuestGender, GuestRelationshipType, GuestSide, RsvpStatus } from "../../api/types";
import type { TranslationKey } from "../../i18n/translations";

export const rsvpStatuses: RsvpStatus[] = ["pending", "confirmed", "declined"];
export const guestSides: GuestSide[] = ["venezuela", "italy", "spain", "other"];
export const relationshipTypes: GuestRelationshipType[] = ["family", "friends", "other"];
export const guestGenders: GuestGender[] = ["female", "male", "other"];

export const rsvpLabelKey = (status: RsvpStatus): TranslationKey => `guests.rsvp.${status}`;
export const sideLabelKey = (side: GuestSide): TranslationKey => `guests.side.${side}`;
export const relationshipLabelKey = (relationship: GuestRelationshipType): TranslationKey =>
  `guests.relationship.${relationship}`;
export const genderLabelKey = (gender: GuestGender): TranslationKey => `guests.gender.${gender}`;

/**
 * Each side of the family as its own flag. "Other" has no country behind it, so
 * it gets the globe. Country flag emoji do not render on Windows, where they
 * fall back to the two-letter code (ES, VE, IT) - still readable, just plainer.
 */
export const sideFlag: Record<GuestSide, string> = {
  venezuela: "🇻🇪",
  italy: "🇮🇹",
  spain: "🇪🇸",
  other: "🌍",
};


/** One icon per status, shared by the summary cards and the table's RSVP column. */
export const rsvpIcon: Record<RsvpStatus, string> = {
  confirmed: "check_circle",
  pending: "hourglass_empty",
  declined: "cancel",
};

export const rsvpToneClass: Record<RsvpStatus, string> = {
  confirmed: "text-primary",
  pending: "text-tertiary",
  declined: "text-secondary",
};

export const rsvpChipClass: Record<RsvpStatus, string> = {
  confirmed: "bg-primary/10",
  pending: "bg-tertiary-container/10",
  declined: "bg-secondary-container/10",
};
