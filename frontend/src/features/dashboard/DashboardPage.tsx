import { useId, useMemo } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { Category } from "../../api/types";
import { daysUntil } from "../../components/layout/countdown";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { isIconName } from "../../components/playful/iconCatalog";
import { PageHeader } from "../../components/playful/PageHeader";
import { outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { formatMoney, formatTotals, summarise } from "../budget/budgetMath";
import { fromIso, toEntries, toIso, upcoming } from "../calendar/calendarMath";
import type { CalendarEntry } from "../calendar/calendarMath";
import { ComingUpCard, NextUpCard, cardLabel } from "../calendar/Upcoming";
import { formatPaperDate, itemsWaiting } from "../documents/papers";
import { summariseRsvps } from "../guests/guestSummary";
import { formatDueDate, isOverdue } from "../planning/schedule";
import { CategoryBars, Donut, DonutLegend, SummaryCard } from "./charts";
import type { DonutSegment } from "./charts";
import { needsYou, paperProgress, spendByCategory } from "./dashboardMath";
import type { Attention } from "./dashboardMath";
import { useDashboard } from "./useDashboard";
import type { DashboardData } from "./useDashboard";

/** How many papers an item's row names before it says "and N more". */
const PAPERS_NAMED = 3;

/** The dashboard lists only the first few things coming up; the calendar has the rest. */
const COMING_UP_SHOWN = 5;

/** Theme colors as CSS, for chart marks drawn in SVG. */
const token = (name: string) => `rgb(var(--color-play-${name}))`;

/** The tagline: how long until the wedding, and which day it is. */
function useCountdownLine(weddingDate: string | null | undefined): string {
  const { t, language } = useTranslation();
  if (!weddingDate) return t("dashboard.noDate");
  const date = new Intl.DateTimeFormat(language, { weekday: "long", month: "long", day: "numeric" }).format(
    fromIso(weddingDate),
  );
  const remaining = daysUntil(weddingDate);
  if (remaining > 1) return t("dashboard.countdown", { count: remaining, date });
  if (remaining === 1) return t("dashboard.tomorrow", { date });
  return t("dashboard.today");
}

/** A short line under a chart; coral when it is something to act on. */
function Note({ children, isUrgent = false }: { children: ReactNode; isUrgent?: boolean }) {
  return <p className={`text-base ${isUrgent ? "text-coral" : "text-ink/70"}`}>{children}</p>;
}

function GuestsCard({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const rsvps = summariseRsvps(data.guests);
  const segments: DonutSegment[] = [
    { key: "confirmed", label: t("dashboard.saidYes"), value: rsvps.confirmed, color: token("mint") },
    { key: "pending", label: t("dashboard.stillWaiting"), value: rsvps.pending, color: token("butter-deep") },
    { key: "declined", label: t("dashboard.cantCome"), value: rsvps.declined, color: token("coral") },
  ];
  return (
    <SummaryCard art="title-cheers.png" title={t("nav.guests")} to="/guests">
      {rsvps.total === 0 ? (
        <Note>{t("dashboard.noGuests")}</Note>
      ) : (
        <div className="flex items-center gap-4">
          <Donut
            segments={segments}
            figure={String(rsvps.total)}
            caption={t("dashboard.guestsCaption")}
            label={t("dashboard.rsvpChart", { yes: rsvps.confirmed, waiting: rsvps.pending, no: rsvps.declined })}
          />
          <DonutLegend segments={segments} />
        </div>
      )}
    </SummaryCard>
  );
}

function BudgetCard({ data }: { data: DashboardData }) {
  const { t, language } = useTranslation();
  const [main, ...others] = spendByCategory(data.lines, data.categories);
  const plan = summarise(data.lines);
  return (
    <SummaryCard art="title-budget.png" title={t("nav.budget")} to="/budget">
      {main === undefined ? (
        <Note>{t("dashboard.nothingBooked")}</Note>
      ) : (
        <>
          <p>
            <span className="font-playful-display text-[30px] leading-none">
              {formatMoney(main.total, main.currency, language)}
            </span>{" "}
            <span className="text-lg">{t("dashboard.settled")}</span>
          </p>
          <CategoryBars slices={main.slices} currency={main.currency} />
          {others.length > 0 && (
            <Note>
              {t("dashboard.alsoIn", {
                amounts: others.map((group) => formatMoney(group.total, group.currency, language)).join(" + "),
              })}
            </Note>
          )}
          <Note>{t("dashboard.ofPlan", { total: formatTotals(plan, "total", language) })}</Note>
        </>
      )}
    </SummaryCard>
  );
}

function ChecklistCard({ data }: { data: DashboardData }) {
  const { t, language } = useTranslation();
  const today = new Date();
  const done = data.tasks.filter((task) => task.isDone).length;
  const open = data.tasks.filter((task) => !task.isDone);
  const late = open.filter((task) => isOverdue(task, today)).length;
  // The soonest dated task from today on; late ones are on the Needs you card.
  const next = upcoming(toEntries(open, []), toIso(today))[0];
  return (
    <SummaryCard art="title-checklist.png" title={t("nav.checklist")} to="/checklist">
      <div className="flex items-center gap-4">
        <Donut
          segments={[
            { key: "done", label: t("dashboard.doneCaption"), value: done, color: token("sky") },
            {
              key: "open",
              label: t("dashboard.toDo", { count: open.length }),
              value: open.length,
              color: "transparent",
            },
          ]}
          figure={String(done)}
          caption={t("dashboard.doneCaption")}
          label={t("dashboard.tasksChart", { done, total: data.tasks.length })}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg">{t("dashboard.toDo", { count: open.length })}</p>
          <Note isUrgent={late > 0}>{late > 0 ? t("dashboard.late", { count: late }) : t("dashboard.onTime")}</Note>
          {next !== undefined && (
            <Note>
              {t("dashboard.nextTask", { title: `${next.title} · ${formatDueDate(next.startDate, language)}` })}
            </Note>
          )}
        </div>
      </div>
    </SummaryCard>
  );
}

function PapersCard({ data, runningOut }: { data: DashboardData; runningOut: number }) {
  const { t } = useTranslation();
  const { inHand, missing } = paperProgress(data.requests, data.documents, data.people, toIso(new Date()));
  const nextItem = itemsWaiting(data.requests)[0];
  return (
    <SummaryCard art="title-documents.png" title={t("nav.documents")} to="/documents">
      {inHand + missing === 0 ? (
        <Note>{t("dashboard.noPapers")}</Note>
      ) : (
        <div className="flex items-center gap-4">
          <Donut
            segments={[
              { key: "inHand", label: t("dashboard.inHandCaption"), value: inHand, color: token("mint") },
              {
                key: "missing",
                label: t("dashboard.papersMissing", { count: missing }),
                value: missing,
                color: "transparent",
              },
            ]}
            figure={String(inHand)}
            caption={t("dashboard.inHandCaption")}
            label={t("dashboard.papersChart", { have: inHand, total: inHand + missing })}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-lg">{t("dashboard.papersMissing", { count: missing })}</p>
            {runningOut > 0 && <Note isUrgent>{t("dashboard.runningOutCount", { count: runningOut })}</Note>}
            {nextItem !== undefined && (
              <Note>{t("dashboard.nextPaper", { name: `${nextItem.missing[0].name} · ${nextItem.itemName}` })}</Note>
            )}
          </div>
        </div>
      )}
    </SummaryCard>
  );
}

interface AttentionRowProps {
  to: string;
  category: Category | undefined;
  /** A Material Symbols icon, for a category without a drawing of its own. */
  fallbackIcon: string;
  title: string;
  detail: string;
}

/** One thing waiting on us, in its category's color and drawing. */
function AttentionRow({ to, category, fallbackIcon, title, detail }: AttentionRowProps) {
  const tint = category
    ? `color-mix(in srgb, ${category.color} 45%, rgb(var(--color-play-cream-light)))`
    : "rgb(var(--color-play-coral-soft))";
  return (
    <li className="border-t-2 border-ink/10 first:border-t-0">
      <Link to={to} className="flex items-center gap-3 rounded-xl py-3 transition-colors hover:bg-accent/30">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink"
          style={{ backgroundColor: tint }}
        >
          {isIconName(category?.emoji) ? (
            <CategoryIcon value={category?.emoji} className="h-7 w-7" />
          ) : (
            <span className="material-symbols-outlined text-[20px] text-ink">{fallbackIcon}</span>
          )}
        </span>
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

interface NeedsYouCardProps {
  list: Attention[];
  categoryOf: (categoryId: number | null) => Category | undefined;
}

/** What is waiting on us: late tasks, papers running out, items still waiting on papers. */
function NeedsYouCard({ list, categoryOf }: NeedsYouCardProps) {
  const { t, language } = useTranslation();
  const headingId = useId();

  const row = (entry: Attention) => {
    if (entry.kind === "lateTask") {
      return (
        <AttentionRow
          key={entry.key}
          to="/checklist"
          category={categoryOf(entry.task.categoryId)}
          fallbackIcon="alarm"
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
          category={categoryOf(entry.document.categoryId)}
          fallbackIcon="hourglass_bottom"
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
        category={categoryOf(entry.item.categoryId)}
        fallbackIcon="description"
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
 * The whole wedding at a glance: how long is left, what is next, whatever is
 * waiting on us (each in its category's color) and the two weeks after; beside
 * them a card per screen with its drawing and a chart: who is coming, what is
 * booked per category, tasks done, papers in hand.
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const dashboard = useDashboard(wedding?.id ?? null);
  const { categories, tasks, events, requests, documents, isLoading, hasLoadError } = dashboard;
  const countdownLine = useCountdownLine(wedding?.wedding_date);

  const categoriesById = useMemo(() => new Map(categories.map((each) => [each.id, each])), [categories]);
  const categoryOf = (categoryId: number | null): Category | undefined =>
    categoryId === null ? undefined : categoriesById.get(categoryId);
  const entryCategory = (entry: CalendarEntry) => categoryOf(entry.categoryId);

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

    const today = new Date();
    const todayIso = toIso(today);
    const attention = needsYou({ tasks, requests, documents }, today);
    const runningOut = attention.filter((entry) => entry.kind === "runningOut").length;
    const ahead = upcoming(toEntries(tasks, events), todayIso);
    const nextUp = ahead[0] ?? null;
    const comingUp = upcoming(ahead, todayIso, 14)
      .filter((entry) => entry.key !== nextUp?.key)
      .slice(0, COMING_UP_SHOWN);

    return (
      <>
        {/* What is next and what needs us come first; each screen's chart card stands beside them, or after them on a phone. */}
        <div className="grid items-start gap-6 font-playful text-ink lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <NextUpCard entry={nextUp} category={nextUp === null ? undefined : entryCategory(nextUp)} />
            <NeedsYouCard list={attention} categoryOf={categoryOf} />
            <ComingUpCard
              entries={comingUp}
              categoryOf={entryCategory}
              linkOf={(entry) => (entry.kind === "event" ? "/calendar" : "/checklist")}
              footer={
                <Link to="/calendar" className="mt-3 inline-block text-lg text-ink underline underline-offset-4">
                  {t("dashboard.seeCalendar")}
                </Link>
              }
            />
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-1">
            <GuestsCard data={dashboard} />
            <BudgetCard data={dashboard} />
            <ChecklistCard data={dashboard} />
            <PapersCard data={dashboard} runningOut={runningOut} />
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
