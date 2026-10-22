import { useCallback, useEffect, useState } from "react";

import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from "../../api/calendar";
import { listCategories } from "../../api/categories";
import { listItems } from "../../api/items";
import { listTasks } from "../../api/tasks";
import type { CalendarEvent, CalendarEventDraft, Category, Item, Task } from "../../api/types";

export interface CalendarState {
  categories: Category[];
  items: Item[];
  tasks: Task[];
  events: CalendarEvent[];
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
  addEvent: (draft: CalendarEventDraft) => Promise<void>;
  editEvent: (eventId: number, draft: CalendarEventDraft) => Promise<void>;
  removeEvent: (eventId: number) => Promise<void>;
}

/**
 * The calendar's events with the dated tasks shown beside them, and the
 * categories and items that color and name both. A change re-reads them all.
 */
export function useCalendar(weddingId: number | null): CalendarState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) return;
    try {
      const [loadedCategories, loadedItems, loadedTasks, loadedEvents] = await Promise.all([
        listCategories(weddingId),
        listItems(weddingId),
        listTasks(weddingId),
        listCalendarEvents(weddingId),
      ]);
      setCategories(loadedCategories);
      setItems(loadedItems);
      setTasks(loadedTasks);
      setEvents(loadedEvents);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeThenReload = useCallback(
    async (change: (weddingId: number) => Promise<unknown>) => {
      if (weddingId === null) return;
      await change(weddingId);
      await load();
    },
    [weddingId, load],
  );

  return {
    categories,
    items,
    tasks,
    events,
    isLoading,
    hasLoadError,
    reload: () => {
      setIsLoading(true);
      void load();
    },
    addEvent: (draft) => changeThenReload((id) => createCalendarEvent(id, draft)),
    editEvent: (eventId, draft) => changeThenReload((id) => updateCalendarEvent(id, eventId, draft)),
    removeEvent: (eventId) => changeThenReload((id) => deleteCalendarEvent(id, eventId)),
  };
}
