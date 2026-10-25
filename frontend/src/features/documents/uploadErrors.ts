import { ApiError } from "../../api/client";
import type { TranslationKey } from "../../i18n/translations";

/** What to tell the user when an upload is refused: the bucket, the size and the type each have their own fix. */
export function uploadErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    if (error.status === 503) return "documents.form.notSetUp";
    if (error.status === 413) return "documents.form.tooLarge";
    if (error.status === 415) return "documents.form.wrongType";
  }
  return "planning.saveFailed";
}
