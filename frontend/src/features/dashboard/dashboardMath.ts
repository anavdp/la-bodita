import type { PaperRequest, Person, Task, WeddingDocument } from "../../api/types";
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

/** Papers still to get, a copy per person, as the Documents screen's table counts them. */
export function missingPaperCount(
  requests: PaperRequest[],
  documents: WeddingDocument[],
  people: Person[],
  todayIso: string,
): number {
  return paperRows(requests, documents, people, todayIso)
    .flatMap((row) => row.cells)
    .filter((cell) => cell.state === "missing").length;
}
