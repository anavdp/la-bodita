import { useCallback, useId, useRef, useState } from "react";

import { useTranslation } from "../../i18n/LanguageProvider";
import { CalendarMark } from "../playful/CalendarMark";
import { fieldLabel, pillField, popover, popoverPlacement, shouldOpenUp } from "./styles";
import { useDismiss } from "./useDismiss";

interface DatePickerProps {
  label: string;
  /** ISO date ("2026-12-22"), or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
}

const toIso = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

/** "2026-12-22" as that day in the viewer's own calendar. */
function fromIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Monday first: the planners are in Venezuela, Italy and Spain. */
const mondayFirst = (day: Date) => (day.getDay() + 6) % 7;

/**
 * A date field whose calendar is the planner's own, not the browser's: a month of
 * round days, today outlined and the picked day in violet.
 */
export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const { t, language } = useTranslation();
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const picked = value ? fromIso(value) : null;
  const [month, setMonth] = useState(() => {
    const anchor = picked ?? new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(wrapper, isOpen, close);

  const open = () => {
    const anchor = picked ?? new Date();
    setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    setOpensUp(shouldOpenUp(wrapper.current, 380));
    setIsOpen(true);
  };

  const choose = (next: string | null) => {
    onChange(next);
    setIsOpen(false);
  };

  const todayIso = toIso(new Date());
  const shortDate = new Intl.DateTimeFormat(language, { weekday: "short", month: "short", day: "numeric" });
  const longDate = new Intl.DateTimeFormat(language, { dateStyle: "full" });
  const monthTitle = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(month);
  // 2 March 2026 was a Monday: seven days from it name the weekday columns.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(language, { weekday: "short" }).format(new Date(2026, 2, 2 + index)).slice(0, 2),
  );
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1));
  const shiftMonth = (step: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1));

  return (
    <div ref={wrapper} className="relative">
      <span id={`${id}-label`} className={fieldLabel}>
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-label`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
        className={`${pillField} flex items-center gap-3 text-left`}
      >
        <CalendarMark />
        <span className={picked ? "" : "text-ink/50"}>
          {picked ? shortDate.format(picked) : t("datePicker.placeholder")}
        </span>
      </button>
      {isOpen && (
        <div role="dialog" aria-label={t("datePicker.dialog")} className={`${popover} ${popoverPlacement(opensUp)} w-72`}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label={t("datePicker.previous")}
              onClick={() => shiftMonth(-1)}
              className="h-8 w-8 rounded-full text-ink hover:bg-accent/60"
            >
              ‹
            </button>
            <span className="font-playful-display text-lg capitalize text-ink" aria-live="polite">
              {monthTitle}
            </span>
            <button
              type="button"
              aria-label={t("datePicker.next")}
              onClick={() => shiftMonth(1)}
              className="h-8 w-8 rounded-full text-ink hover:bg-accent/60"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((weekday) => (
              <span key={weekday} className="py-1 text-[13px] uppercase text-ink/60">
                {weekday}
              </span>
            ))}
            {days.map((day) => {
              const iso = toIso(day);
              const isPicked = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={longDate.format(day)}
                  aria-pressed={isPicked}
                  aria-current={iso === todayIso ? "date" : undefined}
                  onClick={() => choose(iso)}
                  style={day.getDate() === 1 ? { gridColumnStart: mondayFirst(day) + 1 } : undefined}
                  className={`h-9 rounded-full text-base tabular-nums transition-colors ${
                    isPicked
                      ? "bg-sky text-white ring-2 ring-inset ring-ink"
                      : `text-ink hover:bg-accent/60 ${iso === todayIso ? "ring-2 ring-inset ring-ink" : ""}`
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end border-t-2 border-ink/15 pt-2">
            <button
              type="button"
              onClick={() => choose(null)}
              className="rounded-full px-3 py-1 text-lg text-ink/70 hover:text-ink"
            >
              {t("datePicker.clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
