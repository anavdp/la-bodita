import type { BudgetLine, Category } from "../../api/types";
import type { Language } from "../../i18n/translations";

/** What a line costs: the final price once known, else the quote; null while waiting for one. */
export const amountOf = (line: BudgetLine): number | null => line.actualAmount ?? line.estimatedAmount;

/** Switched on, booked or paid: it is part of this plan. */
export const counts = (line: BudgetLine) => line.status !== "idea";

/** Booked or paid: it stays in every plan, so it can no longer be switched off. */
export const isConfirmed = (line: BudgetLine) => line.status === "confirmed" || line.status === "paid";

/** A line with nothing to count stays off until its quote comes in. */
export const canSwitchOn = (line: BudgetLine) => amountOf(line) !== null;

export interface CurrencyTotals {
  /** Everything switched on, booked or paid. */
  total: number;
  paid: number;
  booked: number;
  /** Booked and paid together: what is settled. */
  confirmed: number;
  /** Switched on but not booked yet: still being decided. */
  open: number;
}

/** This plan's figures, one set per currency: dollars and euros are never added together. */
export function summarise(lines: BudgetLine[]): Map<string, CurrencyTotals> {
  const byCurrency = new Map<string, CurrencyTotals>();
  for (const line of lines.filter(counts)) {
    const amount = amountOf(line) ?? 0;
    const totals = byCurrency.get(line.currency) ?? { total: 0, paid: 0, booked: 0, confirmed: 0, open: 0 };
    totals.total += amount;
    if (line.status === "paid") totals.paid += amount;
    else if (line.status === "confirmed") totals.booked += amount;
    else totals.open += amount;
    if (isConfirmed(line)) totals.confirmed += amount;
    byCurrency.set(line.currency, totals);
  }
  return byCurrency;
}

const locales: Record<Language, string> = { en: "en-US", es: "es-ES" };

/** "$1,800", or "$1,750.50" when there are cents. */
export function formatMoney(amount: number, currency: string, language: Language): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat(locales[language], {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}

/** One figure across currencies, "$2,000 + €600"; "$0" when nothing counts yet. */
export function formatTotals(
  summary: Map<string, CurrencyTotals>,
  figure: keyof CurrencyTotals,
  language: Language,
): string {
  const parts = [...summary.entries()]
    .filter(([, totals]) => totals[figure] !== 0)
    .map(([currency, totals]) => formatMoney(totals[figure], currency, language));
  return parts.length > 0 ? parts.join(" + ") : formatMoney(0, "USD", language);
}

export interface CategoryGroup {
  /** The category's id, or "none" for lines whose item has no category, or that have no item. */
  key: string;
  category: Category | null;
  lines: BudgetLine[];
}

/** One group per category that has lines, in the categories' own order; lines with no category last. */
export function groupByCategory(lines: BudgetLine[], categories: Category[]): CategoryGroup[] {
  const known = new Set(categories.map((category) => category.id));
  const groups: CategoryGroup[] = categories.map((category) => ({
    key: String(category.id),
    category,
    lines: lines.filter((line) => line.categoryId === category.id),
  }));
  groups.push({
    key: "none",
    category: null,
    lines: lines.filter((line) => line.categoryId === null || !known.has(line.categoryId)),
  });
  return groups.filter((group) => group.lines.length > 0);
}
