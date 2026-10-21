import type { Category } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";

export const chip = (isActive: boolean) =>
  `rounded-full border px-4 py-1.5 font-label-md text-label-md transition-colors ${
    isActive
      ? "border-primary bg-primary text-on-primary"
      : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
  }`;

/** "⛪ Church", or just "Church" for a category with no emoji. */
export const categoryLabel = (category: Pick<Category, "name" | "emoji">) =>
  category.emoji ? `${category.emoji} ${category.name}` : category.name;

interface CategoryChipsProps {
  categories: Category[];
  /** The picked category, or null for all of them. */
  activeId: number | null;
  onChange: (categoryId: number | null) => void;
  /** How many things each chip stands for, keyed by category id; omitted, chips show no counts. */
  counts?: { all: number; byCategory: Map<number, number> };
  /** Whether to offer an "All" chip: the checklist's to-do/done chips sit before these instead. */
  showAll?: boolean;
}

/** One tap narrows a screen to a category; tapping it again, or "All", widens it back. */
export function CategoryChips({ categories, activeId, onChange, counts, showAll = true }: CategoryChipsProps) {
  const { t } = useTranslation();
  const withCount = (label: string, count: number | undefined) =>
    count === undefined ? label : `${label} ${count}`;

  return (
    <div role="group" aria-label={t("planning.filterLabel")} className="flex flex-wrap gap-2">
      {showAll && (
        <button
          type="button"
          aria-pressed={activeId === null}
          onClick={() => onChange(null)}
          className={chip(activeId === null)}
        >
          {withCount(t("planning.allCategories"), counts?.all)}
        </button>
      )}
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={activeId === category.id}
          onClick={() => onChange(activeId === category.id ? null : category.id)}
          className={chip(activeId === category.id)}
        >
          {withCount(categoryLabel(category), counts && (counts.byCategory.get(category.id) ?? 0))}
        </button>
      ))}
    </div>
  );
}
