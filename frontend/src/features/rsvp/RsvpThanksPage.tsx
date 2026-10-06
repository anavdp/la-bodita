import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError } from "../../api/client";
import { getInvitation } from "../../api/rsvp";
import type { RsvpInvitation } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { RsvpFrame } from "./RsvpFrame";
import { TitleWithDate } from "./TitleWithDate";

/** What the thank-you says, and the photo it shows, by whether anyone in the household is coming. */
const versions = {
  coming: {
    picture: "/rsvp-thanks-yes.jpg",
    message: { one: "rsvp.thanks.yes.one", many: "rsvp.thanks.yes.many" },
  },
  notComing: {
    picture: "/rsvp-thanks-no.jpg",
    message: { one: "rsvp.thanks.no.one", many: "rsvp.thanks.no.many" },
  },
} satisfies Record<string, { picture: string; message: Record<"one" | "many", TranslationKey> }>;

/**
 * Where a household lands after answering. It reads the saved answers back
 * rather than being told them, so a reload or a shared link shows the same.
 */
export function RsvpThanksPage() {
  const { token = "" } = useParams();
  const { t } = useTranslation();

  const [invitation, setInvitation] = useState<RsvpInvitation | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let isCurrent = true;
    getInvitation(token)
      .then((loaded) => {
        if (isCurrent) setInvitation(loaded);
      })
      .catch((failure: unknown) => {
        if (!isCurrent) return;
        setLoadError(failure instanceof ApiError && failure.status === 404 ? "rsvp.notFound" : "rsvp.loadFailed");
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  if (invitation === null) {
    return (
      <RsvpFrame>
        <p className="text-body-lg text-on-surface-variant">{t(loadError ?? "rsvp.loading")}</p>
      </RsvpFrame>
    );
  }

  const version = invitation.guests.some((guest) => guest.rsvpStatus === "confirmed")
    ? versions.coming
    : versions.notComing;
  const isHousehold = invitation.guests.length > 1;

  return (
    <RsvpFrame picture={version.picture}>
      <TitleWithDate title={t("rsvp.thanks.title")} />
      <p className="mb-6 text-body-lg text-on-surface">
        {t(version.message[isHousehold ? "many" : "one"])}
      </p>
      <Link
        to={`/rsvp/${encodeURIComponent(token)}`}
        className="text-label-md text-primary underline underline-offset-4 hover:opacity-80"
      >
        {t("rsvp.thanks.change")}
      </Link>
    </RsvpFrame>
  );
}
