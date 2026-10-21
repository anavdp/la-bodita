import type { Task } from "../../api/types";
import { formatDueDate, formatDueTime, groupOpenTasks, isOverdue } from "./schedule";

let nextId = 1;
const aTask = (overrides: Partial<Task> = {}): Task => ({
  id: nextId++,
  title: "Task",
  isDone: false,
  dueDate: null,
  dueTime: null,
  notes: null,
  itemId: null,
  itemName: null,
  categoryId: null,
  ...overrides,
});

// A Wednesday: its week runs to Sunday 25 October.
const today = new Date(2026, 9, 21, 15, 30);

describe("the checklist schedule", () => {
  it("given open tasks, when grouped, then they fall into overdue, this week, later and no date", () => {
    const late = aTask({ title: "Late", dueDate: "2026-10-20" });
    const todays = aTask({ title: "Today", dueDate: "2026-10-21" });
    const sunday = aTask({ title: "Sunday", dueDate: "2026-10-25" });
    const monday = aTask({ title: "Monday", dueDate: "2026-10-26" });
    const undated = aTask({ title: "Someday" });

    const groups = groupOpenTasks([late, todays, sunday, monday, undated], today);

    expect(groups.map((group) => [group.key, group.tasks.map((task) => task.title)])).toEqual([
      ["overdue", ["Late"]],
      ["thisWeek", ["Today", "Sunday"]],
      ["later", ["Monday"]],
      ["noDate", ["Someday"]],
    ]);
  });

  it("given done tasks among open ones, when grouped, then only the open ones are kept and empty groups are dropped", () => {
    const groups = groupOpenTasks([aTask({ isDone: true, dueDate: "2026-10-20" }), aTask({ title: "Someday" })], today);

    expect(groups.map((group) => group.key)).toEqual(["noDate"]);
  });

  it("given a Sunday, when grouped, then that same day is still this week", () => {
    const sunday = new Date(2026, 9, 25);

    const groups = groupOpenTasks([aTask({ dueDate: "2026-10-25" }), aTask({ dueDate: "2026-10-26" })], sunday);

    expect(groups.map((group) => group.key)).toEqual(["thisWeek", "later"]);
  });

  it("given a past date, when checked, then an open task is overdue but a done one is not", () => {
    expect(isOverdue(aTask({ dueDate: "2026-10-20" }), today)).toBe(true);
    expect(isOverdue(aTask({ dueDate: "2026-10-20", isDone: true }), today)).toBe(false);
    expect(isOverdue(aTask({ dueDate: "2026-10-21" }), today)).toBe(false);
    expect(isOverdue(aTask(), today)).toBe(false);
  });

  it("given an ISO date, when formatted, then it reads as a short weekday and date in the language", () => {
    expect(formatDueDate("2026-10-23", "en")).toBe("Fri, Oct 23");
    expect(formatDueDate("2026-10-23", "es")).toBe("vie, 23 oct");
  });

  it("given an API time, when formatted, then it drops the seconds", () => {
    expect(formatDueTime("19:00:00")).toBe("19:00");
  });
});
