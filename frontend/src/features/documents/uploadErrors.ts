import { ApiError } from "../../api/client";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";

/**
 * What to tell the user when an upload is refused: the bucket, the size and the
 * type each have their own fix; anything else says why the save failed.
 */
export function uploadErrorKey(error: unknown): Problem {
  if (error instanceof ApiError) {
    if (error.status === 503) return "documents.form.notSetUp";
    if (error.status === 413) return "documents.form.tooLarge";
    if (error.status === 415) return "documents.form.wrongType";
  }
  return failedTo("errors.save", error);
}
