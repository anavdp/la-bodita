import { useMemo, useState } from "react";

import type { Category, CategoryDraft } from "../../api/types";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { CategoryFormDialog } from "../planning/CategoryFormDialog";
import { usePlanning } from "../planning/usePlanning";
import { CategoryTable } from "./CategoryTable";

/** Which category the drawer is open for: one to edit, or null to create one. */
type DrawerTarget = { category: Category | null } | null;

/**
 * The Category Manager: every tag the couple has made, with its icon, color
 * and how many items wear it. Deleting one keeps its items, uncategorized.
 */
export function CategoriesPage() {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();
  const planning = usePlanning(wedding?.id ?? null);
  const { categories, items, isLoading, hasLoadError } = planning;

  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return categories.filter((category) => category.name.toLowerCase().includes(needle));
  }, [categories, term]);
  const itemCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of items) {
      if (item.categoryId !== null) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const handleSave = async (draft: CategoryDraft) => {
    if (drawerTarget?.category) {
      await planning.editCategory(drawerTarget.category.id, draft);
    } else {
      await planning.addCategory(draft);
    }
    setDrawerTarget(null);
  };

  const handleDelete = async (category: Category) => {
    setActionError(null);
    try {
      await planning.removeCategory(category.id);
    } catch {
      setActionError("categories.deleteFailed");
    }
  };

  const tableArea = () => {
    if (isLoading) {
      return <p className="font-playful text-xl text-ink/70">{t("categories.loading")}</p>;
    }
    if (hasLoadError) {
      return (
        <div className="flex flex-col items-start gap-4">
          <p className="font-playful text-xl text-coral">{t("planning.loadFailed")}</p>
          <button type="button" onClick={planning.reload} className={secondaryButton}>
            {t("planning.retry")}
          </button>
        </div>
      );
    }
    if (categories.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("categories.empty")}</p>;
    }
    if (visible.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("categories.noMatches", { term })}</p>;
    }
    return (
      <div className={`${outlinedCard} overflow-hidden`}>
        <CategoryTable
          categories={visible}
          itemCounts={itemCounts}
          onEdit={(category) => setDrawerTarget({ category })}
          onDelete={handleDelete}
        />
        <p className="border-t-2 border-ink/15 px-6 py-4 font-playful text-lg text-ink">
          {t("categories.showing", { shown: visible.length, total: categories.length })}
        </p>
      </div>
    );
  };

  return (
    <>
      <PageHeader title={t("categories.title")} subtitle={t("categories.subtitle")} art="generic.png">
        <HeaderAction icon="add" label={t("categories.addOpen")} onClick={() => setDrawerTarget({ category: null })} />
      </PageHeader>

      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}
      {tableArea()}

      {drawerTarget !== null && (
        <CategoryFormDialog
          category={drawerTarget.category}
          existingCount={categories.length}
          onSave={handleSave}
          onClose={() => setDrawerTarget(null)}
        />
      )}
    </>
  );
}
