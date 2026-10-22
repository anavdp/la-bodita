import type { BudgetLine, CalendarEvent, Category, Item, Task } from "../api/types";

let nextId = 1;

/** A plausible category; each test overrides only the fields it is about. */
export function aCategory(overrides: Partial<Category> = {}): Category {
  return { id: nextId++, name: "Church", emoji: "⛪", color: "#624cab", subcategories: [], ...overrides };
}

export function anItem(overrides: Partial<Item> = {}): Item {
  return {
    id: nextId++,
    name: "Iglesia San José",
    categoryId: null,
    subcategoryId: null,
    status: "idea",
    contactName: null,
    phone: null,
    email: null,
    instagramUrl: null,
    websiteUrl: null,
    notes: null,
    taskCount: 0,
    doneTaskCount: 0,
    nextTask: null,
    ...overrides,
  };
}

export function aTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId++,
    title: "Bring baptism certificates",
    isDone: false,
    dueDate: null,
    dueTime: null,
    notes: null,
    itemId: null,
    itemName: null,
    categoryId: null,
    ...overrides,
  };
}

export function aBudgetLine(overrides: Partial<BudgetLine> = {}): BudgetLine {
  return {
    id: nextId++,
    title: "Photo + video, 8 hours",
    status: "idea",
    currency: "USD",
    estimatedAmount: 1800,
    actualAmount: null,
    notes: null,
    itemId: null,
    itemName: null,
    categoryId: null,
    ...overrides,
  };
}

export function aCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: nextId++,
    title: "Bridal fair",
    startDate: "2026-11-07",
    endDate: null,
    startTime: null,
    notes: null,
    itemId: null,
    itemName: null,
    categoryId: null,
    ...overrides,
  };
}
