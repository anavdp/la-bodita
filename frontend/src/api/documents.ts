import { apiUrl, request } from "./client";
import type {
  DocumentChanges,
  DocumentUpload,
  PaperRequest,
  PaperRequestChanges,
  PaperRequestDraft,
  Person,
  WeddingDocument,
} from "./types";

interface DocumentPayload {
  id: number;
  title: string;
  kind: WeddingDocument["kind"];
  file_name: string;
  content_type: string;
  size_bytes: number;
  item_id: number | null;
  item_name: string | null;
  category_id: number | null;
  requirement_id: number | null;
  requirement_title: string | null;
  person_id: number | null;
  issued_on: string | null;
  expires_on: string | null;
  uploaded_by_id: number | null;
  created_at: string;
}

interface PaperRequestPayload {
  id: number;
  name: string;
  item_id: number;
  item_name: string;
  category_id: number | null;
  requirement_id: number | null;
  requirement_title: string | null;
  person_id: number | null;
  document_id: number | null;
  document_title: string | null;
  is_missing: boolean;
}

/** Every field the app names, in API terms; each call sends only the ones it has. */
const payloadKeys: Record<string, string> = {
  title: "title",
  kind: "kind",
  name: "name",
  itemId: "item_id",
  requirementId: "requirement_id",
  personId: "person_id",
  documentId: "document_id",
  issuedOn: "issued_on",
  expiresOn: "expires_on",
};

function toDocument(payload: DocumentPayload): WeddingDocument {
  return {
    id: payload.id,
    title: payload.title,
    kind: payload.kind,
    fileName: payload.file_name,
    contentType: payload.content_type,
    sizeBytes: payload.size_bytes,
    itemId: payload.item_id,
    itemName: payload.item_name,
    categoryId: payload.category_id,
    requirementId: payload.requirement_id,
    requirementTitle: payload.requirement_title,
    personId: payload.person_id,
    issuedOn: payload.issued_on,
    expiresOn: payload.expires_on,
    uploadedById: payload.uploaded_by_id,
    createdAt: payload.created_at,
  };
}

function toPaperRequest(payload: PaperRequestPayload): PaperRequest {
  return {
    id: payload.id,
    name: payload.name,
    itemId: payload.item_id,
    itemName: payload.item_name,
    categoryId: payload.category_id,
    requirementId: payload.requirement_id,
    requirementTitle: payload.requirement_title,
    personId: payload.person_id,
    documentId: payload.document_id,
    documentTitle: payload.document_title,
    isMissing: payload.is_missing,
  };
}

function toPayload(changes: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(changes).map(([key, value]) => [payloadKeys[key], value]));
}

const documentsUrl = (weddingId: number) => `/api/weddings/${weddingId}/documents`;
const requestsUrl = (weddingId: number) => `/api/weddings/${weddingId}/paper-requests`;

/** "?item_id=7": only the filters given. */
function queryOf(filter: Record<string, number | undefined>): string {
  const pairs = Object.entries(filter).filter(([, value]) => value !== undefined);
  return pairs.length === 0 ? "" : `?${pairs.map(([key, value]) => `${payloadKeys[key]}=${value}`).join("&")}`;
}

/** Newest first; `itemId` or `requirementId` narrows it to one item's or one task's. */
export async function listDocuments(
  weddingId: number,
  filter: { itemId?: number; requirementId?: number } = {},
): Promise<WeddingDocument[]> {
  const query = queryOf(filter);
  const payloads = await request<DocumentPayload[]>(`${documentsUrl(weddingId)}${query}`);
  return payloads.map(toDocument);
}

/** The file and what goes with it, as a form; blank fields are left for the API to default. */
export async function uploadDocument(weddingId: number, file: File, upload: DocumentUpload): Promise<WeddingDocument> {
  const form = new FormData();
  form.append("file", file);
  Object.entries(toPayload(upload)).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") form.append(key, String(value));
  });
  const payload = await request<DocumentPayload>(documentsUrl(weddingId), { method: "POST", body: form });
  return toDocument(payload);
}

/** Where the browser opens the file: the API answers with a link that lasts a few minutes. */
export function documentFileUrl(weddingId: number, documentId: number): string {
  return apiUrl(`${documentsUrl(weddingId)}/${documentId}/file`);
}

export async function updateDocument(
  weddingId: number,
  documentId: number,
  changes: DocumentChanges,
): Promise<WeddingDocument> {
  const payload = await request<DocumentPayload>(`${documentsUrl(weddingId)}/${documentId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toDocument(payload);
}

export function deleteDocument(weddingId: number, documentId: number): Promise<void> {
  return request<void>(`${documentsUrl(weddingId)}/${documentId}`, { method: "DELETE" });
}

/** In the order they were asked for; `itemId` narrows it to one item's. */
export async function listPaperRequests(weddingId: number, filter: { itemId?: number } = {}): Promise<PaperRequest[]> {
  const query = queryOf(filter);
  const payloads = await request<PaperRequestPayload[]>(`${requestsUrl(weddingId)}${query}`);
  return payloads.map(toPaperRequest);
}

export async function createPaperRequest(weddingId: number, draft: PaperRequestDraft): Promise<PaperRequest> {
  const payload = await request<PaperRequestPayload>(requestsUrl(weddingId), { method: "POST", body: toPayload(draft) });
  return toPaperRequest(payload);
}

/** Pointing it at a paper answers it; pointing it at none makes it missing again. */
export async function updatePaperRequest(
  weddingId: number,
  requestId: number,
  changes: PaperRequestChanges,
): Promise<PaperRequest> {
  const payload = await request<PaperRequestPayload>(`${requestsUrl(weddingId)}/${requestId}`, {
    method: "PATCH",
    body: toPayload(changes),
  });
  return toPaperRequest(payload);
}

export function deletePaperRequest(weddingId: number, requestId: number): Promise<void> {
  return request<void>(`${requestsUrl(weddingId)}/${requestId}`, { method: "DELETE" });
}

/** The two of us: whose paper is whose. */
export async function listPeople(weddingId: number): Promise<Person[]> {
  const payloads = await request<{ id: number; display_name: string }[]>(`/api/weddings/${weddingId}/people`);
  return payloads.map((payload) => ({ id: payload.id, displayName: payload.display_name }));
}
