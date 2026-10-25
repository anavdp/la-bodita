import { useCallback, useEffect, useState } from "react";

import { listBudgetLines } from "../../api/budget";
import { listCalendarEvents } from "../../api/calendar";
import { listCategories } from "../../api/categories";
import { listDocuments, listPaperRequests, listPeople } from "../../api/documents";
import { listGuests } from "../../api/guests";
import { listItems } from "../../api/items";
import { listTasks } from "../../api/tasks";
import type {
  BudgetLine,
  CalendarEvent,
  Category,
  Guest,
  Item,
  PaperRequest,
  Person,
  Task,
  WeddingDocument,
} from "../../api/types";

export interface DashboardData {
  categories: Category[];
  items: Item[];
  tasks: Task[];
  events: CalendarEvent[];
  lines: BudgetLine[];
  guests: Guest[];
  requests: PaperRequest[];
  documents: WeddingDocument[];
  people: Person[];
}

export interface DashboardState extends DashboardData {
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
}

const nothingYet: DashboardData = {
  categories: [],
  items: [],
  tasks: [],
  events: [],
  lines: [],
  guests: [],
  requests: [],
  documents: [],
  people: [],
};

/** A little of every screen, read together, for the dashboard to sum up. It only reads. */
export function useDashboard(weddingId: number | null): DashboardState {
  const [data, setData] = useState<DashboardData>(nothingYet);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) return;
    try {
      const [categories, items, tasks, events, lines, guests, requests, documents, people] = await Promise.all([
        listCategories(weddingId),
        listItems(weddingId),
        listTasks(weddingId),
        listCalendarEvents(weddingId),
        listBudgetLines(weddingId),
        listGuests(weddingId),
        listPaperRequests(weddingId),
        listDocuments(weddingId),
        listPeople(weddingId),
      ]);
      setData({
        categories,
        items,
        tasks,
        events,
        lines,
        guests,
        requests,
        documents,
        people,
      });
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

  return {
    ...data,
    isLoading,
    hasLoadError,
    reload: () => {
      setIsLoading(true);
      void load();
    },
  };
}
