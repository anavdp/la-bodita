import { request } from "./client";
import type { Wedding } from "./types";

export function listWeddings(): Promise<Wedding[]> {
  return request<Wedding[]>("/api/weddings");
}
