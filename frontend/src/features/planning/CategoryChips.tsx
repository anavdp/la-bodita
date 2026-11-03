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
 * A category chip with no name and no border, just its icon: a dozen of them
 * fit in one row. The name lives in its label and tooltip.
 */
const iconChip = (isActive: boolean) =>
  `relative inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
    isActive ? "bg-accent ring-[2.5px] ring-ink" : "hover:bg-accent/40"
  }`;

/** How many things a chip stands for, tucked in its corner; faded when there are none. */
const countBadge = (isActive: boolean, count: number) =>
  `absolute -right-1 -top-1 min-w-[1.25rem] rounded-full px-1 font-playful text-xs leading-5 ${
    isActive ? "bg-ink text-cream-light" : count === 0 ? "bg-ink/15 text-ink/60" : "bg-ink/80 text-cream-light"
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
    <div role="group" aria-label={t("planning.filterLabel")} className="flex flex-wrap items-center gap-1">
      {showAll && (
        <button
          type="button"
          aria-pressed={activeId === null}
          onClick={() => onChange(null)}
          className={`${iconChip(activeId === null)} w-auto px-4 font-playful text-lg text-ink`}
        >
          {withCount(t("planning.allCategories"), counts?.all)}
        </button>
      )}
      {categories.map((category) => {
        const count = counts && (counts.byCategory.get(category.id) ?? 0);
        const isActive = activeId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            aria-label={withCount(category.name, count)}
            title={category.name}
            onClick={() => onChange(isActive ? null : category.id)}
            className={iconChip(isActive)}
          >
            {isIconName(category.emoji) ? (
              <CategoryIcon value={category.emoji} className="h-8 w-8" />
            ) : (
              <span aria-hidden="true" className="text-2xl leading-none">
                {category.emoji || category.name.charAt(0)}
              </span>
            )}
            {count !== undefined && <span className={countBadge(isActive, count)}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
