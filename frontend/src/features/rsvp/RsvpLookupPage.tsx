import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { lookUpInvitation } from "../../api/rsvp";
import type { RsvpHouseholdMatch } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "../guests/filtering";
import { emphasize } from "./emphasize";
import { photoUrl } from "./photos";
import { RsvpFrame } from "./RsvpFrame";
import { GuestTitle } from "./TitleWithDate";

const field =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-lg text-on-surface focus:border-on-secondary-fixed-variant focus:outline-none";
const fieldLabel = "mb-2 block text-[15px] font-semibold text-on-surface";

const rsvpPath = (token: string) => `/rsvp/${encodeURIComponent(token)}`;

/**
 * What happens from here, in order. Each number sits in a filled circle, with
 * a thin line down to the next one; the list itself is what reads as numbered.
 */
function Steps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="mb-6 flex flex-col">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-on-secondary-fixed-variant text-[15px] font-bold text-on-primary"
            >
              {index + 1}
            </span>
            {index < steps.length - 1 && <span aria-hidden="true" className="w-0.5 flex-1 bg-primary-container" />}
          </div>
          <div className={`pt-1 text-body-lg text-on-surface ${index < steps.length - 1 ? "pb-5" : ""}`}>{step}</div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The one public link the couple shares: a guest types their full name and
 * lands on their household's invitation. When a name is shared by several
 * households, the guest picks theirs by who is in it.
 */
export function RsvpLookupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<RsvpHouseholdMatch[]>([]);
  const [problem, setProblem] = useState<TranslationKey | null>(null);

  // Two letters at least, as the API asks.
  const canSearch = name.trim().length >= 2 && !isSearching;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProblem(null);
    setMatches([]);
    setIsSearching(true);
    try {
      const found = await lookUpInvitation(name.trim());
      if (found.length === 1) {
        navigate(rsvpPath(found[0].token));
      } else if (found.length === 0) {
        setProblem("rsvp.lookup.notFound");
      } else {
        setMatches(found);
      }
    } catch (failure: unknown) {
      setProblem(failure instanceof ApiError && failure.status === 429 ? "rsvp.lookup.tooMany" : "rsvp.lookup.failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <RsvpFrame picture={photoUrl("rsvp-lookup.jpg")} phonePicture={photoUrl("rsvp-lookup-phone.jpg")}>
      {/* No date under the title here: the last step carries it. */}
      <div className="mb-4">
        <GuestTitle title={t("rsvp.lookup.title")} size="text-[32px] sm:text-[40px]" />
      </div>
      <p className="text-body-lg text-on-surface">{t("rsvp.lookup.welcome")}</p>
      <p className="mb-6 mt-2 text-right font-bold text-on-secondary-fixed-variant">{t("rsvp.lookup.signature")}</p>

      <p className="mb-3 text-body-lg text-on-surface">{t("rsvp.lookup.nextSteps")}</p>
      <Steps
        steps={[
          <>
            {emphasize(t("rsvp.lookup.step.answer"), { date: <strong>{t("rsvp.deadlineDate")}</strong> })}
            <span className="mt-1 block text-body-sm text-on-surface-variant">{t("rsvp.lookup.step.answerNote")}</span>
          </>,
          t("rsvp.lookup.step.invitation"),
          emphasize(t("rsvp.lookup.step.meet"), {
            place: <strong>{t("rsvp.lookup.place")}</strong>,
            date: <strong>{t("rsvp.weddingDate")}</strong>,
          }),
        ]}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={fieldLabel} htmlFor="rsvp-name">
            {t("rsvp.lookup.name")}
          </label>
          <input
            id="rsvp-name"
            className={field}
            autoComplete="name"
            placeholder={t("rsvp.lookup.namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        {problem !== null && (
          <p role="alert" className="text-body-sm text-error">
            {t(problem)}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSearch}
          className="mt-2 w-full rounded-full bg-on-secondary-fixed-variant py-4 text-[17px] font-bold text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t(isSearching ? "rsvp.lookup.searching" : "rsvp.lookup.search")}
        </button>
      </form>

      {matches.length > 1 && (
        <section className="mt-6 flex flex-col gap-3">
          <p className="text-[18px] font-semibold text-on-surface">{t("rsvp.lookup.choose")}</p>
          {matches.map((match) => (
            <button
              key={match.token}
              type="button"
              onClick={() => navigate(rsvpPath(match.token))}
              className="rounded-lg border border-outline-variant px-4 py-3 text-left transition-colors hover:border-on-secondary-fixed-variant hover:bg-primary-fixed"
            >
              {/* Who is in it, not the household's own name: that is for the couple's planning. */}
              <span className="block text-body-lg text-on-surface">
                {match.members.map(fullName).join(", ")}
              </span>
            </button>
          ))}
        </section>
      )}
    </RsvpFrame>
  );
}
