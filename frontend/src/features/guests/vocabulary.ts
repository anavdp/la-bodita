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

export const rsvpPillClass: Record<RsvpStatus, string> = {
  confirmed: "bg-primary/10 text-primary",
  pending: "bg-tertiary-container/10 text-tertiary",
  declined: "bg-secondary-container/10 text-secondary",
};
