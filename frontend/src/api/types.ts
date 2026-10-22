/** The vocabularies the API accepts, mirrored from `app/models/guest.py`. */
export type RsvpStatus = "pending" | "confirmed" | "declined";
export type GuestSide = "venezuela" | "italy" | "spain" | "usa" | "other";
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

/** The WhatsApp broadcast list a household's invitation goes out on. */
export type BroadcastList = "bride" | "groom";

export interface Household {
  id: number;
  /** Someone added on their own gets a household named after them. */
  name: string;
  /** The private part of the household's RSVP link. */
  rsvpToken: string;
  /** Null until the household is added to one of the couple's lists. */
  broadcastList: BroadcastList | null;
  guestIds: number[];
}

/** What a household sees when it opens its RSVP link. */
/** What the Households screen sends: a name and the full list of members. */
export interface HouseholdDraft {
  name: string;
  guestIds: number[];
}

/** A PATCH changes only what it names; a null broadcast list takes the household off every list. */
export type HouseholdChanges = Partial<HouseholdDraft> & { broadcastList?: BroadcastList | null };

/** How the invitation speaks to a household: to family, to friends, or to anyone. */
export type RsvpGreeting = "family" | "friends" | "general";

export interface RsvpInvitation {
  householdName: string;
  weddingName: string;
  weddingDate: string | null;
  guests: RsvpGuest[];
  greeting: RsvpGreeting;
}

export interface RsvpGuest {
  id: number;
  firstName: string;
  lastName: string;
  rsvpStatus: RsvpStatus;
}

/** A household found by a guest's name: only who is in it, nothing more until it is opened. */
export interface RsvpHouseholdMatch {
  token: string;
  name: string;
  members: { firstName: string; lastName: string }[];
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

/** A couple's own tag (Church, Photographer...): its color marks items everywhere. */
export interface Category {
  id: number;
  name: string;
  emoji: string | null;
  /** "#rrggbb", lowercase. */
  color: string;
  subcategories: Subcategory[];
}

/** A finer tag inside a category: its own emoji, always its category's color. */
export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  emoji: string | null;
  color: string;
}

export interface CategoryDraft {
  name: string;
  emoji: string | null;
  color: string;
}

/** Where things stand with a vendor or place, mirrored from `app/models/item.py`. */
export type ItemStatus = "idea" | "contacted" | "meeting_set" | "booked" | "discarded";

/** An item's earliest open task with a date: usually its next appointment. */
export interface NextTask {
  id: number;
  title: string;
  dueDate: string;
  dueTime: string | null;
}

/** The planning hub: a vendor, the church, a venue... */
export interface Item {
  id: number;
  name: string;
  categoryId: number | null;
  subcategoryId: number | null;
  status: ItemStatus;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  notes: string | null;
  taskCount: number;
  doneTaskCount: number;
  nextTask: NextTask | null;
}

export type ItemDraft = Omit<Item, "id" | "taskCount" | "doneTaskCount" | "nextTask">;

/** A checklist task; with a date and a time it is an appointment. */
export interface Task {
  id: number;
  title: string;
  isDone: boolean;
  /** ISO date. */
  dueDate: string | null;
  /** "HH:MM:SS", only ever set alongside a date. */
  dueTime: string | null;
  notes: string | null;
  /** Null for a general task that belongs to no item. */
  itemId: number | null;
  itemName: string | null;
  categoryId: number | null;
}

export interface TaskDraft {
  title: string;
  itemId: number | null;
  dueDate: string | null;
  dueTime: string | null;
}

/** A PATCH changes only what it names. */
export type TaskChanges = Partial<TaskDraft> & { isDone?: boolean };

/**
 * Where a cost stands, mirrored from `app/models/budget_line.py`. On the budget
 * screen: idea is switched off, considering is switched on, confirmed is booked.
 */
export type BudgetLineStatus = "idea" | "considering" | "confirmed" | "paid";

/** One cost: a vendor's quote or any other expense, in its own currency. */
export interface BudgetLine {
  id: number;
  title: string;
  status: BudgetLineStatus;
  /** ISO 4217, uppercase: "USD", "EUR". */
  currency: string;
  /** The quote; null while waiting for one. */
  estimatedAmount: number | null;
  /** What it finally cost, once known. */
  actualAmount: number | null;
  notes: string | null;
  /** Null for a cost that belongs to no item. */
  itemId: number | null;
  itemName: string | null;
  categoryId: number | null;
}

export type BudgetLineDraft = Omit<BudgetLine, "id" | "status" | "itemName" | "categoryId">;

/** A PATCH changes only what it names. */
export type BudgetLineChanges = Partial<BudgetLineDraft> & { status?: BudgetLineStatus };
