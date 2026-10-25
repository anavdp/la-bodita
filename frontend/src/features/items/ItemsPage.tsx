import { useMemo, useState } from "react";

import type { Item, ItemDraft, ItemStatus, Task } from "../../api/types";
import { CalendarMark } from "../../components/playful/CalendarMark";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { isIconName } from "../../components/playful/iconCatalog";
import { PageHeader } from "../../components/playful/PageHeader";
import { outlinedCard, primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { CategoryChips } from "../planning/CategoryChips";
import { CategoryFormDialog } from "../planning/CategoryFormDialog";
import { formatDueDate } from "../planning/schedule";
import { usePlanning } from "../planning/usePlanning";
import { ItemDetail, instagramHandle } from "./ItemDetail";
import { ItemFormDialog } from "./ItemFormDialog";
import { statusPill } from "./itemStatus";
import { PrivateMark } from "../planning/Privacy";

/** Which item dialog is open: an item to edit, or null to create one. */
type DialogTarget = { item: Item | null } | null;

const card = `${outlinedCard} p-4`;

/**
 * Every vendor, place and thing being decided on, filterable by category, with
 * the picked one's details and tasks beside the list.
 */
export function ItemsPage() {
  const { t, language } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();
  const planning = usePlanning(wedding?.id ?? null);
  const { categories, items, tasks, isLoading, hasLoadError } = planning;

  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const categoriesById = useMemo(() => new Map(categories.map((each) => [each.id, each])), [categories]);
  const searched = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return items.filter((item) =>
      [item.name, item.contactName].some((text) => text?.toLowerCase().includes(needle)),
    );
  }, [items, term]);
  const visible = searched.filter((item) => categoryFilter === null || item.categoryId === categoryFilter);
  const counts = useMemo(() => {
    const byCategory = new Map<number, number>();
    for (const item of searched) {
      if (item.categoryId !== null) byCategory.set(item.categoryId, (byCategory.get(item.categoryId) ?? 0) + 1);
    }
    return { all: searched.length, byCategory };
  }, [searched]);

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
  const selectedTasks = selected ? tasks.filter((task) => task.itemId === selected.id) : [];

  /** Runs a change from the list or the panel, reporting a failure above the list. */
  const attempt = async (change: () => Promise<void>) => {
    setActionError(null);
    try {
      await change();
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const handleSaveItem = async (draft: ItemDraft) => {
    if (dialogTarget?.item) {
      await planning.editItem(dialogTarget.item.id, draft);
    } else {
      await planning.addItem(draft);
    }
    setDialogTarget(null);
  };

  const handleDelete = (item: Item) => {
    if (window.confirm(t("items.deleteConfirm", { name: item.name }))) {
      void attempt(() => planning.removeItem(item.id));
    }
  };

  /** The subcategory's icon or emoji, else its category's. */
  const markOf = (item: Item) => {
    const category = item.categoryId === null ? undefined : categoriesById.get(item.categoryId);
    const subcategory = category?.subcategories.find((each) => each.id === item.subcategoryId);
    return subcategory?.emoji ?? category?.emoji ?? null;
  };

  /** Who to talk to, then how many tasks are still open. */
  const sublineOf = (item: Item) => {
    const who = item.contactName ?? (item.instagramUrl ? instagramHandle(item.instagramUrl).handle : null);
    const open = item.taskCount - item.doneTaskCount;
    return [who, open > 0 ? t("items.openTasks", { count: open }) : null].filter(Boolean).join(" · ");
  };

  const listArea = () => {
    if (isLoading) {
      return <p className="font-playful text-xl text-ink/70">{t("items.loading")}</p>;
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
    if (items.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("items.empty")}</p>;
    }
    if (visible.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("items.noMatches")}</p>;
    }
    return (
      <ul className="flex flex-col">
        {visible.map((item) => (
          <li key={item.id} className="border-b-2 border-ink/10 last:border-b-0">
            <button
              type="button"
              onClick={() => setSelectedId(item.id)}
              aria-current={item.id === selected?.id}
              className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl px-3 py-4 text-left transition-colors sm:grid-cols-[2.5rem_1fr_8rem_8rem] ${
                item.id === selected?.id ? "bg-accent/60" : "hover:bg-accent/25"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center text-2xl" aria-hidden="true">
                {isIconName(markOf(item)) ? <CategoryIcon value={markOf(item)} className="h-10 w-10" /> : (markOf(item) ?? "•")}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-playful text-xl text-ink">
                  <span className="truncate">{item.name}</span>
                  {(item.isPrivate || (item.categoryId !== null && categoriesById.get(item.categoryId)?.isPrivate)) && (
                    <PrivateMark />
                  )}
                </span>
                <span className="block truncate font-playful text-base text-ink/70">
                  {sublineOf(item)}
                </span>
              </span>
              <span className="hidden items-center gap-2 font-playful text-base text-ink sm:flex">
                {item.nextTask ? (
                  <>
                    <CalendarMark className="h-5 w-5" />
                    {formatDueDate(item.nextTask.dueDate, language)}
                  </>
                ) : (
                  "–"
                )}
              </span>
              <span className="justify-self-end">
                <span className={statusPill(item.status)}>{t(`items.status.${item.status}`)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <PageHeader title={t("items.title")} subtitle={t("items.subtitle")} art="title-car.png">
        <button type="button" onClick={() => setDialogTarget({ item: null })} className={primaryButton}>
          {t("items.add")}
        </button>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <CategoryChips
          categories={categories}
          activeId={categoryFilter}
          onChange={setCategoryFilter}
          counts={counts}
        />
        <button
          type="button"
          onClick={() => setIsCategoryDialogOpen(true)}
          className="rounded-full border-[2.5px] border-dashed border-ink px-4 py-1.5 font-playful text-lg text-ink transition-colors hover:bg-accent/40"
        >
          {t("categories.add")}
        </button>
      </div>

      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className={card}>{listArea()}</div>
        {selected && !isLoading && (
          <ItemDetail
            key={selected.id}
            item={selected}
            category={selected.categoryId === null ? null : (categoriesById.get(selected.categoryId) ?? null)}
            tasks={selectedTasks}
            onChangeStatus={(status: ItemStatus) => void attempt(() => planning.editItem(selected.id, { status }))}
            onEdit={() => setDialogTarget({ item: selected })}
            onDelete={() => handleDelete(selected)}
            onAddTask={planning.addTask}
            onToggleTask={(task: Task) => void attempt(() => planning.setTaskDone(task.id, !task.isDone))}
            onDeleteTask={(task: Task) => void attempt(() => planning.removeTask(task.id))}
          />
        )}
      </div>

      {dialogTarget !== null && (
        <ItemFormDialog
          item={dialogTarget.item}
          categories={categories}
          onSave={handleSaveItem}
          onClose={() => setDialogTarget(null)}
        />
      )}

      {isCategoryDialogOpen && (
        <CategoryFormDialog
          existingCount={categories.length}
          onSave={async (draft) => {
            await planning.addCategory(draft);
            setIsCategoryDialogOpen(false);
          }}
          onClose={() => setIsCategoryDialogOpen(false)}
        />
      )}
    </>
  );
}
