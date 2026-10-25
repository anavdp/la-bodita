import { request } from "./client";
import type { Item, ItemDraft } from "./types";

interface ItemPayload {
  id: number;
  name: string;
  category_id: number | null;
  subcategory_id: number | null;
  status: Item["status"];
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  instagram_url: string | null;
  website_url: string | null;
  notes: string | null;
  task_count: number;
  done_task_count: number;
  next_task: { id: number; title: string; due_date: string; due_time: string | null } | null;
  is_private: boolean;
  is_mine: boolean;
}

const payloadKeys: Record<keyof ItemDraft, string> = {
  name: "name",
  categoryId: "category_id",
  subcategoryId: "subcategory_id",
  status: "status",
  contactName: "contact_name",
  phone: "phone",
  email: "email",
  instagramUrl: "instagram_url",
  websiteUrl: "website_url",
  notes: "notes",
  isPrivate: "is_private",
};

function toItem(payload: ItemPayload): Item {
  return {
    id: payload.id,
    name: payload.name,
    categoryId: payload.category_id,
    subcategoryId: payload.subcategory_id,
    status: payload.status,
    contactName: payload.contact_name,
    phone: payload.phone,
    email: payload.email,
    instagramUrl: payload.instagram_url,
    websiteUrl: payload.website_url,
    notes: payload.notes,
    taskCount: payload.task_count,
    doneTaskCount: payload.done_task_count,
    nextTask: payload.next_task && {
      id: payload.next_task.id,
      title: payload.next_task.title,
      dueDate: payload.next_task.due_date,
      dueTime: payload.next_task.due_time,
    },
    isPrivate: payload.is_private,
    isMine: payload.is_mine,
  };
}

/** Only the fields named, so a status change leaves everything else alone. */
function toPayload(changes: Partial<ItemDraft>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [payloadKeys[key as keyof ItemDraft], value]),
  );
}

const itemsUrl = (weddingId: number) => `/api/weddings/${weddingId}/items`;

/** Alphabetical, each with its task progress and next dated task. */
export async function listItems(weddingId: number): Promise<Item[]> {
  const payloads = await request<ItemPayload[]>(itemsUrl(weddingId));
  return payloads.map(toItem);
}

export async function createItem(weddingId: number, draft: ItemDraft): Promise<Item> {
  const payload = await request<ItemPayload>(itemsUrl(weddingId), { method: "POST", body: toPayload(draft) });
  return toItem(payload);
}

export async function updateItem(weddingId: number, itemId: number, changes: Partial<ItemDraft>): Promise<Item> {
  const payload = await request<ItemPayload>(`${itemsUrl(weddingId)}/${itemId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toItem(payload);
}

/** Its tasks go with it. */
export function deleteItem(weddingId: number, itemId: number): Promise<void> {
  return request<void>(`${itemsUrl(weddingId)}/${itemId}`, { method: "DELETE" });
}
