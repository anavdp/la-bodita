import { useState } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { rsvpUrl } from "../guests/households";

const iconButton =
  "flex h-10 w-10 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container-high hover:text-primary";

/** Open or copy a household's private RSVP page. */
export function RsvpLinkActions({ label, token }: { label: string; token: string }) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const url = rsvpUrl(token);
  // The clipboard API only exists on a secure origin (localhost or HTTPS); over
  // plain http the link itself still works.
  const canCopy = navigator.clipboard !== undefined;
  const copyLabel = isCopied ? t("guests.household.copied") : t("guests.household.copyLink", { label });

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={t("guests.household.openLink", { label })}
        title={t("guests.household.openLink", { label })}
        className={iconButton}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          open_in_new
        </span>
      </a>
      {canCopy && (
        <button type="button" onClick={() => void copy()} aria-label={copyLabel} title={copyLabel} className={iconButton}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {isCopied ? "check" : "link"}
          </span>
        </button>
      )}
    </span>
  );
}
