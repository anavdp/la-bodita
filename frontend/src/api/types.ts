/** The vocabularies the API accepts, mirrored from `app/models/guest.py`. */
export type RsvpStatus = "pending" | "confirmed" | "declined";
export type GuestSide = "venezuela" | "italy" | "spain" | "other";
export type GuestRelationshipType = "family" | "friends" | "other";
export type GuestGender = "female" | "male" | "other";

export interface Guest {
  id: number;
  weddingId: number;
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

/** A guest before the API has given it an identity. */
export type GuestDraft = Omit<Guest, "id" | "weddingId">;

/** The columns of the CSV import template, as the file spells them. */
export type GuestImportField =
  | "first_name"
  | "last_name"
  | "is_child"
  | "gender"
  | "relationship_type"
  | "side"
  | "phone"
  | "email";

export interface GuestImportError {
  field: GuestImportField;
  code: "missing" | "invalid" | "too_long";
}

/** One spreadsheet row of an import preview: a guest to create, or what is wrong with it. */
export interface GuestImportRow {
  /** The row as numbered in the spreadsheet, header included. */
  rowNumber: number;
  guest: GuestDraft | null;
  errors: GuestImportError[];
}

export interface Wedding {
  id: number;
  name: string;
  /** ISO date, or null while the couple has not settled on one. */
  wedding_date: string | null;
}
