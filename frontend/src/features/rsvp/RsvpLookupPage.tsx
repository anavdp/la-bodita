import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { lookUpInvitation } from "../../api/rsvp";
import type { RsvpHouseholdMatch } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "../guests/filtering";
import { RsvpFrame } from "./RsvpFrame";
import { TitleWithDate } from "./TitleWithDate";

const field =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none";
const fieldLabel = "mb-1 block font-label-md text-label-md uppercase text-on-surface-variant";

const rsvpPath = (token: string) => `/rsvp/${encodeURIComponent(token)}`;

/**
 * The one public link the couple shares: a guest types their last name and
 * lands on their household's invitation. When a family name is shared by
 * several households, the guest picks theirs by who is in it.
 */
export function RsvpLookupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [lastName, setLastName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<RsvpHouseholdMatch[]>([]);
  const [problem, setProblem] = useState<TranslationKey | null>(null);

  // Two letters at least, as the API asks: one letter would list half the guests.
  const canSearch = lastName.trim().length >= 2 && !isSearching;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProblem(null);
    setMatches([]);
    setIsSearching(true);
    try {
      const found = await lookUpInvitation(lastName.trim());
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
    <RsvpFrame picture="/rsvp-lookup.jpg">
      <TitleWithDate title={t("rsvp.lookup.title")} />
      <p className="mb-6 font-body-sm text-body-sm text-on-surface-variant">{t("rsvp.lookup.prompt")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={fieldLabel} htmlFor="rsvp-last-name">
            {t("rsvp.lookup.lastName")}
          </label>
          <input
            id="rsvp-last-name"
            className={field}
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>

        {problem !== null && (
          <p role="alert" className="font-body-sm text-body-sm text-error">
            {t(problem)}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSearch}
          className="mt-2 self-end rounded-full bg-primary px-8 py-3 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t(isSearching ? "rsvp.lookup.searching" : "rsvp.lookup.search")}
        </button>
      </form>

      {matches.length > 1 && (
        <section className="mt-6 flex flex-col gap-3">
          <p className="font-title-lg text-title-lg text-on-surface">{t("rsvp.lookup.choose")}</p>
          {matches.map((match) => (
            <button
              key={match.token}
              type="button"
              onClick={() => navigate(rsvpPath(match.token))}
              className="rounded-lg border border-outline-variant px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              {/* Who is in it, not the household's own name: that is for the couple's planning. */}
              <span className="block font-label-lg text-label-lg text-on-surface">
                {match.members.map(fullName).join(", ")}
              </span>
            </button>
          ))}
        </section>
      )}
    </RsvpFrame>
  );
}
