import type { Category, PaperRequest, Person, WeddingDocument } from "../../api/types";

/** How far ahead an expiry date starts to matter: offices often want three months left. */
const RUNNING_OUT_DAYS = 90;

export type PaperState = "have" | "expiring" | "expired" | "missing" | "notAsked";

/** One of us in one paper's row. */
export interface PaperCell {
  personId: number;
  state: PaperState;
  /** The file that answers it, when it is in sight. */
  document: WeddingDocument | null;
  /** Requests for this paper still waiting on a file: what an upload here answers. */
  unanswered: PaperRequest[];
}

export interface AskingItem {
  itemId: number;
  itemName: string;
  categoryId: number | null;
}

/** One paper, however many items ask for it: one copy each serves them all. */
export interface PaperRow {
  key: string;
  name: string;
  cells: PaperCell[];
  askedBy: AskingItem[];
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function expiryState(document: WeddingDocument | null, today: string): PaperState {
  const expiresOn = document?.expiresOn;
  if (!expiresOn) return "have";
  if (expiresOn < today) return "expired";
  return expiresOn <= addDays(today, RUNNING_OUT_DAYS) ? "expiring" : "have";
}

/** "Passport" and "passport " are the same paper. */
const paperKey = (name: string) => name.trim().toLocaleLowerCase();

function cellFor(person: Person, requests: PaperRequest[], documents: WeddingDocument[], today: string): PaperCell {
  // A paper for both of us (no person) is asked of each.
  const asked = requests.filter((request) => request.personId === null || request.personId === person.id);
  const unanswered = asked.filter((request) => request.isMissing);
  if (asked.length === 0) return { personId: person.id, state: "notAsked", document: null, unanswered };
  const answered = asked.filter((request) => !request.isMissing);
  if (answered.length === 0) return { personId: person.id, state: "missing", document: null, unanswered };
  const document = documents.find((each) => answered.some((request) => request.documentId === each.id)) ?? null;
  return { personId: person.id, state: expiryState(document, today), document, unanswered };
}

/** The papers table: a row per paper, in the order first asked for, a cell per person. */
export function paperRows(
  requests: PaperRequest[],
  documents: WeddingDocument[],
  people: Person[],
  today: string,
): PaperRow[] {
  const groups = new Map<string, PaperRequest[]>();
  requests.forEach((request) => {
    const key = paperKey(request.name);
    groups.set(key, [...(groups.get(key) ?? []), request]);
  });
  return [...groups.entries()].map(([key, group]) => {
    const askedBy = new Map<number, AskingItem>();
    group.forEach((request) =>
      askedBy.set(request.itemId, { itemId: request.itemId, itemName: request.itemName, categoryId: request.categoryId }),
    );
    return {
      key,
      name: group[0].name.trim(),
      cells: people.map((person) => cellFor(person, group, documents, today)),
      askedBy: [...askedBy.values()],
    };
  });
}

export interface WaitingItem extends AskingItem {
  missing: PaperRequest[];
}

/** Every item still waiting on a paper, with what it waits on. */
export function itemsWaiting(requests: PaperRequest[]): WaitingItem[] {
  const waiting = new Map<number, WaitingItem>();
  requests
    .filter((request) => request.isMissing)
    .forEach((request) => {
      const item = waiting.get(request.itemId) ?? {
        itemId: request.itemId,
        itemName: request.itemName,
        categoryId: request.categoryId,
        missing: [],
      };
      item.missing.push(request);
      waiting.set(request.itemId, item);
    });
  return [...waiting.values()];
}

/** Papers past or near their expiry date, soonest first. */
export function papersRunningOut(documents: WeddingDocument[], today: string): WeddingDocument[] {
  const horizon = addDays(today, RUNNING_OUT_DAYS);
  return documents
    .filter((document) => document.kind === "paper" && document.expiresOn !== null && document.expiresOn <= horizon)
    .sort((first, second) => (first.expiresOn as string).localeCompare(second.expiresOn as string));
}

export interface ShelfItem {
  itemId: number | null;
  itemName: string | null;
  documents: WeddingDocument[];
}

/** A category's files, item by item; or the uncategorized items'; or ours, on no item at all. */
export interface Shelf {
  key: string;
  category: Category | null;
  kind: "category" | "uncategorized" | "ours";
  items: ShelfItem[];
  count: number;
}

function shelfOf(key: string, kind: Shelf["kind"], category: Category | null, documents: WeddingDocument[]): Shelf {
  const items = new Map<number | null, ShelfItem>();
  documents.forEach((document) => {
    const item = items.get(document.itemId) ?? { itemId: document.itemId, itemName: document.itemName, documents: [] };
    item.documents.push(document);
    items.set(document.itemId, item);
  });
  return { key, kind, category, items: [...items.values()], count: documents.length };
}

/** The All files tab: a shelf per category in the Category Manager's order, then the rest; empty ones left out. */
export function shelves(documents: WeddingDocument[], categories: Category[]): Shelf[] {
  const known = new Set(categories.map((category) => category.id));
  const result = categories.map((category) =>
    shelfOf(
      `category-${category.id}`,
      "category",
      category,
      documents.filter((document) => document.itemId !== null && document.categoryId === category.id),
    ),
  );
  result.push(
    shelfOf(
      "uncategorized",
      "uncategorized",
      null,
      documents.filter(
        (document) => document.itemId !== null && (document.categoryId === null || !known.has(document.categoryId)),
      ),
    ),
    shelfOf(
      "ours",
      "ours",
      null,
      documents.filter((document) => document.itemId === null),
    ),
  );
  return result.filter((shelf) => shelf.count > 0);
}

/** "Dec 1, 2026": an expiry date is read years ahead, so it keeps its year. */
export function formatPaperDate(isoDate: string, language: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(language, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}
