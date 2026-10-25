import { useCallback, useEffect, useState } from "react";

import { listCategories } from "../../api/categories";
import {
  createPaperRequest,
  deleteDocument,
  deletePaperRequest,
  listDocuments,
  listPaperRequests,
  listPeople,
  updateDocument,
  updatePaperRequest,
  uploadDocument,
} from "../../api/documents";
import { listItems } from "../../api/items";
import type {
  Category,
  DocumentChanges,
  DocumentUpload,
  Item,
  PaperRequest,
  PaperRequestDraft,
  Person,
  WeddingDocument,
} from "../../api/types";

export interface DocumentsState {
  categories: Category[];
  items: Item[];
  documents: WeddingDocument[];
  requests: PaperRequest[];
  people: Person[];
  isLoading: boolean;
  hasLoadError: boolean;
  reload: () => void;
  /** Uploads each file with the same details; a paper then answers the requests named. */
  upload: (files: File[], details: DocumentUpload, answers?: number[]) => Promise<void>;
  editDocument: (documentId: number, changes: DocumentChanges) => Promise<void>;
  removeDocument: (documentId: number) => Promise<void>;
  askForPaper: (draft: PaperRequestDraft) => Promise<void>;
  /** Points requests at a paper already uploaded: one passport answers every office. */
  answer: (requestIds: number[], documentId: number) => Promise<void>;
  removeRequest: (requestId: number) => Promise<void>;
}

/**
 * Every file and every paper asked for, with what they hang off, or only one
 * item's (`itemId`, for the item detail). Each change reloads the lot.
 */
export function useDocuments(weddingId: number | null, itemId?: number): DocumentsState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [documents, setDocuments] = useState<WeddingDocument[]>([]);
  const [requests, setRequests] = useState<PaperRequest[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    if (weddingId === null) return;
    try {
      const [loadedCategories, loadedItems, loadedDocuments, loadedRequests, loadedPeople] = await Promise.all([
        // One item's detail already has its categories and items around it.
        itemId === undefined ? listCategories(weddingId) : [],
        itemId === undefined ? listItems(weddingId) : [],
        listDocuments(weddingId, { itemId }),
        listPaperRequests(weddingId, { itemId }),
        listPeople(weddingId),
      ]);
      setCategories(loadedCategories);
      setItems(loadedItems);
      setDocuments(loadedDocuments);
      setRequests(loadedRequests);
      setPeople(loadedPeople);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [weddingId, itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeThenReload = useCallback(
    async (change: (weddingId: number) => Promise<unknown>) => {
      if (weddingId === null) return;
      try {
        await change(weddingId);
      } finally {
        // Some files of a batch may have gone up before one failed: show what is there.
        await load();
      }
    },
    [weddingId, load],
  );

  return {
    categories,
    items,
    documents,
    requests,
    people,
    isLoading,
    hasLoadError,
    reload: () => {
      setIsLoading(true);
      void load();
    },
    upload: (files, details, answers = []) =>
      changeThenReload(async (id) => {
        for (const file of files) {
          const document = await uploadDocument(id, file, details);
          await Promise.all(answers.map((requestId) => updatePaperRequest(id, requestId, { documentId: document.id })));
        }
      }),
    editDocument: (documentId, changes) => changeThenReload((id) => updateDocument(id, documentId, changes)),
    removeDocument: (documentId) => changeThenReload((id) => deleteDocument(id, documentId)),
    askForPaper: (draft) => changeThenReload((id) => createPaperRequest(id, draft)),
    answer: (requestIds, documentId) =>
      changeThenReload((id) =>
        Promise.all(requestIds.map((requestId) => updatePaperRequest(id, requestId, { documentId }))),
      ),
    removeRequest: (requestId) => changeThenReload((id) => deletePaperRequest(id, requestId)),
  };
}
