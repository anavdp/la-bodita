import type { Guest, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { summariseRsvps } from "./guestSummary";

/** The summary reads in the order an RSVP is chased: yes, still waiting, no. */
const summaryStatuses: RsvpStatus[] = ["confirmed", "pending", "declined"];

const statusLabelKey: Record<RsvpStatus, TranslationKey> = {
  confirmed: "guests.confirmed",
  pending: "guests.pending",
  declined: "guests.declined",
};

const segmentClass: Record<RsvpStatus, string> = {
  confirmed: "bg-secondary",
  pending: "bg-tertiary",
  declined: "bg-secondary-container",
};

/** Periwinkle text on white misses the contrast bar, so the selected status rings in its color instead. */
const ringClass: Record<RsvpStatus, string> = {
  confirmed: "ring-secondary",
  pending: "ring-tertiary",
  declined: "ring-secondary-container",
};

interface GuestStatsProps {
  guests: Guest[];
  /** The status the guest table is filtered by, if any. */
  activeStatus: RsvpStatus | null;
  /** Left out where there is no table to filter: the statuses are then plain text. */
  onToggleStatus?: (status: RsvpStatus) => void;
}

/**
 * The RSVP summary in the page header: one bar split by status, and a legend
 * of counts underneath. Clicking a status filters the guest table by it.
 */
export function GuestStats({ guests, activeStatus, onToggleStatus }: GuestStatsProps) {
  const { t } = useTranslation();
  const summary = summariseRsvps(guests);
  const countOf: Record<RsvpStatus, number> = {
    confirmed: summary.confirmed,
    pending: summary.pending,
    declined: summary.declined,
  };
  const shareOf: Record<RsvpStatus, number> = {
    confirmed: summary.shareConfirmed,
    pending: summary.sharePending,
    declined: summary.shareDeclined,
  };
  const isFiltering = activeStatus !== null;

  return (
    <div className="w-full">
      {/* The legend below says the same in words, so the bar is for the eye only. */}
      <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-container-low">
        {summaryStatuses.map((status) => (
          <span
            key={status}
            data-status={status}
            className={`h-full transition-opacity ${segmentClass[status]} ${
              isFiltering && status !== activeStatus ? "opacity-25" : ""
            }`}
            style={{ flexGrow: countOf[status] }}
          />
        ))}
      </div>

      <div role="group" aria-label={t("guests.summary.label")} className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {summaryStatuses.map((status) => {
          const content = (
            <>
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${segmentClass[status]}`} />
              <span className="font-headline-md text-title-lg">{countOf[status]}</span>{" "}
              <span>{t(statusLabelKey[status])}</span>{" "}
              <span className="tabular-nums text-on-surface-variant">{shareOf[status]}%</span>
            </>
          );
          const itemClass = "-ml-2 flex items-center gap-2 rounded-full px-2 py-1 font-body-sm text-body-sm";

          if (onToggleStatus === undefined) {
            return (
              <span key={status} className={`${itemClass} text-on-surface`}>
                {content}
              </span>
            );
          }
          const isActive = status === activeStatus;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggleStatus(status)}
              className={`${itemClass} transition-colors hover:bg-surface-container-low ${
                isActive ? `bg-surface-container-low ring-2 ring-inset ${ringClass[status]}` : ""
              } text-on-surface`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
