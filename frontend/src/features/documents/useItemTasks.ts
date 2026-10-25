import { useEffect, useState } from "react";

import { listTasks } from "../../api/tasks";
import type { Task } from "../../api/types";

/** The picked item's tasks, for a "which task" dropdown; none while no item is picked. */
export function useItemTasks(weddingId: number, itemId: number | null): Task[] {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let isCurrent = true;
    setTasks([]);
    if (itemId === null) return;
    listTasks(weddingId, { itemId })
      .then((loaded) => {
        if (isCurrent) setTasks(loaded);
      })
      .catch(() => {
        // The task is optional: without the list, the file still goes on the item.
      });
    return () => {
      isCurrent = false;
    };
  }, [weddingId, itemId]);

  return tasks;
}
