import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";

import { ApiError } from "../../api/client";
import { answerInvitation, getInvitation } from "../../api/rsvp";
import type { RsvpAnswer, RsvpInvitation, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "../guests/filtering";
import { RsvpFrame } from "./RsvpFrame";

/** A member's choice on the form: undecided until they pick one. */
type Choice = "yes" | "no" | null;

const choiceFor = (status: RsvpStatus): Choice =>
  status === "confirmed" ? "yes" : status === "declined" ? "no" : null;

function choicesFrom(invitation: RsvpInvitation): Record<number, Choice> {
  return Object.fromEntries(invitation.guests.map((guest) => [guest.id, choiceFor(guest.rsvpStatus)]));
}

/** "2026-10-29" read as a calendar day, not as midnight UTC. */
function formatDate(isoDate: string, language: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-GB", { dateStyle: "long" }).format(
    new Date(year, month - 1, day),
  );
}

/**
 * What a household sees when it opens its private link: everyone invited
 * together, each answering for themselves. Lives outside the planner shell -
 * a guest has no business seeing the couple's sidebar.
 */
export function RsvpPage() {
  const { token = "" } = useParams();
  const { t, language } = useTranslation();

  const [invitation, setInvitation] = useState<RsvpInvitation | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getInvitation(token)
      .then((loaded) => {
        if (!isCurrent) return;
        setInvitation(loaded);
        setChoices(choicesFrom(loaded));
      })
      .catch((failure: unknown) => {
        if (!isCurrent) return;
        setLoadError(failure instanceof ApiError && failure.status === 404 ? "rsvp.notFound" : "rsvp.loadFailed");
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const answers: RsvpAnswer[] = Object.entries(choices).flatMap(([guestId, choice]) =>
    choice === null ? [] : [{ guestId: Number(guestId), attending: choice === "yes" }],
  );

  const choose = (guestId: number, choice: Choice) => {
    setIsSaved(false);
    setChoices((current) => ({ ...current, [guestId]: choice }));
  };

  /** The usual case is a whole household answering the same way. */
  const chooseForEveryone = (choice: Choice) => {
    setIsSaved(false);
    setChoices(Object.fromEntries((invitation?.guests ?? []).map((guest) => [guest.id, choice])));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError(false);
    setIsSaving(true);
    try {
      const updated = await answerInvitation(token, answers);
      setInvitation(updated);
      setChoices(choicesFrom(updated));
      setIsSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const content = () => {
    if (loadError !== null) {
      return <p className="font-body-lg text-body-lg text-on-surface-variant">{t(loadError)}</p>;
    }
    if (invitation === null) {
      return <p className="font-body-lg text-body-lg text-on-surface-variant">{t("rsvp.loading")}</p>;
    }
    return (
      <>
        <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">{invitation.weddingName}</h1>
        {invitation.weddingDate !== null && (
          <p className="mb-6 font-body-lg text-body-lg text-on-surface-variant">
            {formatDate(invitation.weddingDate, language)}
          </p>
        )}
        <p className="mb-1 font-title-lg text-title-lg text-on-surface">
          {t("rsvp.invitationFor", { label: invitation.householdName })}
        </p>
        <p className="mb-6 font-body-sm text-body-sm text-on-surface-variant">{t("rsvp.prompt")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {invitation.guests.length > 1 && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => chooseForEveryone("yes")}
                className="rounded-full border border-primary px-6 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
              >
                {t("rsvp.everyone")}
              </button>
              <button
                type="button"
                onClick={() => chooseForEveryone("no")}
                className="rounded-full border border-primary px-6 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
              >
                {t("rsvp.noOne")}
              </button>
            </div>
          )}
          {invitation.guests.map((guest) => (
            <fieldset key={guest.id} className="rounded-lg border border-outline-variant px-4 py-3">
              <legend className="px-1 font-label-lg text-label-lg text-on-surface">{fullName(guest)}</legend>
              <div className="flex flex-wrap gap-6">
                {(["yes", "no"] as const).map((choice) => (
                  <label
                    key={choice}
                    className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant"
                  >
                    <input
                      type="radio"
                      name={`guest-${guest.id}`}
                      checked={choices[guest.id] === choice}
                      onChange={() => choose(guest.id, choice)}
                      className="h-5 w-5 text-primary focus:ring-primary"
                    />
                    {t(choice === "yes" ? "rsvp.attending" : "rsvp.notAttending")}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {saveError && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {t("rsvp.saveFailed")}
            </p>
          )}
          {isSaved && (
            <p role="status" className="font-body-sm text-body-sm text-secondary">
              {t("rsvp.saved")}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || answers.length === 0}
            className="mt-2 self-end rounded-full bg-primary px-8 py-3 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t(isSaving ? "rsvp.sending" : "rsvp.send")}
          </button>
        </form>
      </>
    );
  };

  return <RsvpFrame picture="/rsvp-banner.jpg">{content()}</RsvpFrame>;
}
