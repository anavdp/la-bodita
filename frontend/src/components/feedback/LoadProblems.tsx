import { ApiError } from "../../api/client";
import { useTranslation } from "../../i18n/LanguageProvider";
import { secondaryButton } from "../playful/styles";
import type { LoadFailure } from "./problems";
import { hintFor } from "./useProblemText";

interface LoadProblemsProps {
  failures: LoadFailure[];
  onRetry: () => void;
  /** The screen's own frame for it (a card), when its lists sit in one. */
  className?: string;
}

/** The fault on our side outranks the rest: its reference is what the log is searched by. */
function mostTelling(failures: LoadFailure[]): unknown {
  const broken = failures.find(({ error }) => !(error instanceof ApiError) || error.kind === "broken");
  return (broken ?? failures[0]).error;
}

/**
 * The one way every screen says some of its lists did not load: which ones,
 * what to do about it, and a way to try again. The lists that did load stay
 * on screen below it.
 */
export function LoadProblems({ failures, onRetry, className = "p-2" }: LoadProblemsProps) {
  const { t, language } = useTranslation();
  if (failures.length === 0) return null;

  const parts = new Intl.ListFormat(language, { type: "conjunction" }).format(
    failures.map(({ part }) => t(part)),
  );
  const error = mostTelling(failures);
  // Rejected loads are rare (a wedding gone); "try again" is all there is to say.
  const hint = error instanceof ApiError && error.kind === "rejected" ? null : hintFor(error, t);

  return (
    <div role="alert" className={`flex flex-col items-start gap-3 ${className}`}>
      <p className="font-playful text-xl text-coral">{t("errors.couldNotLoad", { parts })}</p>
      {hint && <p className="font-playful text-lg text-ink/80">{hint}</p>}
      <button type="button" onClick={onRetry} className={secondaryButton}>
        {t("planning.retry")}
      </button>
    </div>
  );
}
