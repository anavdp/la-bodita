import { ApiError } from "../../api/client";
import type { ErrorKind } from "../../api/client";
import { useTranslation } from "../../i18n/LanguageProvider";
import { compactButton } from "../playful/styles";
import type { LoadFailure } from "./problems";
import { hintFor } from "./useProblemText";

interface LoadProblemsProps {
  failures: LoadFailure[];
  onRetry: () => void;
}

/** One picture per thing the person can do about it. */
const icons: Record<ErrorKind, string> = {
  offline: "wifi_off",
  unavailable: "cloud_off",
  signedOut: "lock",
  rejected: "block",
  broken: "error",
};

const kindOf = (error: unknown): ErrorKind => (error instanceof ApiError ? error.kind : "broken");

/** The fault on our side outranks the rest: its reference is what the log is searched by. */
function mostTelling(failures: LoadFailure[]): unknown {
  const broken = failures.find(({ error }) => kindOf(error) === "broken");
  return (broken ?? failures[0]).error;
}

/**
 * The one way every screen says some of its lists did not load: a notice card
 * of its own above the screen's content, naming which lists, what to do about
 * it, and a way to try again. The lists that did load stay on screen below it.
 */
export function LoadProblems({ failures, onRetry }: LoadProblemsProps) {
  const { t, language } = useTranslation();
  if (failures.length === 0) return null;

  const parts = new Intl.ListFormat(language, { type: "conjunction" }).format(failures.map(({ part }) => t(part)));
  const error = mostTelling(failures);
  const kind = kindOf(error);
  // Rejected loads are rare (a wedding gone); "try again" is all there is to say.
  const hint = kind === "rejected" ? null : hintFor(error, t);

  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-4 rounded-[28px] border-[2.5px] border-ink bg-coral-soft px-5 py-4 font-playful text-ink shadow-[4px_4px_0_rgba(31,29,43,0.15)] sm:flex-row sm:items-center sm:px-6"
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-cream-light"
        >
          <span className="material-symbols-outlined text-[28px]">{icons[kind]}</span>
        </span>
        <div className="min-w-0">
          <p className="text-xl leading-snug">{t("errors.couldNotLoad", { parts })}</p>
          {hint && <p className="mt-1 text-base text-ink/80">{hint}</p>}
        </div>
      </div>
      <button type="button" onClick={onRetry} className={`${compactButton} shrink-0 self-start sm:self-center`}>
        <span className="material-symbols-outlined text-xl" aria-hidden="true">
          refresh
        </span>
        {t("planning.retry")}
      </button>
    </div>
  );
}
