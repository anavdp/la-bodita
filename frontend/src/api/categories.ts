import { request } from "./client";
import type { Category, CategoryDraft, Subcategory } from "./types";

interface SubcategoryPayload {
  id: number;
  category_id: number;
  name: string;
  emoji: string | null;
  color: string;
}

interface CategoryPayload {
  id: number;
  name: string;
  emoji: string | null;
  color: string;
  subcategories: SubcategoryPayload[];
  is_private: boolean;
  is_mine: boolean;
}

function toSubcategory(payload: SubcategoryPayload): Subcategory {
  return {
    id: payload.id,
    categoryId: payload.category_id,
    name: payload.name,
    emoji: payload.emoji,
    color: payload.color,
  };
}

function toCategory(payload: CategoryPayload): Category {
  return {
    id: payload.id,
    name: payload.name,
    emoji: payload.emoji,
    color: payload.color,
    subcategories: payload.subcategories.map(toSubcategory),
    isPrivate: payload.is_private,
    isMine: payload.is_mine,
  };
}

/** Only the fields named, in API terms. */
function toPayload({ isPrivate, ...rest }: Partial<CategoryDraft>): Record<string, unknown> {
  return isPrivate === undefined ? rest : { ...rest, is_private: isPrivate };
}

const categoriesUrl = (weddingId: number) => `/api/weddings/${weddingId}/categories`;

/** Alphabetical, each with its subcategories. */
export async function listCategories(weddingId: number): Promise<Category[]> {
  const payloads = await request<CategoryPayload[]>(categoriesUrl(weddingId));
  return payloads.map(toCategory);
}

export async function createCategory(weddingId: number, draft: CategoryDraft): Promise<Category> {
  const payload = await request<CategoryPayload>(categoriesUrl(weddingId), { method: "POST", body: toPayload(draft) });
  return toCategory(payload);
}

/** Only the fields named; a null emoji clears it. */
export async function updateCategory(
  weddingId: number,
  categoryId: number,
  changes: Partial<CategoryDraft>,
): Promise<Category> {
  const payload = await request<CategoryPayload>(`${categoriesUrl(weddingId)}/${categoryId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toCategory(payload);
}

/** Its subcategories go with it; its items stay, with no category. */
export function deleteCategory(weddingId: number, categoryId: number): Promise<void> {
  return request<void>(`${categoriesUrl(weddingId)}/${categoryId}`, { method: "DELETE" });
}
