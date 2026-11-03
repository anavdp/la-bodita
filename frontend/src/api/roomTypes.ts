import { request } from "./client";
import type { RoomType, RoomTypeDraft } from "./types";

const roomTypesUrl = (weddingId: number) => `/api/weddings/${weddingId}/room-types`;

/** The payload's fields already read the same in app terms. */
export function listRoomTypes(weddingId: number): Promise<RoomType[]> {
  return request<RoomType[]>(roomTypesUrl(weddingId));
}

export function createRoomType(weddingId: number, draft: RoomTypeDraft): Promise<RoomType> {
  return request<RoomType>(roomTypesUrl(weddingId), { method: "POST", body: draft });
}

/** An empty `beds` clears it. */
export function updateRoomType(weddingId: number, roomTypeId: number, draft: RoomTypeDraft): Promise<RoomType> {
  return request<RoomType>(`${roomTypesUrl(weddingId)}/${roomTypeId}`, { method: "PATCH", body: draft });
}

/** Refused while any household has this room type booked. */
export function deleteRoomType(weddingId: number, roomTypeId: number): Promise<void> {
  return request<void>(`${roomTypesUrl(weddingId)}/${roomTypeId}`, { method: "DELETE" });
}
