import { useCallback } from "react";

import { ApiError } from "../../api/client";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import type { Problem } from "./problems";

type Translate = ReturnType<typeof useTranslation>["t"];

/** What the person can do about a failure. Anything that is not an API error is a fault on our side. */
export function hintFor(error: unknown, t: Translate): string {
  const kind = error instanceof ApiError ? error.kind : "broken";
  const reference = error instanceof ApiError ? error.requestId : null;
  const hints: Record<Exclude<typeof kind, "broken">, TranslationKey> = {
    offline: "errors.offline",
    unavailable: "errors.unavailable",
    signedOut: "errors.signedOut",
    rejected: "errors.rejected",
  };
  if (kind !== "broken") return t(hints[kind]);
  return reference ? t("errors.broken", { reference }) : t("errors.brokenNoReference");
}

/** Turns a form's problem into the sentence it shows. */
export function useProblemText(): (problem: Problem) => string {
  const { t } = useTranslation();
  return useCallback(
    (problem: Problem) =>
      typeof problem === "string" ? t(problem) : `${t(problem.failed)} ${hintFor(problem.error, t)}`,
    [t],
  );
}
