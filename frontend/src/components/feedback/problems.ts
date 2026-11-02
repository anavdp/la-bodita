import type { TranslationKey } from "../../i18n/translations";

/** A call that failed, with what it was doing ("errors.save") and why. */
export interface RequestFailure {
  failed: TranslationKey;
  error: unknown;
}

/**
 * What a form or screen tells the person: a plain message of its own (a name
 * left empty), or a failed call, whose text says what to do about it.
 */
export type Problem = TranslationKey | RequestFailure;

export function failedTo(failed: TranslationKey, error: unknown): RequestFailure {
  return { failed, error };
}

/** One list on a screen that did not load, named the way the screen says it ("your events"). */
export interface LoadFailure {
  part: TranslationKey;
  error: unknown;
}

/** One list a screen asked for, with how it went and where it goes once loaded. */
export interface LoadPart {
  part: TranslationKey;
  result: PromiseSettledResult<unknown>;
  apply: (value: unknown) => void;
}

export function loadPart<T>(part: TranslationKey, result: PromiseSettledResult<T>, apply: (value: T) => void): LoadPart {
  return { part, result, apply: (value) => apply(value as T) };
}

/**
 * Hands each list that loaded to its setter and collects the ones that did not,
 * so one failing list leaves the others on screen. The setter of a failed list
 * is not called, so whatever it showed before stays.
 */
export function keepWhatLoaded(parts: LoadPart[]): LoadFailure[] {
  const failures: LoadFailure[] = [];
  for (const { part, result, apply } of parts) {
    if (result.status === "fulfilled") {
      apply(result.value);
    } else {
      failures.push({ part, error: result.reason });
    }
  }
  return failures;
}

export function hasFailed(failures: LoadFailure[], part: TranslationKey): boolean {
  return failures.some((failure) => failure.part === part);
}
