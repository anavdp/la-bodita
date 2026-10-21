import { request } from "./client";
import type { Task, TaskChanges, TaskDraft } from "./types";

/** The API calls checklist tasks "requirements", after the data model. */
interface TaskPayload {
  id: number;
  title: string;
  is_done: boolean;
  due_date: string | null;
  due_time: string | null;
  notes: string | null;
  item_id: number | null;
  item_name: string | null;
  category_id: number | null;
}

const payloadKeys: Record<keyof TaskChanges, string> = {
  title: "title",
  itemId: "item_id",
  dueDate: "due_date",
  dueTime: "due_time",
  isDone: "is_done",
};

function toTask(payload: TaskPayload): Task {
  return {
    id: payload.id,
    title: payload.title,
    isDone: payload.is_done,
    dueDate: payload.due_date,
    dueTime: payload.due_time,
    notes: payload.notes,
    itemId: payload.item_id,
    itemName: payload.item_name,
    categoryId: payload.category_id,
  };
}

function toPayload(changes: TaskChanges): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [payloadKeys[key as keyof TaskChanges], value]),
  );
}

const tasksUrl = (weddingId: number) => `/api/weddings/${weddingId}/requirements`;

/** Soonest first, undated last; `itemId` narrows it to one item's tasks. */
export async function listTasks(weddingId: number, filter: { itemId?: number } = {}): Promise<Task[]> {
  const query = filter.itemId === undefined ? "" : `?item_id=${filter.itemId}`;
  const payloads = await request<TaskPayload[]>(`${tasksUrl(weddingId)}${query}`);
  return payloads.map(toTask);
}

export async function createTask(weddingId: number, draft: TaskDraft): Promise<Task> {
  const payload = await request<TaskPayload>(tasksUrl(weddingId), { method: "POST", body: toPayload(draft) });
  return toTask(payload);
}

export async function updateTask(weddingId: number, taskId: number, changes: TaskChanges): Promise<Task> {
  const payload = await request<TaskPayload>(`${tasksUrl(weddingId)}/${taskId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toTask(payload);
}

export function deleteTask(weddingId: number, taskId: number): Promise<void> {
  return request<void>(`${tasksUrl(weddingId)}/${taskId}`, { method: "DELETE" });
}
