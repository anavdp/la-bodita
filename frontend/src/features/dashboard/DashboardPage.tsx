import { useId, useMemo } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { Category } from "../../api/types";
import { daysUntil } from "../../components/layout/countdown";
import { PageHeader } from "../../components/playful/PageHeader";
import { outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { formatTotals, summarise } from "../budget/budgetMath";
import { fromIso, toEntries, toIso, upcoming } from "../calendar/calendarMath";
import type { CalendarEntry } from "../calendar/calendarMath";
import { ComingUpCard, NextUpCard, cardLabel } from "../calendar/Upcoming";
import { formatPaperDate } from "../documents/papers";
import { statusDotClass } from "../guests/GuestStats";
import { summariseRsvps } from "../guests/guestSummary";
import { isOverdue } from "../planning/schedule";
import { missingPaperCount, needsYou } from "./dashboardMath";
import type { Attention } from "./dashboardMath";
import { useDashboard } from "./useDashboard";

/** How many papers an item's row names before it says "and N more". */
const PAPERS_NAMED = 3;

/** The dashboard lists only the first few things coming up; the calendar has the rest. */
const COMING_UP_SHOWN = 5;

/** The tagline: how long until the wedding, and which day it is. */
function useCountdownLine(weddingDate: string | null | undefined): string {
  const { t, language } = useTranslation();
  if (!weddingDate) return t("dashboard.noDate");
  const date = new Intl.DateTimeFormat(language, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(fromIso(weddingDate));
  const remaining = daysUntil(weddingDate);
  if (remaining > 1) return t("dashboard.countdown", { count: remaining, date });
  if (remaining === 1) return t("dashboard.tomorrow", { date });
  return t("dashboard.today");
}

interface FigureProps {
  to: string;
  figure: string;
  label: string;
  detail: string;
  /** The detail is something to act on. */
  isUrgent?: boolean;
  dot?: string;
}

/** One figure of the strip, leading to the screen it sums up. */
function Figure({ to, figure, label, detail, isUrgent = false, dot }: FigureProps) {
  return (
    // The slot carries the divider, so the link can keep its own rounded hover box.
    <div className="flex min-w-0 px-1">
      <Link
        to={to}
        className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] px-2 py-2 text-center text-ink transition-colors hover:bg-cream-light/50"
      >
        <span className="flex items-center gap-2 font-playful-display text-[26px] leading-none sm:text-[34px]">
          {dot !== undefined && (
            <span aria-hidden="true" className={`h-4 w-4 rounded-full border-2 border-ink ${dot}`} />
          )}
          {figure}
        </span>
        <span className="font-playful text-base sm:text-xl">{label}</span>
        <span className={`font-playful text-sm sm:text-base ${isUrgent ? "text-coral" : "text-ink/70"}`}>{detail}</span>
      </Link>
    </div>
  );
}

function AttentionRow({ to, icon, title, detail }: { to: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <li className="border-t-2 border-ink/10 first:border-t-0">
      <Link to={to} className="flex items-center gap-3 rounded-xl py-3 transition-colors hover:bg-accent/30">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg">{title}</span>
          <span className="block text-base text-coral">{detail}</span>
        </span>
        <span className="material-symbols-outlined text-ink/60" aria-hidden="true">
          chevron_right
        </span>
      </Link>
    </li>
  );
}

const attentionIcon = (name: string) => (
  <span
    aria-hidden="true"
    className="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-coral-soft text-[20px] text-ink"
  >
    {name}
  </span>
);

/** What is waiting on us: late tasks, papers running out, items still waiting on papers. */
function NeedsYouCard({ list }: { list: Attention[] }) {
  const { t, language } = useTranslation();
  const headingId = useId();

  const row = (entry: Attention) => {
    if (entry.kind === "lateTask") {
      return (
        <AttentionRow
          key={entry.key}
          to="/checklist"
          icon={attentionIcon("alarm")}
          title={[entry.task.title, entry.task.itemName].filter(Boolean).join(" · ")}
          detail={entry.daysLate === 1 ? t("dashboard.oneDayLate") : t("dashboard.daysLate", { count: entry.daysLate })}
        />
      );
    }
    if (entry.kind === "runningOut") {
      const date = formatPaperDate(entry.document.expiresOn as string, language);
      return (
        <AttentionRow
          key={entry.key}
          to="/documents"
          icon={attentionIcon("hourglass_bottom")}
          title={entry.document.title}
          detail={entry.isExpired ? t("dashboard.ranOut", { date }) : t("dashboard.runsOut", { date })}
        />
      );
    }
    const names = entry.item.missing.map((request) => request.name);
    const papers =
      names.length > PAPERS_NAMED
        ? t("dashboard.andMore", {
            papers: names.slice(0, PAPERS_NAMED).join(", "),
            count: names.length - PAPERS_NAMED,
          })
        : names.join(", ");
    return (
      <AttentionRow
        key={entry.key}
        to={`/items?item=${entry.item.itemId}`}
        icon={attentionIcon("description")}
        title={entry.item.itemName}
        detail={t("dashboard.waitingOn", { papers })}
      />
    );
  };

  return (
    <section aria-labelledby={headingId} className={`${outlinedCard} px-6 py-5`}>
      <h2 id={headingId} className={cardLabel}>
        {t("dashboard.needsYou")}
      </h2>
      {list.length === 0 ? (
        <p className="mt-2 text-lg text-ink/70">{t("dashboard.allClear")}</p>
      ) : (
        <ul>{list.map(row)}</ul>
      )}
    </section>
  );
}

/**
 * The whole wedding at a glance: how long is left, a strip summing up guests,
 * tasks, money and papers (each leading to its screen), what is next, the two
 * weeks after it, and whatever is waiting on us.
 */
export function DashboardPage() {
  const { t, language } = useTranslation();
  const { wedding } = useWedding();
  const dashboard = useDashboard(wedding?.id ?? null);
  const { categories, tasks, events, lines, guests, requests, documents, people, isLoading, hasLoadError } = dashboard;
  const countdownLine = useCountdownLine(wedding?.wedding_date);

  const today = new Date();
  const todayIso = toIso(today);
  const categoriesById = useMemo(() => new Map(categories.map((each) => [each.id, each])), [categories]);
  const categoryOf = (entry: CalendarEntry): Category | undefined =>
    entry.categoryId === null ? undefined : categoriesById.get(entry.categoryId);

  const body = () => {
    if (isLoading) {
      return <p className="font-playful text-xl text-ink/70">{t("dashboard.loading")}</p>;
    }
    if (hasLoadError) {
      return (
        <div className="flex flex-col items-start gap-4">
          <p className="font-playful text-xl text-coral">{t("planning.loadFailed")}</p>
          <button type="button" onClick={dashboard.reload} className={secondaryButton}>
            {t("planning.retry")}
          </button>
        </div>
      );
    }

    const rsvps = summariseRsvps(guests);
    const openTasks = tasks.filter((task) => !task.isDone);
    const lateCount = openTasks.filter((task) => isOverdue(task, today)).length;
    const money = summarise(lines);
    const attention = needsYou({ tasks, requests, documents }, today);
    const runningOutCount = attention.filter((entry) => entry.kind === "runningOut").length;
    const missing = missingPaperCount(requests, documents, people, todayIso);

    const ahead = upcoming(toEntries(tasks, events), todayIso);
    const nextUp = ahead[0] ?? null;
    const comingUp = upcoming(ahead, todayIso, 14)
      .filter((entry) => entry.key !== nextUp?.key)
      .slice(0, COMING_UP_SHOWN);

    return (
      <>
        <div
          role="group"
          aria-label={t("dashboard.glance")}
          className="grid grid-cols-2 gap-1 rounded-[28px] border-[2.5px] border-ink bg-accent p-2 md:grid-cols-4 md:divide-x-2 md:divide-ink/40"
        >
          <Figure
            to="/guests"
            dot={statusDotClass.confirmed}
            figure={String(rsvps.confirmed)}
            label={t("dashboard.saidYes")}
            detail={t("dashboard.stillWaiting", { count: rsvps.pending })}
          />
          <Figure
            to="/checklist"
            figure={String(openTasks.length)}
            label={t("dashboard.toDo")}
            detail={lateCount > 0 ? t("dashboard.late", { count: lateCount }) : t("dashboard.onTime")}
            isUrgent={lateCount > 0}
          />
          <Figure
            to="/budget"
            figure={formatTotals(money, "confirmed", language)}
            label={t("dashboard.settled")}
            detail={t("dashboard.ofPlan", {
              total: formatTotals(money, "total", language),
            })}
          />
          <Figure
            to="/documents"
            figure={String(missing)}
            label={t("dashboard.papersMissing")}
            detail={
              runningOutCount > 0
                ? t("dashboard.runningOutCount", { count: runningOutCount })
                : t("dashboard.noneRunningOut")
            }
            isUrgent={runningOutCount > 0}
          />
        </div>

        {/* On a phone what needs us comes straight after what is next; beside them on a wide screen. */}
        <div className="mt-6 grid items-start gap-6 font-playful text-ink lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <NextUpCard entry={nextUp} category={nextUp === null ? undefined : categoryOf(nextUp)} />
          </div>
          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <NeedsYouCard list={attention} />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <ComingUpCard
              entries={comingUp}
              categoryOf={categoryOf}
              linkOf={(entry) => (entry.kind === "event" ? "/calendar" : "/checklist")}
              footer={
                <Link to="/calendar" className="mt-3 inline-block text-lg text-ink underline underline-offset-4">
                  {t("dashboard.seeCalendar")}
                </Link>
              }
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader title={t("dashboard.title")} subtitle={countdownLine} art="engagement.png" />
      {body()}
    </>
  );
}
