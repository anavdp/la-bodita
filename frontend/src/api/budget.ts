import { request } from "./client";
import type { BudgetLine, BudgetLineChanges, BudgetLineDraft } from "./types";

interface BudgetLinePayload {
  id: number;
  title: string;
  status: BudgetLine["status"];
  currency: string;
  estimated_amount: number | null;
  actual_amount: number | null;
  notes: string | null;
  item_id: number | null;
  item_name: string | null;
  category_id: number | null;
}

const payloadKeys: Record<keyof BudgetLineChanges, string> = {
  title: "title",
  itemId: "item_id",
  status: "status",
  currency: "currency",
  estimatedAmount: "estimated_amount",
  actualAmount: "actual_amount",
  notes: "notes",
};

function toBudgetLine(payload: BudgetLinePayload): BudgetLine {
  return {
    id: payload.id,
    title: payload.title,
    status: payload.status,
    currency: payload.currency,
    estimatedAmount: payload.estimated_amount,
    actualAmount: payload.actual_amount,
    notes: payload.notes,
    itemId: payload.item_id,
    itemName: payload.item_name,
    categoryId: payload.category_id,
  };
}

/** Only the fields named, so switching a line on leaves everything else alone. */
function toPayload(changes: BudgetLineChanges): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [payloadKeys[key as keyof BudgetLineChanges], value]),
  );
}

const budgetUrl = (weddingId: number) => `/api/weddings/${weddingId}/budget-lines`;

/** In the order they were added; the screen groups them by category. */
export async function listBudgetLines(weddingId: number): Promise<BudgetLine[]> {
  const payloads = await request<BudgetLinePayload[]>(budgetUrl(weddingId));
  return payloads.map(toBudgetLine);
}

export async function createBudgetLine(weddingId: number, draft: BudgetLineDraft): Promise<BudgetLine> {
  const payload = await request<BudgetLinePayload>(budgetUrl(weddingId), { method: "POST", body: toPayload(draft) });
  return toBudgetLine(payload);
}

export async function updateBudgetLine(
  weddingId: number,
  lineId: number,
  changes: BudgetLineChanges,
): Promise<BudgetLine> {
  const payload = await request<BudgetLinePayload>(`${budgetUrl(weddingId)}/${lineId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toBudgetLine(payload);
}

export function deleteBudgetLine(weddingId: number, lineId: number): Promise<void> {
  return request<void>(`${budgetUrl(weddingId)}/${lineId}`, { method: "DELETE" });
}
