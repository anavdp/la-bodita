import { useIsPhone } from "../../components/layout/useIsPhone";
import { iconUrl } from "../../components/playful/icons";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import type { BookingFilter, BookingSummary } from "./weBook";

interface WeBookStatsProps {
  summary: BookingSummary;
  activeFilter: BookingFilter | null;
  onToggleFilter: (filter: BookingFilter) => void;
}

export const hotelIcon = iconUrl("hotel.png");
export const rideIcon = iconUrl("title-car.png");

/** Laid out like the RSVP summary on the other tabs, so the page keeps one look. */
const cellSlot = "flex min-w-[120px] flex-1 px-1";
const cellClass = "flex flex-1 flex-col items-center justify-center rounded-[20px] px-3 py-2 text-ink";
const countClass = "flex items-center gap-2 font-playful-display text-[34px] leading-none";

/**
 * The We book tab's summary strip. Rooms to book and Need a ride work like the
 * RSVP statuses: clicking one narrows the table to it, clicking again clears it.
 */
export function WeBookStats({ summary, activeFilter, onToggleFilter }: WeBookStatsProps) {
  const { t } = useTranslation();
  const isPhone = useIsPhone();
  const slot = isPhone ? "flex min-w-0 basis-1/2 px-0.5" : cellSlot;
  const cellStyle = isPhone ? `${cellClass} !py-1` : cellClass;
  const countStyle = isPhone ? countClass.replace("text-[34px]", "text-[26px]") : countClass;
  const labelStyle = isPhone ? "font-playful text-base" : "font-playful text-xl";
  const iconStyle = isPhone ? "h-7 w-7 object-contain" : "h-9 w-9 object-contain";

  const totals: { labelKey: TranslationKey; count: number }[] = [
    { labelKey: "weBook.summary.guests", count: summary.guests },
    { labelKey: "weBook.summary.households", count: summary.households },
  ];
  const filters: { filter: BookingFilter; labelKey: TranslationKey; count: number; icon: string }[] = [
    { filter: "hotel", labelKey: "weBook.summary.rooms", count: summary.rooms, icon: hotelIcon },
    { filter: "ride", labelKey: "weBook.summary.riders", count: summary.riders, icon: rideIcon },
  ];

  return (
    <div
      role="group"
      aria-label={t("weBook.summary.label")}
      className="flex flex-wrap divide-ink/40 rounded-[28px] border-[2.5px] border-ink bg-accent p-2 md:flex-nowrap md:divide-x-2"
    >
      {totals.map(({ labelKey, count }) => (
        <div key={labelKey} className={slot}>
          <div className={cellStyle}>
            <span className={countStyle}>{count}</span> <span className={labelStyle}>{t(labelKey)}</span>
          </div>
        </div>
      ))}
      {filters.map(({ filter, labelKey, count, icon }) => {
        const isActive = filter === activeFilter;
        return (
          <div key={filter} className={slot}>
            <button
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggleFilter(filter)}
              className={`${cellStyle} transition-colors hover:bg-cream-light/50 ${
                isActive ? "bg-cream-light ring-[2.5px] ring-inset ring-ink" : ""
              }`}
            >
              <span className={countStyle}>
                <img src={icon} alt="" className={iconStyle} />
                {count}
              </span>{" "}
              <span className={labelStyle}>{t(labelKey)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
