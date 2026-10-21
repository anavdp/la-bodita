import type { Task } from "../../api/types";
import type { Language } from "../../i18n/translations";

export type TaskGroupKey = "overdue" | "thisWeek" | "later" | "noDate";

export interface TaskGroup {
  key: TaskGroupKey;
  tasks: Task[];
}

/** "2026-10-23" in the viewer's own calendar, so "today" turns over at their midnight. */
function toLocalDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(moment: Date): Date {
  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate());
}

/** The Sunday that closes the week `today` is in (weeks run Monday to Sunday). */
function endOfWeek(today: Date): Date {
  const daysToSunday = (7 - today.getDay()) % 7;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysToSunday);
}

export function isOverdue(task: Task, today: Date = new Date()): boolean {
  return !task.isDone && task.dueDate !== null && toLocalDay(task.dueDate) < startOfDay(today);
}

function groupOf(task: Task, today: Date): TaskGroupKey {
  if (task.dueDate === null) return "noDate";
  if (isOverdue(task, today)) return "overdue";
  return toLocalDay(task.dueDate) <= endOfWeek(today) ? "thisWeek" : "later";
}

const groupOrder: TaskGroupKey[] = ["overdue", "thisWeek", "later", "noDate"];

/** Open tasks under the checklist's headings, keeping the API's soonest-first order. */
export function groupOpenTasks(tasks: Task[], today: Date = new Date()): TaskGroup[] {
  const open = tasks.filter((task) => !task.isDone);
  return groupOrder
    .map((key) => ({ key, tasks: open.filter((task) => groupOf(task, today) === key) }))
    .filter((group) => group.tasks.length > 0);
}

/** "Fri, Oct 23" / "vie, 23 oct". */
export function formatDueDate(isoDate: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { weekday: "short", month: "short", day: "numeric" }).format(
    toLocalDay(isoDate),
  );
}

/** The API sends "19:00:00"; people read "19:00". */
export function formatDueTime(apiTime: string): string {
  return apiTime.slice(0, 5);
}
