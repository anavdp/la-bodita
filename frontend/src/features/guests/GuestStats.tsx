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

/** Each status's dot, matching the pills in the table's RSVP column. */
export const statusDotClass: Record<RsvpStatus, string> = {
  confirmed: "bg-mint",
  pending: "bg-butter-deep",
  declined: "bg-coral",
};

interface GuestStatsProps {
  guests: Guest[];
  /** The status the guest table is filtered by, if any. */
  activeStatus: RsvpStatus | null;
  /** Left out where there is no table to filter: the statuses are then plain text. */
  onToggleStatus?: (status: RsvpStatus) => void;
}

/** Each figure sits in a slot carrying the divider, so a pressed status can still fill its own rounded box. */
const cellSlot = "flex min-w-[120px] flex-1 px-1";
const cellClass = "flex flex-1 flex-col items-center justify-center rounded-[20px] px-3 py-2 text-ink";
const countClass = "flex items-center gap-2 font-playful-display text-[34px] leading-none";
const labelClass = "font-playful text-xl";

/**
 * The page's summary strip: how many guests and households, then each RSVP
 * status. Clicking a status filters the guest table by it.
 */
export function GuestStats({ guests, activeStatus, onToggleStatus }: GuestStatsProps) {
  const { t } = useTranslation();
  const summary = summariseRsvps(guests);
  const countOf: Record<RsvpStatus, number> = {
    confirmed: summary.confirmed,
    pending: summary.pending,
    declined: summary.declined,
  };
  const householdCount = new Set(guests.map((guest) => guest.householdId)).size;

  const totals: { labelKey: TranslationKey; count: number }[] = [
    { labelKey: "guests.tabs.guests", count: guests.length },
    { labelKey: "guests.tabs.households", count: householdCount },
  ];

  return (
    <div
      role="group"
      aria-label={t("guests.summary.label")}
      className="flex flex-wrap divide-ink/40 rounded-[28px] border-[2.5px] border-ink bg-periwinkle p-2 md:flex-nowrap md:divide-x-2"
    >
      {totals.map(({ labelKey, count }) => (
        <div key={labelKey} className={cellSlot}>
          <div className={cellClass}>
            <span className={countClass}>{count}</span>{" "}
            <span className={labelClass}>{t(labelKey)}</span>
          </div>
        </div>
      ))}

      {summaryStatuses.map((status) => {
        const content = (
          <>
            <span className={countClass}>
              <span aria-hidden="true" className={`h-4 w-4 rounded-full border-2 border-ink ${statusDotClass[status]}`} />
              {countOf[status]}
            </span>{" "}
            <span className={labelClass}>{t(statusLabelKey[status])}</span>
          </>
        );

        if (onToggleStatus === undefined) {
          return (
            <div key={status} className={cellSlot}>
              <span className={cellClass}>{content}</span>
            </div>
          );
        }
        const isActive = status === activeStatus;
        return (
          <div key={status} className={cellSlot}>
            <button
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggleStatus(status)}
              className={`${cellClass} transition-colors hover:bg-cream-light/50 ${
                isActive ? "bg-cream-light ring-[2.5px] ring-inset ring-ink" : ""
              }`}
            >
              {content}
            </button>
          </div>
        );
      })}
    </div>
  );
}
