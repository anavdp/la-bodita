import { useId, useMemo, useState } from "react";

import type { CalendarEvent, CalendarEventDraft, Category } from "../../api/types";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { compactButton, outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { CategoryChips } from "../planning/CategoryChips";
import { formatDueTime } from "../planning/schedule";
import { CalendarEventForm } from "./CalendarEventForm";
import { entriesOn, fromIso, monthWeeks, toEntries, toIso, upcoming } from "./calendarMath";
import type { CalendarEntry } from "./calendarMath";
import { ComingUpCard, NextUpCard } from "./Upcoming";
import { useCalendar } from "./useCalendar";

/** Which drawer is open: an event to edit, or a new one (from a day, or from the header). */
type FormTarget = { event: CalendarEvent } | { startDate: string | null } | null;

/** Sticky-note paper: the category's color, light enough for dark lettering; classic yellow without one. */
const paperOf = (category: Category | undefined) =>
  category ? `color-mix(in srgb, ${category.color} 45%, #fffaf0)` : "#fff1b8";

/** The paper's folded-up corner, a shade darker than the note. */
const foldOf = (category: Category | undefined) =>
  `color-mix(in srgb, ${category ? category.color : "#f2cf5b"} 70%, #1f1d2b 12%)`;

/** The bottom-right corner cut away, where the fold sits. */
const foldedCorner = "polygon(0 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%)";

/** Notes stuck on by hand never sit straight; each keeps its own tilt. */
const tilts = ["-rotate-[1.5deg]", "rotate-1", "-rotate-[0.5deg]", "rotate-[1.5deg]"];
const tiltOf = (key: string) => tilts[[...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tilts.length];

const navButton =
  "flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-ink bg-accent text-ink transition-colors hover:bg-accent-deep";

interface EntryChipProps {
  entry: CalendarEntry;
  category: Category | undefined;
  /** False on the middle days of a range: the bar carries on and the words are only read out. */
  showTitle: boolean;
  onOpen: (event: CalendarEvent) => void;
}

/**
 * One thing on a day, as a sticky note in its category's color. Paper stays
 * paper in dark mode too, so its lettering is always dark. Events open their
 * drawer; tasks are ticked off on the checklist, so here they only show.
 * On a phone the note shrinks to a strip and its words go to screen readers.
 */
function EntryChip({ entry, category, showTitle, onOpen }: EntryChipProps) {
  const noteClass =
    "relative flex w-full min-w-0 flex-col items-start px-1.5 pb-1 pt-0.5 text-left text-[13px] leading-tight text-[#1f1d2b]";
  const content = (
    <>
      {entry.time !== null && showTitle && (
        <span className="hidden text-xs tabular-nums text-[#1f1d2b]/70 sm:block">{formatDueTime(entry.time)}</span>
      )}
      <span
        className={`sr-only hyphens-auto break-words ${showTitle ? "sm:not-sr-only" : ""} ${
          entry.isDone ? "text-[#1f1d2b]/50 line-through" : ""
        }`}
      >
        {entry.title}
      </span>
      <span aria-hidden="true" className={`h-1.5 w-full ${showTitle ? "sm:hidden" : "sm:h-[1.125rem]"}`} />
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-[9px] w-[9px]"
        style={{ background: `linear-gradient(to bottom right, ${foldOf(category)} 50%, transparent 50%)` }}
      />
    </>
  );
  const style = { background: paperOf(category), clipPath: foldedCorner };
  // The shadow goes on a wrapper: the cut corner would clip one drawn on the note itself.
  const wrapperClass = `block w-full drop-shadow-[1px_2px_0_rgba(31,29,43,0.3)] ${tiltOf(entry.key)} ${
    entry.isDone ? "opacity-70" : ""
  }`;

  if (entry.kind === "event") {
    return (
      <span className={`${wrapperClass} transition-transform hover:rotate-0`}>
        <button type="button" onClick={() => onOpen(entry.source)} className={noteClass} style={style}>
          {content}
        </button>
      </span>
    );
  }
  return (
    <span className={wrapperClass}>
      <span className={noteClass} style={style}>
        {content}
      </span>
    </span>
  );
}

interface DayRowProps {
  entry: CalendarEntry;
  category: Category | undefined;
  onOpen: (event: CalendarEvent) => void;
}

/** One thing on the tapped day: events open their drawer, tasks only show, as on the grid. */
function DayRow({ entry, category, onOpen }: DayRowProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink"
        style={{ backgroundColor: category?.color ?? "transparent" }}
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-lg ${entry.isDone ? "text-ink/50 line-through" : ""}`}>
          {[entry.title, entry.itemName].filter(Boolean).join(" · ")}
        </span>
        {entry.time !== null && <span className="block text-base text-ink/70">{formatDueTime(entry.time)}</span>}
      </span>
    </>
  );
  return (
    <li className="border-t-2 border-ink/10 first:border-t-0">
      {entry.kind === "event" ? (
        <button
          type="button"
          onClick={() => onOpen(entry.source)}
          className="flex w-full items-center gap-3 py-3 text-left"
        >
          {content}
          <span className="material-symbols-outlined text-ink/70" aria-hidden="true">
            chevron_right
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3 py-3">{content}</div>
      )}
    </li>
  );
}

/**
 * A month at a glance: dated tasks and events on their days, colored by
 * category, with what is next and the coming two weeks beside it.
 */
export function CalendarPage() {
  const { t, language } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();
  const calendar = useCalendar(wedding?.id ?? null);
  const { categories, items, tasks, events, isLoading, hasLoadError } = calendar;
  const pickedDayId = useId();

  const todayIso = toIso(new Date());
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), index: today.getMonth() };
  });
  // A phone's grid only has room for colored bars, so a tapped day is listed in words below it.
  const [pickedDay, setPickedDay] = useState(todayIso);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const categoriesById = useMemo(() => new Map(categories.map((each) => [each.id, each])), [categories]);
  const categoryOf = (entry: CalendarEntry) =>
    entry.categoryId === null ? undefined : categoriesById.get(entry.categoryId);

  const entries = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return toEntries(tasks, events).filter(
      (entry) =>
        (categoryFilter === null || entry.categoryId === categoryFilter) &&
        [entry.title, entry.itemName].some((text) => text?.toLowerCase().includes(needle)),
    );
  }, [tasks, events, term, categoryFilter]);

  const ahead = upcoming(entries, todayIso);
  const nextUp = ahead[0] ?? null;
  const comingUp = upcoming(entries, todayIso, 14).filter((entry) => entry.key !== nextUp?.key);

  const weeks = monthWeeks(month.year, month.index);
  const monthTitle = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
    new Date(month.year, month.index, 1),
  );
  // 2 March 2026 was a Monday: seven days from it name the weekday columns.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(language, { weekday: "short" }).format(new Date(2026, 2, 2 + index)),
  );
  const longDate = new Intl.DateTimeFormat(language, { weekday: "long", month: "long", day: "numeric" });
  const shiftMonth = (step: number) =>
    setMonth(({ year, index }) => {
      const next = new Date(year, index + step, 1);
      return { year: next.getFullYear(), index: next.getMonth() };
    });
  const goToToday = () => {
    const today = new Date();
    setMonth({ year: today.getFullYear(), index: today.getMonth() });
  };

  const handleSave = async (draft: CalendarEventDraft) => {
    if (formTarget !== null && "event" in formTarget) {
      await calendar.editEvent(formTarget.event.id, draft);
    } else {
      await calendar.addEvent(draft);
    }
    setFormTarget(null);
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!window.confirm(t("calendar.deleteConfirm", { title: event.title }))) return;
    setFormTarget(null);
    setActionError(null);
    try {
      await calendar.removeEvent(event.id);
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const dayCell = (iso: string) => {
    const date = fromIso(iso);
    const isInMonth = date.getMonth() === month.index;
    const isToday = iso === todayIso;
    const isWeddingDay = iso === wedding?.wedding_date;
    const label = longDate.format(date);
    const onDay = isInMonth ? entriesOn(entries, iso) : [];
    return (
      <div
        key={iso}
        role="gridcell"
        aria-label={label}
        aria-current={isToday ? "date" : undefined}
        className={`group relative flex min-h-[4.5rem] min-w-0 flex-col gap-1 rounded-2xl p-1.5 sm:min-h-[6.5rem] sm:p-2 ${
          isInMonth && iso === pickedDay ? "ring-[2.5px] ring-sky sm:ring-0" : ""
        } ${
          !isInMonth
            ? "text-ink/35"
            : isWeddingDay
              ? "border-[2.5px] border-ink bg-butter"
              : isToday
                ? "border-[2.5px] border-ink bg-accent/50"
                : "bg-cream"
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={`flex h-7 min-w-7 items-center justify-center rounded-full text-base tabular-nums ${
              isToday ? "border-2 border-ink bg-sky px-1 !text-white" : ""
            }`}
          >
            {date.getDate()}
          </span>
          {isInMonth && (
            <button
              type="button"
              aria-label={t("calendar.addOn", { date: label })}
              onClick={() => setFormTarget({ startDate: iso })}
              className="hidden h-7 w-7 items-center justify-center rounded-full text-ink/70 opacity-0 transition-opacity hover:bg-accent/60 hover:text-ink focus:opacity-100 group-hover:opacity-100 sm:flex"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                add
              </span>
            </button>
          )}
        </div>
        {isInMonth && isWeddingDay && (
          <span className="sr-only font-playful-display text-sm uppercase leading-tight tracking-wide sm:not-sr-only">
            {t("calendar.weddingDay")}
          </span>
        )}
        {isInMonth && (
          <button
            type="button"
            aria-label={t("calendar.showDay", { date: label })}
            aria-pressed={iso === pickedDay}
            onClick={() => setPickedDay(iso)}
            className="absolute inset-0 z-[1] rounded-2xl sm:hidden"
          />
        )}
        {onDay.map((entry) => (
          <EntryChip
            key={entry.key}
            entry={entry}
            category={categoryOf(entry)}
            showTitle={entry.startDate === iso || date.getDay() === 1 || date.getDate() === 1}
            onOpen={(event) => setFormTarget({ event })}
          />
        ))}
      </div>
    );
  };

  const monthCard = () => {
    if (isLoading) {
      return <p className="p-2 font-playful text-xl text-ink/70">{t("calendar.loading")}</p>;
    }
    if (hasLoadError) {
      return (
        <div className="flex flex-col items-start gap-4 p-2">
          <p className="font-playful text-xl text-coral">{t("planning.loadFailed")}</p>
          <button type="button" onClick={calendar.reload} className={secondaryButton}>
            {t("planning.retry")}
          </button>
        </div>
      );
    }
    return (
      <div role="grid" aria-label={monthTitle} data-month className="flex flex-col gap-1 sm:gap-1.5">
        <div role="row" className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekdays.map((weekday) => (
            <span
              key={weekday}
              role="columnheader"
              className="py-1 text-center font-playful text-sm uppercase tracking-wider text-ink/70"
            >
              {weekday}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {week.map(dayCell)}
          </div>
        ))}
      </div>
    );
  };

  const editing = formTarget !== null && "event" in formTarget ? formTarget.event : null;

  return (
    <>
      <PageHeader title={t("calendar.title")} subtitle={t("calendar.subtitle")} art="title-calendar.png">
        <HeaderAction icon="add" label={t("calendar.add")} onClick={() => setFormTarget({ startDate: null })} />
      </PageHeader>

      <div className="mb-6">
        <CategoryChips categories={categories} activeId={categoryFilter} onChange={setCategoryFilter} />
      </div>

      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        <section className={`${outlinedCard} w-full min-w-0 flex-1 p-3 font-playful text-ink sm:p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" aria-label={t("calendar.previousMonth")} onClick={() => shiftMonth(-1)} className={navButton}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <h2 aria-live="polite" className="w-44 text-center font-playful-display text-2xl capitalize sm:w-60 sm:text-3xl">
                {monthTitle}
              </h2>
              <button type="button" aria-label={t("calendar.nextMonth")} onClick={() => shiftMonth(1)} className={navButton}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
            <button type="button" onClick={goToToday} className={compactButton}>
              {t("calendar.today")}
            </button>
          </div>
          {monthCard()}
        </section>

        <aside className="flex w-full flex-col gap-4 font-playful text-ink xl:w-80 xl:shrink-0">
          {!isLoading && !hasLoadError && (
            <section aria-labelledby={pickedDayId} className={`${outlinedCard} px-6 py-5 sm:hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={pickedDayId}
                  className="inline-block -rotate-1 rounded-md border-2 border-ink bg-butter px-3 py-0.5 font-playful-display text-base uppercase tracking-wide"
                >
                  {longDate.format(fromIso(pickedDay))}
                </h2>
                <button type="button" onClick={() => setFormTarget({ startDate: pickedDay })} className={compactButton}>
                  {t("calendar.addOnDay")}
                </button>
              </div>
              {entriesOn(entries, pickedDay).length === 0 ? (
                <p className="mt-2 text-lg text-ink/70">{t("calendar.nothingOnDay")}</p>
              ) : (
                <ul className="mt-1">
                  {entriesOn(entries, pickedDay).map((entry) => (
                    <DayRow
                      key={entry.key}
                      entry={entry}
                      category={categoryOf(entry)}
                      onOpen={(event) => setFormTarget({ event })}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
          <NextUpCard entry={nextUp} category={nextUp === null ? undefined : categoryOf(nextUp)} />
          <ComingUpCard entries={comingUp} categoryOf={categoryOf} />
        </aside>
      </div>

      {formTarget !== null && (
        <CalendarEventForm
          event={editing}
          startDate={"startDate" in formTarget ? formTarget.startDate : null}
          items={items}
          onSave={handleSave}
          onDelete={editing ? () => void handleDelete(editing) : undefined}
          onClose={() => setFormTarget(null)}
        />
      )}
    </>
  );
}
