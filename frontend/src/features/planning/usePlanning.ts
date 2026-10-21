import { useCallback, useEffect, useState } from "react";

import { createCategory, listCategories } from "../../api/categories";
import { createItem, deleteItem, listItems, updateItem } from "../../api/items";
import { createTask, deleteTask, listTasks, updateTask } from "../../api/tasks";
import type { Category, CategoryDraft, Item, ItemDraft, Task, TaskDraft } from "../../api/types";

export interface PlanningState {
  categories: Category[];
  items: Item[];
  tasks: Task[];
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
  addCategory: (draft: CategoryDraft) => Promise<void>;
  addItem: (draft: ItemDraft) => Promise<void>;
  editItem: (itemId: number, changes: Partial<ItemDraft>) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  addTask: (draft: TaskDraft) => Promise<void>;
  setTaskDone: (taskId: number, isDone: boolean) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
}

/**
 * Categories, items and every task of one wedding, read together: the items
 * screen and the checklist both show all three. A change re-reads them all,
 * quietly, since a task moves its item's next date and counts; only the first
 * load shows as loading.
 */
export function usePlanning(weddingId: number | null): PlanningState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) return;
    try {
      const [loadedCategories, loadedItems, loadedTasks] = await Promise.all([
        listCategories(weddingId),
        listItems(weddingId),
        listTasks(weddingId),
      ]);
      setCategories(loadedCategories);
      setItems(loadedItems);
      setTasks(loadedTasks);
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

  /** A tick shows at once; if the API refuses, it goes back. */
  const setTaskDone = useCallback(
    async (taskId: number, isDone: boolean) => {
      if (weddingId === null) return;
      const withDone = (done: boolean) =>
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, isDone: done } : task)));
      withDone(isDone);
      try {
        await updateTask(weddingId, taskId, { isDone });
      } catch (error) {
        withDone(!isDone);
        throw error;
      }
      await load();
    },
    [weddingId, load],
  );

  return {
    categories,
    items,
    tasks,
    isLoading,
    hasLoadError,
    reload: () => {
      setIsLoading(true);
      void load();
    },
    addCategory: (draft) => changeThenReload((id) => createCategory(id, draft)),
    addItem: (draft) => changeThenReload((id) => createItem(id, draft)),
    editItem: (itemId, changes) => changeThenReload((id) => updateItem(id, itemId, changes)),
    removeItem: (itemId) => changeThenReload((id) => deleteItem(id, itemId)),
    addTask: (draft) => changeThenReload((id) => createTask(id, draft)),
    setTaskDone,
    removeTask: (taskId) => changeThenReload((id) => deleteTask(id, taskId)),
  };
}
