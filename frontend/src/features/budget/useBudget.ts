import { useCallback, useEffect, useState } from "react";

import { createBudgetLine, deleteBudgetLine, listBudgetLines, updateBudgetLine } from "../../api/budget";
import { listCategories } from "../../api/categories";
import { listItems } from "../../api/items";
import type { BudgetLine, BudgetLineDraft, BudgetLineStatus, Category, Item } from "../../api/types";

export interface BudgetState {
  categories: Category[];
  items: Item[];
  lines: BudgetLine[];
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
  addLine: (draft: BudgetLineDraft) => Promise<void>;
  editLine: (lineId: number, draft: BudgetLineDraft) => Promise<void>;
  removeLine: (lineId: number) => Promise<void>;
  setStatus: (lineId: number, status: BudgetLineStatus) => Promise<void>;
}

/**
 * The budget's lines with the categories and items they hang off. Flipping a
 * switch shows at once, since watching the total move is the point of the
 * screen; if the API refuses, the line goes back.
 */
export function useBudget(weddingId: number | null): BudgetState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) return;
    try {
      const [loadedCategories, loadedItems, loadedLines] = await Promise.all([
        listCategories(weddingId),
        listItems(weddingId),
        listBudgetLines(weddingId),
      ]);
      setCategories(loadedCategories);
      setItems(loadedItems);
      setLines(loadedLines);
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

  const setStatus = useCallback(
    async (lineId: number, status: BudgetLineStatus) => {
      if (weddingId === null) return;
      const withStatus = (next: BudgetLineStatus) =>
        setLines((current) => current.map((line) => (line.id === lineId ? { ...line, status: next } : line)));
      const previous = lines.find((line) => line.id === lineId)?.status;
      withStatus(status);
      try {
        const saved = await updateBudgetLine(weddingId, lineId, { status });
        setLines((current) => current.map((line) => (line.id === lineId ? saved : line)));
      } catch (error) {
        if (previous !== undefined) withStatus(previous);
        throw error;
      }
    },
    [weddingId, lines],
  );

  return {
    categories,
    items,
    lines,
    isLoading,
    hasLoadError,
    reload: () => {
      setIsLoading(true);
      void load();
    },
    addLine: (draft) => changeThenReload((id) => createBudgetLine(id, draft)),
    editLine: (lineId, draft) => changeThenReload((id) => updateBudgetLine(id, lineId, draft)),
    removeLine: (lineId) => changeThenReload((id) => deleteBudgetLine(id, lineId)),
    setStatus,
  };
}
