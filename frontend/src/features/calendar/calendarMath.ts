import type { CalendarEvent, Task } from "../../api/types";

/**
 * A task with a date or a calendar event, as one thing on the calendar. Dates
 * are ISO strings throughout, which compare and sort as dates do.
 */
export type CalendarEntry =
  | (EntryFields & { kind: "task"; source: Task })
  | (EntryFields & { kind: "event"; source: CalendarEvent });

interface EntryFields {
  key: string;
  title: string;
  startDate: string;
  /** The last day it is on: its start day unless it is a range. */
  endDate: string;
  /** "HH:MM:SS", or null for all day. */
  time: string | null;
  isDone: boolean;
  itemName: string | null;
  categoryId: number | null;
}

export const toIso = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

/** "2026-10-22" as that day in the viewer's own calendar. */
export function fromIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const addDays = (iso: string, days: number) => {
  const day = fromIso(iso);
  return toIso(new Date(day.getFullYear(), day.getMonth(), day.getDate() + days));
};

/**
 * The weeks a month grid shows, Monday first (the planners are in Venezuela,
 * Italy and Spain), padded with the days of the months around it.
 */
export function monthWeeks(year: number, monthIndex: number): string[][] {
  const first = new Date(year, monthIndex, 1);
  const daysBefore = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekCount = Math.ceil((daysBefore + daysInMonth) / 7);
  const start = toIso(new Date(year, monthIndex, 1 - daysBefore));
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => addDays(start, week * 7 + weekday)),
  );
}

/** Dated tasks and every event; a task without a date has no day to sit on. */
export function toEntries(tasks: Task[], events: CalendarEvent[]): CalendarEntry[] {
  const fromTasks: CalendarEntry[] = tasks
    .filter((task) => task.dueDate !== null)
    .map((task) => ({
      kind: "task",
      source: task,
      key: `task-${task.id}`,
      title: task.title,
      startDate: task.dueDate as string,
      endDate: task.dueDate as string,
      time: task.dueTime,
      isDone: task.isDone,
      itemName: task.itemName,
      categoryId: task.categoryId,
    }));
  const fromEvents: CalendarEntry[] = events.map((event) => ({
    kind: "event",
    source: event,
    key: `event-${event.id}`,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate ?? event.startDate,
    time: event.startTime,
    isDone: false,
    itemName: event.itemName,
    categoryId: event.categoryId,
  }));
  return [...fromTasks, ...fromEvents].sort(bySoonest);
}

/** Soonest first; on the same day, all-day things before timed ones. */
function bySoonest(a: CalendarEntry, b: CalendarEntry): number {
  return (
    a.startDate.localeCompare(b.startDate) ||
    Number(a.time !== null) - Number(b.time !== null) ||
    (a.time ?? "").localeCompare(b.time ?? "")
  );
}

/** Everything on a day, ranges included; all-day things first, then by time. */
export function entriesOn(entries: CalendarEntry[], iso: string): CalendarEntry[] {
  const onDay = entries.filter((entry) => entry.startDate <= iso && iso <= entry.endDate);
  return onDay.sort(
    (a, b) => Number(a.time !== null) - Number(b.time !== null) || (a.time ?? "").localeCompare(b.time ?? ""),
  );
}

/**
 * Open things not over yet, soonest first: a trip already under way still
 * counts. With `days`, only those starting within that many days of today.
 */
export function upcoming(entries: CalendarEntry[], todayIso: string, days?: number): CalendarEntry[] {
  const horizon = days === undefined ? null : addDays(todayIso, days);
  return entries.filter(
    (entry) => !entry.isDone && entry.endDate >= todayIso && (horizon === null || entry.startDate <= horizon),
  );
}
