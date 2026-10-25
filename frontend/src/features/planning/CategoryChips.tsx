import type { Category } from "../../api/types";
import { Dropdown } from "../../components/form/Dropdown";
import { useIsPhone } from "../../components/layout/useIsPhone";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { isIconName } from "../../components/playful/iconCatalog";
import { useTranslation } from "../../i18n/LanguageProvider";

export const chip = (isActive: boolean) =>
  `inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink px-4 py-1.5 font-playful text-lg text-ink transition-colors ${
    isActive ? "bg-accent" : "bg-cream-light hover:bg-accent/40"
  }`;

/**
 * "⛪ Church" for a category still on an emoji, just "Church" for one with an
 * icon (drawn beside it by CategoryIcon) or with neither.
 */
export const categoryLabel = (category: Pick<Category, "name" | "emoji">) =>
  category.emoji && !isIconName(category.emoji) ? `${category.emoji} ${category.name}` : category.name;

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

/**
 * One tap narrows a screen to a category; tapping it again, or "All", widens it back.
 * On a phone, where a row of chips piles up, they fold into one dropdown.
 */
export function CategoryChips({ categories, activeId, onChange, counts, showAll = true }: CategoryChipsProps) {
  const { t } = useTranslation();
  const isPhone = useIsPhone();
  const withCount = (label: string, count: number | undefined) =>
    count === undefined ? label : `${label} ${count}`;

  if (isPhone) {
    // The dropdown always offers "All": it is the only way back from a category here.
    const options = [
      // Alone, "All" could read as all tasks rather than all categories.
      { value: "", label: withCount(t("planning.everyCategory"), counts?.all) },
      ...categories.map((category) => ({
        value: String(category.id),
        label: withCount(categoryLabel(category), counts && (counts.byCategory.get(category.id) ?? 0)),
      })),
    ];
    return (
      <div className="min-w-[11rem] flex-1">
        <Dropdown
          label={t("planning.filterLabel")}
          hideLabel
          value={activeId === null ? "" : String(activeId)}
          options={options}
          onChange={(value) => onChange(value === "" ? null : Number(value))}
          triggerClassName={`${chip(activeId !== null)} w-full`}
        />
      </div>
    );
  }

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
          <CategoryIcon value={category.emoji} />
          {withCount(categoryLabel(category), counts && (counts.byCategory.get(category.id) ?? 0))}
        </button>
      ))}
    </div>
  );
}
