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

/** National colours, as the mockup marks each side of the family. */
export const sideDotColor: Record<GuestSide, string> = {
  venezuela: "#FCE300",
  italy: "#008C45",
  spain: "#AA151B",
  other: "#6d7a79",
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
