import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../../api/client";
import { answerInvitation, getInvitation } from "../../api/rsvp";
import type { RsvpAnswer, RsvpGreeting, RsvpInvitation, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "../guests/filtering";
import { emphasize } from "./emphasize";
import { RsvpFrame } from "./RsvpFrame";
import { TitleWithDate } from "./TitleWithDate";

/** A member's choice on the form: undecided until they pick one. */
type Choice = "yes" | "no" | null;

/** The opening line, by who the household is to the couple, and by how many it speaks to. */
const greetings: Record<RsvpGreeting, Record<"one" | "many", TranslationKey>> = {
  family: { one: "rsvp.greeting.family.one", many: "rsvp.greeting.family.many" },
  friends: { one: "rsvp.greeting.friends.one", many: "rsvp.greeting.friends.many" },
  general: { one: "rsvp.moreInfo.one", many: "rsvp.moreInfo.many" },
};

const choiceFor = (status: RsvpStatus): Choice =>
  status === "confirmed" ? "yes" : status === "declined" ? "no" : null;

function choicesFrom(invitation: RsvpInvitation): Record<number, Choice> {
  return Object.fromEntries(invitation.guests.map((guest) => [guest.id, choiceFor(guest.rsvpStatus)]));
}

/**
 * What a household sees when it opens its private link: everyone invited
 * together, each answering for themselves. Lives outside the planner shell -
 * a guest has no business seeing the couple's sidebar.
 */
export function RsvpPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [invitation, setInvitation] = useState<RsvpInvitation | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [isSaving, setIsSaving] = useState(false);
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
    setChoices((current) => ({ ...current, [guestId]: choice }));
  };

  /** The usual case is a whole household answering the same way. */
  const chooseForEveryone = (choice: Choice) => {
    setChoices(Object.fromEntries((invitation?.guests ?? []).map((guest) => [guest.id, choice])));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError(false);
    setIsSaving(true);
    try {
      await answerInvitation(token, answers);
      navigate(`/rsvp/${encodeURIComponent(token)}/gracias`);
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  };

  const content = () => {
    if (loadError !== null) {
      return <p className="text-body-lg text-on-surface-variant">{t(loadError)}</p>;
    }
    if (invitation === null) {
      return <p className="text-body-lg text-on-surface-variant">{t("rsvp.loading")}</p>;
    }
    const isHousehold = invitation.guests.length > 1;
    return (
      <>
        <TitleWithDate title={invitation.weddingName} />
        {/* Spanish speaks to a household in the plural ("confírmennos") and to a guest alone in the singular. */}
        <p className="mb-4 text-body-lg text-on-surface">
          {t(greetings[invitation.greeting][isHousehold ? "many" : "one"])}
        </p>
        <p role="note" className="mb-6 border-l-4 border-primary-container py-1 pl-4 text-body-lg text-on-surface">
          {emphasize(t(isHousehold ? "rsvp.deadline.many" : "rsvp.deadline.one"), {
            date: <strong>{t("rsvp.deadlineDate")}</strong>,
          })}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {isHousehold && (
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => chooseForEveryone(choice)}
                  className="flex-1 rounded-full border-2 border-on-secondary-fixed-variant px-3 py-2 text-[15px] font-semibold text-on-secondary-fixed-variant transition-colors hover:bg-primary-fixed"
                >
                  {t(choice === "yes" ? "rsvp.everyone" : "rsvp.noOne")}
                </button>
              ))}
            </div>
          )}
          {invitation.guests.map((guest) => (
            <fieldset key={guest.id}>
              <legend className="mb-2 text-[20px] font-semibold text-on-surface">{fullName(guest)}</legend>
              {/* Radios underneath, so it stays one choice per person for keyboards and screen readers. */}
              <div className="flex rounded-full bg-surface-container-low p-1">
                {(["yes", "no"] as const).map((choice) => (
                  <label key={choice} className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`guest-${guest.id}`}
                      checked={choices[guest.id] === choice}
                      onChange={() => choose(guest.id, choice)}
                      className="peer sr-only"
                    />
                    <span className="block rounded-full py-3 text-center text-[16px] font-bold text-on-surface-variant transition-colors peer-checked:bg-primary-container peer-checked:text-on-primary-container peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-on-secondary-fixed-variant">
                      {t(choice === "yes" ? "rsvp.attending" : "rsvp.notAttending")}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {saveError && (
            <p role="alert" className="text-body-sm text-error">
              {t("rsvp.saveFailed")}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || answers.length === 0}
            className="mt-2 w-full rounded-full bg-on-secondary-fixed-variant py-4 text-[17px] font-bold text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t(isSaving ? "rsvp.sending" : "rsvp.send")}
          </button>
        </form>
      </>
    );
  };

  return <RsvpFrame picture="/rsvp-banner.jpg">{content()}</RsvpFrame>;
}
