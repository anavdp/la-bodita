/** The vocabularies the API accepts, mirrored from `app/models/guest.py`. */
export type RsvpStatus = "pending" | "confirmed" | "declined";
export type GuestSide = "venezuela" | "italy" | "spain" | "other";
export type GuestRelationshipType =
  | "family"
  | "friends"
  | "bride_friends"
  | "groom_friends"
  | "plus_one"
  | "other";
export type GuestGender = "female" | "male" | "other";

export interface Guest {
  id: number;
  weddingId: number;
  /** Every guest belongs to exactly one household; alone means a household of one. */
  householdId: number;
  firstName: string;
  lastName: string;
  isChild: boolean;
  gender: GuestGender | null;
  /** Null until the couple decides; a guest can be added by name alone. */
  relationshipType: GuestRelationshipType | null;
  side: GuestSide | null;
  rsvpStatus: RsvpStatus;
  phone: string | null;
  email: string | null;
}

/**
 * A guest before the API has given it an identity. `householdId` left out means
 * "a new household of one" on create and "unchanged" on edit; null on edit
 * splits the guest off on their own.
 */
export type GuestDraft = Omit<Guest, "id" | "weddingId" | "householdId"> & {
  householdId?: number | null;
};

/** A spreadsheet guest: rows of one file sharing a `household` are invited together. */
export type GuestImportDraft = Omit<GuestDraft, "householdId"> & { household: string | null };

export interface Household {
  id: number;
  /** Someone added on their own gets a household named after them. */
  name: string;
  /** The private part of the household's RSVP link. */
  rsvpToken: string;
  guestIds: number[];
}

/** What a household sees when it opens its RSVP link. */
/** What the Households screen sends: a name and the full list of members. */
export interface HouseholdDraft {
  name: string;
  guestIds: number[];
}

export interface RsvpInvitation {
  householdName: string;
  weddingName: string;
  weddingDate: string | null;
  guests: RsvpGuest[];
}

export interface RsvpGuest {
  id: number;
  firstName: string;
  lastName: string;
  rsvpStatus: RsvpStatus;
}

export interface RsvpAnswer {
  guestId: number;
  attending: boolean;
}

/** The columns of the CSV import template, as the file spells them. */
export type GuestImportField =
  | "first_name"
  | "last_name"
  | "is_child"
  | "gender"
  | "relationship_type"
  | "side"
  | "phone"
  | "email"
  | "household";

export interface GuestImportError {
  field: GuestImportField;
  code: "missing" | "invalid" | "too_long";
}

/** One spreadsheet row of an import preview: a guest to create, or what is wrong with it. */
export interface GuestImportRow {
  /** The row as numbered in the spreadsheet, header included. */
  rowNumber: number;
  guest: GuestImportDraft | null;
  errors: GuestImportError[];
}

export interface Wedding {
  id: number;
  name: string;
  /** ISO date, or null while the couple has not settled on one. */
  wedding_date: string | null;
}
