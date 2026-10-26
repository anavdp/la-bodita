import type { BudgetLine, Category, PaperRequest, Person, Task, WeddingDocument } from "../../api/types";
import { amountOf, isConfirmed } from "../budget/budgetMath";
import { toIso } from "../calendar/calendarMath";
import { itemsWaiting, paperRows, papersRunningOut } from "../documents/papers";
import type { WaitingItem } from "../documents/papers";
import { isOverdue } from "../planning/schedule";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days since a task's date, in the viewer's own calendar. */
export function daysLate(dueDate: string, today: Date = new Date()): number {
  const [year, month, day] = dueDate.split("-").map(Number);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((startOfToday.getTime() - new Date(year, month - 1, day).getTime()) / MILLISECONDS_PER_DAY);
}

/** One thing on the dashboard's "Needs you" card. */
export type Attention =
  | { kind: "lateTask"; key: string; task: Task; daysLate: number }
  | {
      kind: "runningOut";
      key: string;
      document: WeddingDocument;
      isExpired: boolean;
    }
  | { kind: "waitingPapers"; key: string; item: WaitingItem };

interface NeedsYouSources {
  tasks: Task[];
  requests: PaperRequest[];
  documents: WeddingDocument[];
}

/**
 * What is waiting on us, most pressing first: tasks past their date (the
 * oldest at the top), papers past or near their expiry date, then each item
 * still waiting on papers.
 */
export function needsYou({ tasks, requests, documents }: NeedsYouSources, today: Date = new Date()): Attention[] {
  const todayIso = toIso(today);
  const late: Attention[] = tasks
    .filter((task) => isOverdue(task, today))
    .sort((first, second) => (first.dueDate as string).localeCompare(second.dueDate as string))
    .map((task) => ({
      kind: "lateTask",
      key: `late-${task.id}`,
      task,
      daysLate: daysLate(task.dueDate as string, today),
    }));
  const runningOut: Attention[] = papersRunningOut(documents, todayIso).map((document) => ({
    kind: "runningOut",
    key: `expiring-${document.id}`,
    document,
    isExpired: (document.expiresOn as string) < todayIso,
  }));
  const waiting: Attention[] = itemsWaiting(requests).map((item) => ({
    kind: "waitingPapers",
    key: `waiting-${item.itemId}`,
    item,
  }));
  return [...late, ...runningOut, ...waiting];
}

/** Papers in hand and still to get, a copy per person, as the Documents screen's table counts them. */
export function paperProgress(
  requests: PaperRequest[],
  documents: WeddingDocument[],
  people: Person[],
  todayIso: string,
): { inHand: number; missing: number } {
  const cells = paperRows(requests, documents, people, todayIso).flatMap((row) => row.cells);
  return {
    inHand: cells.filter((cell) => cell.state !== "missing" && cell.state !== "notAsked").length,
    missing: cells.filter((cell) => cell.state === "missing").length,
  };
}

export interface SpendSlice {
  /** The category's id, or "none" for money on no category. */
  key: string;
  category: Category | null;
  amount: number;
}

export interface CurrencySpend {
  currency: string;
  total: number;
  slices: SpendSlice[];
}

/**
 * What booked and paid lines add up to in each category, biggest first, one
 * group per currency (never added together), the biggest currency first.
 */
export function spendByCategory(lines: BudgetLine[], categories: Category[]): CurrencySpend[] {
  const known = new Map(categories.map((category) => [category.id, category]));
  const byCurrency = new Map<string, Map<string, SpendSlice>>();
  lines.filter(isConfirmed).forEach((line) => {
    const category = line.categoryId === null ? null : (known.get(line.categoryId) ?? null);
    const key = category === null ? "none" : String(category.id);
    const slices = byCurrency.get(line.currency) ?? new Map<string, SpendSlice>();
    const slice = slices.get(key) ?? { key, category, amount: 0 };
    slice.amount += amountOf(line) ?? 0;
    slices.set(key, slice);
    byCurrency.set(line.currency, slices);
  });
  return [...byCurrency.entries()]
    .map(([currency, slices]) => {
      const sorted = [...slices.values()].sort((first, second) => second.amount - first.amount);
      return { currency, total: sorted.reduce((sum, slice) => sum + slice.amount, 0), slices: sorted };
    })
    .sort((first, second) => second.total - first.total);
}
