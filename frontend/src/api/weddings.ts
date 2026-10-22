import { request } from "./client";
import type { Wedding, WeddingChanges } from "./types";

export function listWeddings(): Promise<Wedding[]> {
  return request<Wedding[]>("/api/weddings");
}

/** Only the fields named; a null date sends the countdown back to "to be decided". */
export function updateWedding(weddingId: number, changes: WeddingChanges): Promise<Wedding> {
  return request<Wedding>(`/api/weddings/${weddingId}`, { method: "PATCH", body: changes });
}
