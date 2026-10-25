import { useId } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { Category } from "../../api/types";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { outlinedCard } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { Language } from "../../i18n/translations";
import { formatDueTime } from "../planning/schedule";
import { fromIso } from "./calendarMath";
import type { CalendarEntry } from "./calendarMath";

/** "Fri, Oct 23" or "Sun, Nov 1 – Sun, Nov 8", with a time when it has one. */
export function whenOf(entry: CalendarEntry, language: Language): string {
  const short = new Intl.DateTimeFormat(language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const days =
    entry.startDate === entry.endDate
      ? short.format(fromIso(entry.startDate))
      : `${short.format(fromIso(entry.startDate))} – ${short.format(fromIso(entry.endDate))}`;
  return entry.time === null ? days : `${days} · ${formatDueTime(entry.time)}`;
}

/** The butter label a card of the calendar and the dashboard opens with. */
export const cardLabel =
  "mb-1 inline-block -rotate-1 rounded-md border-2 border-ink bg-butter px-3 py-0.5 font-playful-display text-base uppercase tracking-wide";

interface NextUpCardProps {
  entry: CalendarEntry | null;
  category: Category | undefined;
}

/** The one thing ahead, on a tilted accent card: the Calendar's and the Dashboard's. */
export function NextUpCard({ entry, category }: NextUpCardProps) {
  const { t, language } = useTranslation();
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="-rotate-1 rounded-[28px] border-[2.5px] border-ink bg-accent px-6 py-5"
    >
      <h2 id={headingId} className="font-playful-display text-base uppercase tracking-wide">
        {t("calendar.nextUp")}
      </h2>
      {entry === null ? (
        <p className="mt-2 text-lg">{t("calendar.nothingNext")}</p>
      ) : (
        <>
          <p className="mt-1 flex items-center gap-2 font-playful-display text-2xl leading-tight">
            <CategoryIcon value={category?.emoji} className="h-8 w-8 shrink-0" />
            {entry.title}
          </p>
          <p className="mt-1 text-lg">{[whenOf(entry, language), entry.itemName].filter(Boolean).join(" · ")}</p>
        </>
      )}
    </section>
  );
}

interface UpcomingRowProps {
  entry: CalendarEntry;
  category: Category | undefined;
  /** Where the row leads, when it is a link. */
  to?: string;
}

/** One thing coming up: its category's dot, what and where, and when. */
export function UpcomingRow({ entry, category, to }: UpcomingRowProps) {
  const { language } = useTranslation();
  const content = (
    <>
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink"
        style={{ backgroundColor: category?.color ?? "transparent" }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg">{[entry.title, entry.itemName].filter(Boolean).join(" · ")}</span>
        <span className="block text-base text-ink/70">{whenOf(entry, language)}</span>
      </span>
    </>
  );
  return (
    <li className="border-t-2 border-ink/10 first:border-t-0">
      {to === undefined ? (
        <div className="flex items-center gap-3 py-3">{content}</div>
      ) : (
        <Link to={to} className="flex items-center gap-3 rounded-xl py-3 transition-colors hover:bg-accent/30">
          {content}
          <span className="material-symbols-outlined text-ink/60" aria-hidden="true">
            chevron_right
          </span>
        </Link>
      )}
    </li>
  );
}

interface ComingUpCardProps {
  entries: CalendarEntry[];
  categoryOf: (entry: CalendarEntry) => Category | undefined;
  /** Where each row leads, when the rows are links. */
  linkOf?: (entry: CalendarEntry) => string;
  /** Below the list: a way on to the full screen. */
  footer?: ReactNode;
}

/** The next two weeks, as a list under its butter label. */
export function ComingUpCard({ entries, categoryOf, linkOf, footer }: ComingUpCardProps) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`${outlinedCard} px-6 py-5`}>
      <h2 id={headingId} className={cardLabel}>
        {t("calendar.comingUp")}
      </h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-lg text-ink/70">{t("calendar.nothingSoon")}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <UpcomingRow key={entry.key} entry={entry} category={categoryOf(entry)} to={linkOf?.(entry)} />
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}
