import { useMemo, useState } from "react";

import type { ReactNode } from "react";

import type { BudgetLine, BudgetLineDraft, BudgetLineStatus } from "../../api/types";
import { Switch } from "../../components/form/Switch";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { compactButton, outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { categoryLabel } from "../planning/CategoryChips";
import { BudgetLineForm } from "./BudgetLineForm";
import {
  amountOf,
  canSwitchOn,
  counts,
  formatMoney,
  formatTotals,
  groupByCategory,
  isConfirmed,
  summarise,
} from "./budgetMath";
import type { CategoryGroup } from "./budgetMath";
import { useBudget } from "./useBudget";

/** Which drawer is open: a line to edit, or null to add one. */
type FormTarget = { line: BudgetLine | null } | null;

/** A message under the totals, read out as it changes. */
type Hint = { key: TranslationKey; title?: string } | null;

const collapsedKey = "la-bodita.budget.collapsed";

/** The categories folded away last time, in this browser only. */
function rememberedCollapsed(): Set<string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(collapsedKey) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set();
  }
}

function rememberCollapsed(keys: Set<string>): void {
  try {
    localStorage.setItem(collapsedKey, JSON.stringify([...keys]));
  } catch {
    // Private windows refuse storage; the fold just lasts this visit.
  }
}

const textLink = "font-playful text-base text-ink/70 underline underline-offset-4 transition-colors hover:text-ink";

const statePill = (status: "confirmed" | "paid") =>
  `inline-block rounded-[14px] border-2 border-ink px-3 py-0.5 font-playful text-base text-ink ${
    status === "paid" ? "bg-mint-soft" : "bg-sky-soft"
  }`;

interface LineRowProps {
  line: BudgetLine;
  isChoosing: boolean;
  onChoose: (isChoosing: boolean) => void;
  onStatus: (line: BudgetLine, status: BudgetLineStatus) => void;
  onEdit: (line: BudgetLine) => void;
}

/** One alternative: its switch, what it is and who from, what it costs, and where it stands. */
function LineRow({ line, isChoosing, onChoose, onStatus, onEdit }: LineRowProps) {
  const { t, language } = useTranslation();
  const amount = amountOf(line);
  const isOn = counts(line);
  const subline = [line.itemName, line.notes].filter(Boolean).join(" · ");

  const state = () => {
    if (line.status === "paid" || line.status === "confirmed") {
      return (
        <>
          <span className={statePill(line.status)}>
            {line.status === "paid" ? `✓ ${t("budget.paid")}` : t("budget.booked")}
          </span>
          {line.status === "confirmed" && (
            <button type="button" onClick={() => onStatus(line, "paid")} className={textLink}>
              {t("budget.markPaid")}
            </button>
          )}
          <button type="button" onClick={() => onStatus(line, "considering")} className={textLink}>
            {t("budget.undo")}
          </button>
        </>
      );
    }
    if (line.status === "considering" && isChoosing) {
      return (
        <>
          <button type="button" onClick={() => onStatus(line, "confirmed")} className={compactButton}>
            {t("budget.booked")}
          </button>
          <button type="button" onClick={() => onStatus(line, "paid")} className={compactButton}>
            {t("budget.paid")}
          </button>
          <button type="button" onClick={() => onChoose(false)} className={textLink}>
            {t("budget.notYet")}
          </button>
        </>
      );
    }
    if (line.status === "considering") {
      return (
        <button type="button" onClick={() => onChoose(true)} className={compactButton}>
          {t("budget.confirm")}
        </button>
      );
    }
    return null;
  };

  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t-2 border-ink/10 py-3 font-playful text-ink lg:grid-cols-[3.5rem_minmax(0,1fr)_auto_minmax(14rem,auto)_auto]">
      <Switch
        label={t("budget.countLine", { title: line.title })}
        checked={isOn}
        disabled={isConfirmed(line) || (!isOn && !canSwitchOn(line))}
        onChange={(checked) => onStatus(line, checked ? "considering" : "idea")}
      />
      <span className="min-w-0">
        <span className={`block truncate text-xl ${isOn ? "" : "text-ink/60"}`}>{line.title}</span>
        {subline !== "" && <span className="block truncate text-base text-ink/70">{subline}</span>}
      </span>
      <span
        className={`text-right ${
          amount === null
            ? "text-base text-ink/60"
            : `font-playful-display text-2xl ${isOn ? "" : "text-ink/50"}`
        }`}
      >
        {amount === null ? t("budget.noQuote") : formatMoney(amount, line.currency, language)}
      </span>
      <span className="col-start-2 flex flex-wrap items-center gap-3 lg:col-start-auto lg:justify-end">
        {state()}
      </span>
      <button
        type="button"
        aria-label={t("budget.edit", { title: line.title })}
        onClick={() => onEdit(line)}
        className="col-start-3 row-start-2 flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-ink/70 transition-colors hover:bg-accent/40 hover:text-ink lg:col-start-auto lg:row-start-auto"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          edit
        </span>
      </button>
    </li>
  );
}

interface CategoryCardProps {
  group: CategoryGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** A category's alternatives; folded, its header still says what is picked and what it adds up to. */
function CategoryCard({ group, isCollapsed, onToggle, children }: CategoryCardProps) {
  const { t, language } = useTranslation();
  const { category, lines } = group;
  const label = category ? categoryLabel(category) : t("planning.uncategorized");
  const on = lines.filter(counts);
  const rowsId = `budget-rows-${group.key}`;
  const subline = isCollapsed
    ? on.length > 0
      ? on.map((line) => line.title).join(", ")
      : t("budget.nothingOn")
    : t("budget.onCount", { on: on.length, total: lines.length });

  return (
    <section aria-label={label} className={outlinedCard}>
      <h2>
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={rowsId}
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-[26px] px-5 py-4 text-left font-playful text-ink transition-colors hover:bg-accent/25"
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-ink/70 transition-transform motion-reduce:transition-none ${
              isCollapsed ? "-rotate-90" : ""
            }`}
          >
            expand_more
          </span>
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border-2 border-ink"
            style={{ backgroundColor: category?.color ?? "transparent" }}
          />
          <CategoryIcon value={category?.emoji} className="h-9 w-9" />
          <span className="min-w-0 truncate text-2xl sm:shrink-0">{label}</span>
          <span className="hidden min-w-0 flex-1 truncate text-base text-ink/70 sm:block">{subline}</span>
          <span className="ml-auto shrink-0 font-playful-display text-2xl">
            {formatTotals(summarise(lines), "total", language)}
          </span>
        </button>
      </h2>
      <ul id={rowsId} hidden={isCollapsed} className="px-5 pb-2">
        {!isCollapsed && children}
      </ul>
    </section>
  );
}

/**
 * Every cost of the wedding, grouped by category, with alternatives switched on
 * and off to watch the total move. Booked and paid lines stay on for good.
 */
export function BudgetPage() {
  const { t, language } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();
  const budget = useBudget(wedding?.id ?? null);
  const { categories, items, lines, isLoading, hasLoadError } = budget;

  const [collapsed, setCollapsed] = useState<Set<string>>(rememberedCollapsed);
  const [choosingId, setChoosingId] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [hint, setHint] = useState<Hint>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return lines.filter((line) =>
      [line.title, line.itemName, line.notes].some((text) => text?.toLowerCase().includes(needle)),
    );
  }, [lines, term]);
  const groups = groupByCategory(visible, categories);
  // The totals are the whole plan's, whatever the search narrows the list to.
  const summary = summarise(lines);
  const singleCurrency = summary.size === 1 ? [...summary.values()][0] : null;
  const isAllCollapsed = groups.length > 0 && groups.every((group) => collapsed.has(group.key));

  const fold = (next: Set<string>) => {
    setCollapsed(next);
    rememberCollapsed(next);
  };
  const toggleGroup = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    fold(next);
  };
  const toggleAll = () => fold(isAllCollapsed ? new Set() : new Set(groups.map((group) => group.key)));

  const changeStatus = async (line: BudgetLine, status: BudgetLineStatus) => {
    setActionError(null);
    setChoosingId(null);
    try {
      await budget.setStatus(line.id, status);
      setHint(
        status === "confirmed" || status === "paid"
          ? { key: status === "paid" ? "budget.hint.paid" : "budget.hint.booked", title: line.title }
          : null,
      );
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const switchAllOff = async () => {
    setActionError(null);
    setChoosingId(null);
    try {
      await Promise.all(
        lines.filter((line) => line.status === "considering").map((line) => budget.setStatus(line.id, "idea")),
      );
      setHint({ key: "budget.hint.switchedOff" });
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const handleSave = async (draft: BudgetLineDraft) => {
    if (formTarget?.line) {
      await budget.editLine(formTarget.line.id, draft);
    } else {
      await budget.addLine(draft);
    }
    setFormTarget(null);
  };

  const handleDelete = async (line: BudgetLine) => {
    if (!window.confirm(t("budget.deleteConfirm", { title: line.title }))) return;
    setFormTarget(null);
    setActionError(null);
    try {
      await budget.removeLine(line.id);
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const figure = (labelKey: TranslationKey, value: string, dot?: string) => (
    <div className="flex min-w-[140px] flex-1 flex-col items-center justify-center px-3 py-2 text-ink">
      <span className="flex items-center gap-2 font-playful-display text-[30px] leading-none">
        {dot !== undefined && <span aria-hidden="true" className={`h-4 w-4 rounded-full border-2 border-ink ${dot}`} />}
        {value}
      </span>{" "}
      <span className="font-playful text-xl">{t(labelKey)}</span>
    </div>
  );

  const listArea = () => {
    if (isLoading) {
      return <p className={`${outlinedCard} p-6 font-playful text-xl text-ink/70`}>{t("budget.loading")}</p>;
    }
    if (hasLoadError) {
      return (
        <div className={`${outlinedCard} flex flex-col items-start gap-4 p-6`}>
          <p className="font-playful text-xl text-coral">{t("planning.loadFailed")}</p>
          <button type="button" onClick={budget.reload} className={secondaryButton}>
            {t("planning.retry")}
          </button>
        </div>
      );
    }
    if (lines.length === 0) {
      return <p className={`${outlinedCard} p-6 font-playful text-xl text-ink/70`}>{t("budget.empty")}</p>;
    }
    if (groups.length === 0) {
      return <p className={`${outlinedCard} p-6 font-playful text-xl text-ink/70`}>{t("budget.noMatches")}</p>;
    }
    return groups.map((group) => (
      <CategoryCard
        key={group.key}
        group={group}
        isCollapsed={collapsed.has(group.key)}
        onToggle={() => toggleGroup(group.key)}
      >
        {group.lines.map((line) => (
          <LineRow
            key={line.id}
            line={line}
            isChoosing={choosingId === line.id}
            onChoose={(isChoosing) => setChoosingId(isChoosing ? line.id : null)}
            onStatus={(each, status) => void changeStatus(each, status)}
            onEdit={(each) => setFormTarget({ line: each })}
          />
        ))}
      </CategoryCard>
    ));
  };

  const lastCurrency = lines.length > 0 ? lines[lines.length - 1].currency : "USD";

  return (
    <>
      <PageHeader title={t("budget.title")} subtitle={t("budget.subtitle")} art="title-budget.png">
        <HeaderAction icon="add" label={t("budget.add")} onClick={() => setFormTarget({ line: null })} />
      </PageHeader>

      <div className="sticky top-24 z-10 mb-4 rounded-[28px] border-[2.5px] border-ink bg-accent p-2">
        <div role="group" aria-label={t("budget.summary")} className="flex flex-wrap md:flex-nowrap md:divide-x-2 md:divide-ink/40">
          <div className="flex min-w-[180px] flex-1 flex-col items-center justify-center px-3 py-2 text-ink">
            <span data-figure="total" className="font-playful-display text-[44px] leading-none">
              {formatTotals(summary, "total", language)}
            </span>{" "}
            <span className="font-playful text-xl">{t("budget.thisPlan")}</span>
          </div>
          {figure("budget.confirmed", formatTotals(summary, "confirmed", language), "bg-mint")}
          {figure("budget.deciding", formatTotals(summary, "open", language), "bg-butter-deep")}
        </div>
        {singleCurrency !== null && singleCurrency.total > 0 && (
          <div
            aria-hidden="true"
            className="mx-3 mb-2 mt-1 flex h-4 overflow-hidden rounded-full border-2 border-ink bg-cream-light"
          >
            <span className="h-full bg-mint" style={{ width: `${(singleCurrency.paid / singleCurrency.total) * 100}%` }} />
            <span className="h-full bg-sky" style={{ width: `${(singleCurrency.booked / singleCurrency.total) * 100}%` }} />
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl font-playful text-base text-ink/70">{t("budget.legend")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void switchAllOff()} className={compactButton}>
            {t("budget.switchAllOff")}
          </button>
          <button type="button" onClick={toggleAll} className={compactButton}>
            {t(isAllCollapsed ? "budget.expandAll" : "budget.collapseAll")}
          </button>
        </div>
      </div>

      <p aria-live="polite" className="mb-2 min-h-[1.5rem] font-playful text-lg text-ink">
        {hint && t(hint.key, hint.title === undefined ? {} : { title: hint.title })}
      </p>
      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}

      <div className="flex flex-col gap-4">{listArea()}</div>

      {formTarget !== null && (
        <BudgetLineForm
          line={formTarget.line}
          items={items}
          defaultCurrency={lastCurrency}
          onSave={handleSave}
          onDelete={formTarget.line ? () => void handleDelete(formTarget.line as BudgetLine) : undefined}
          onClose={() => setFormTarget(null)}
        />
      )}
    </>
  );
}

