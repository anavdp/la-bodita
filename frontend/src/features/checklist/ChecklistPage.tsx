import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import type { Category, Task } from "../../api/types";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { isIconName } from "../../components/playful/iconCatalog";
import { PageHeader } from "../../components/playful/PageHeader";
import { outlinedCard, primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { AddTaskForm } from "../planning/AddTaskForm";
import { CategoryChips, chip } from "../planning/CategoryChips";
import { formatDueDate, formatDueTime, groupOpenTasks, isOverdue } from "../planning/schedule";
import { usePlanning } from "../planning/usePlanning";

type Showing = "toDo" | "done";

interface TaskRowProps {
  task: Task;
  category: Category | undefined;
  onToggle: (task: Task) => void;
}

function TaskRow({ task, category, onToggle }: TaskRowProps) {
  const { language } = useTranslation();
  const due = task.dueDate
    ? [formatDueDate(task.dueDate, language), task.dueTime && formatDueTime(task.dueTime)].filter(Boolean).join(" · ")
    : "–";

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b-2 border-ink/10 py-3 font-playful text-ink last:border-b-0 sm:grid-cols-[1fr_14rem_8rem]">
      <label className="flex cursor-pointer items-center gap-4">
        <input
          type="checkbox"
          checked={task.isDone}
          onChange={() => onToggle(task)}
          className="h-6 w-6 shrink-0 cursor-pointer rounded-md border-[2.5px] border-ink bg-cream-light text-sky focus:ring-sky"
        />
        <span className={`text-xl ${task.isDone ? "text-ink/50 line-through" : ""}`}>
          {task.title}
        </span>
      </label>
      <span className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 pl-10 text-base text-ink/70 sm:col-start-2 sm:row-start-1 sm:pl-0">
        {task.itemName && (
          <>
            <CategoryIcon value={category?.emoji} />
            <span className="truncate">
              {[isIconName(category?.emoji) ? null : category?.emoji, task.itemName].filter(Boolean).join(" ")}
            </span>
          </>
        )}
      </span>
      <span
        className={`text-right text-base ${isOverdue(task) ? "text-coral" : ""}`}
      >
        {due}
      </span>
    </li>
  );
}

function TaskSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mb-6 last:mb-0">
      <h2
        id={headingId}
        className="mb-1 inline-block -rotate-1 rounded-md border-2 border-ink bg-butter px-3 py-0.5 font-playful-display text-base uppercase tracking-wide text-ink"
      >
        {title}
      </h2>
      <ul>{children}</ul>
    </section>
  );
}

/** Every task of every item in one list, grouped by when it is due, filterable by category. */
export function ChecklistPage() {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();
  const planning = usePlanning(wedding?.id ?? null);
  const { categories, items, tasks, isLoading, hasLoadError } = planning;

  const [showing, setShowing] = useState<Showing>("toDo");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  // The top bar's Add Task lands here with ?add=task, so the form follows the address.
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdding = searchParams.get("add") === "task";
  const closeAdding = () => setSearchParams({}, { replace: true });
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const categoriesById = useMemo(() => new Map(categories.map((each) => [each.id, each])), [categories]);
  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return tasks.filter(
      (task) =>
        (categoryFilter === null || task.categoryId === categoryFilter) &&
        [task.title, task.itemName].some((text) => text?.toLowerCase().includes(needle)),
    );
  }, [tasks, term, categoryFilter]);
  const done = filtered.filter((task) => task.isDone);
  const toDoCount = filtered.length - done.length;

  const handleToggle = async (task: Task) => {
    setActionError(null);
    try {
      await planning.setTaskDone(task.id, !task.isDone);
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      category={task.categoryId === null ? undefined : categoriesById.get(task.categoryId)}
      onToggle={handleToggle}
    />
  );

  const listArea = () => {
    if (isLoading) {
      return <p className="font-playful text-xl text-ink/70">{t("checklist.loading")}</p>;
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
    if (showing === "done") {
      return done.length === 0 ? (
        <p className="font-playful text-xl text-ink/70">{t("checklist.empty")}</p>
      ) : (
        <ul>{done.map(row)}</ul>
      );
    }
    const groups = groupOpenTasks(filtered);
    if (groups.length === 0) {
      return <p className="font-playful text-xl text-ink/70">{t("checklist.empty")}</p>;
    }
    return groups.map((group) => (
      <TaskSection key={group.key} title={t(`checklist.group.${group.key}`)}>
        {group.tasks.map(row)}
      </TaskSection>
    ));
  };

  return (
    <>
      <PageHeader title={t("checklist.title")} subtitle={t("checklist.subtitle")} art="title-checklist.png">
        <button type="button" onClick={() => setSearchParams({ add: "task" })} className={primaryButton}>
          {t("checklist.add")}
        </button>
      </PageHeader>

      {isAdding && <AddTaskForm items={items} onAdd={planning.addTask} onClose={closeAdding} />}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("checklist.showLabel")} className="mr-4 flex gap-2">
          <button
            type="button"
            aria-pressed={showing === "toDo"}
            onClick={() => setShowing("toDo")}
            className={chip(showing === "toDo")}
          >
            {t("checklist.toDo", { count: toDoCount })}
          </button>
          <button
            type="button"
            aria-pressed={showing === "done"}
            onClick={() => setShowing("done")}
            className={chip(showing === "done")}
          >
            {t("checklist.done", { count: done.length })}
          </button>
        </div>
        <CategoryChips categories={categories} activeId={categoryFilter} onChange={setCategoryFilter} showAll={false} />
      </div>

      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}

      <div className={`${outlinedCard} p-4 sm:p-6`}>
        {listArea()}
      </div>
    </>
  );
}
