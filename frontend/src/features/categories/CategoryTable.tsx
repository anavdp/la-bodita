import { useState } from "react";

import type { Category } from "../../api/types";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { isIconName } from "../../components/playful/iconCatalog";
import { menuItem, menuPanel } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { NotSpecified } from "../guests/NotSpecified";

interface CategoryTableProps {
  categories: Category[];
  /** How many items wear each category, keyed by its id. */
  itemCounts: Map<number, number>;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const headerCell = "px-4 py-4 font-normal";
const cell = "px-4 py-3";

/** The guest list's table, for categories: one row each, with its icon, color and what uses it. */
export function CategoryTable({ categories, itemCounts, onEdit, onDelete }: CategoryTableProps) {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const closeMenu = () => {
    setOpenMenuId(null);
    setIsConfirmingDelete(false);
  };

  const toggleMenu = (category: Category) => {
    setIsConfirmingDelete(false);
    setOpenMenuId((current) => (current === category.id ? null : category.id));
  };

  const itemsLabel = (count: number) =>
    count === 0
      ? t("categories.itemsNone")
      : count === 1
        ? t("categories.itemsOne")
        : t("categories.itemsMany", { count });

  /** What happens to the items, said before the delete is confirmed. */
  const deleteNote = (count: number) =>
    count === 0
      ? t("categories.delete.none")
      : count === 1
        ? t("categories.delete.one")
        : t("categories.delete.many", { count });

  return (
    // As on the guest list: room below while a menu is open, so the scrolling
    // wrapper does not clip a menu opened on the last row.
    <div className={`overflow-x-auto ${openMenuId === null ? "" : "pb-36"}`}>
      <table className="w-full border-collapse text-left font-playful text-ink">
        <thead>
          <tr className="border-b-[2.5px] border-ink bg-cream text-[15px] uppercase tracking-wider">
            <th className={`${headerCell} border-r-2 border-ink/20 pl-6`}>{t("categories.column.name")}</th>
            <th className={headerCell}>{t("categories.column.color")}</th>
            <th className={headerCell}>{t("categories.column.subcategories")}</th>
            <th className={headerCell}>{t("categories.column.items")}</th>
            <th className={`${headerCell} pr-6 text-right`}>{t("categories.column.actions")}</th>
          </tr>
        </thead>
        <tbody className="text-lg">
          {categories.map((category) => {
            const count = itemCounts.get(category.id) ?? 0;
            const isOpen = openMenuId === category.id;

            return (
              <tr
                key={category.id}
                className="border-b-2 border-ink/15 transition-colors last:border-b-0 hover:bg-accent/25"
              >
                <td className={`${cell} border-r-2 border-ink/20 pl-6`}>
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl">
                      {isIconName(category.emoji) ? (
                        <CategoryIcon value={category.emoji} className="h-10 w-10" />
                      ) : (
                        category.emoji
                      )}
                    </span>
                    <span>{category.name}</span>
                  </span>
                </td>
                <td className={cell}>
                  <span className="flex items-center gap-3">
                    <span
                      title={category.color}
                      style={{ backgroundColor: category.color }}
                      className="h-8 w-8 shrink-0 rounded-full border-[2.5px] border-ink"
                    />
                    <span className="text-base uppercase text-ink/70">{category.color}</span>
                  </span>
                </td>
                <td className={cell}>
                  {category.subcategories.length === 0 ? (
                    <NotSpecified />
                  ) : (
                    category.subcategories.map((subcategory) => subcategory.name).join(", ")
                  )}
                </td>
                <td className={cell}>{itemsLabel(count)}</td>
                <td className={`${cell} pr-6 text-right`}>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("categories.actions.open", { name: category.name })}
                      aria-expanded={isOpen}
                      onClick={() => toggleMenu(category)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-accent/60"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        more_vert
                      </span>
                    </button>

                    {isOpen && (
                      <div className={`${menuPanel} right-0`}>
                        {isConfirmingDelete ? (
                          <>
                            <p className="max-w-[16rem] px-3 py-2 text-left text-base text-ink/80">
                              {deleteNote(count)}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                onDelete(category);
                              }}
                              className={`${menuItem} text-coral hover:bg-coral-soft`}
                            >
                              {t("categories.delete.confirm", { name: category.name })}
                            </button>
                            <button type="button" onClick={() => setIsConfirmingDelete(false)} className={menuItem}>
                              {t("planning.cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                onEdit(category);
                              }}
                              className={menuItem}
                            >
                              {t("planning.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingDelete(true)}
                              className={`${menuItem} !text-coral`}
                            >
                              {t("planning.delete")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
