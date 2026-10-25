import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import type { Category, Task } from "../../api/types";
import { LoadProblems } from "../../components/feedback/LoadProblems";
import { failedTo, hasFailed } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { isIconName } from "../../components/playful/iconCatalog";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { outlinedCard } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { TaskForm } from "../planning/TaskForm";
import { CategoryChips, chip } from "../planning/CategoryChips";
import { formatDueDate, formatDueTime, groupOpenTasks, isOverdue } from "../planning/schedule";
import { usePlanning } from "../planning/usePlanning";

type Showing = "toDo" | "done";

interface TaskRowProps {
  task: Task;
  category: Category | undefined;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
}

function TaskRow({ task, category, onToggle, onEdit }: TaskRowProps) {
  const { t, language } = useTranslation();
  const due = task.dueDate
    ? [formatDueDate(task.dueDate, language), task.dueTime && formatDueTime(task.dueTime)].filter(Boolean).join(" · ")
    : "–";

  return (
    <li className="group grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 border-b-2 border-ink/10 py-3 font-playful text-ink last:border-b-0 sm:grid-cols-[1fr_14rem_8rem_auto]">
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
      <button
        type="button"
        aria-label={t("tasks.edit", { title: task.title })}
        onClick={() => onEdit(task)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-accent/40 hover:text-ink"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          edit
        </span>
      </button>
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
  const { categories, items, tasks, isLoading, loadFailures } = planning;

  const [showing, setShowing] = useState<Showing>("toDo");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  // The top bar's Add Task lands here with ?add=task, so the form follows the address.
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdding = searchParams.get("add") === "task";
  const closeAdding = () => setSearchParams({}, { replace: true });
  const [actionError, setActionError] = useState<Problem | null>(null);
  const problemText = useProblemText();
  const [editing, setEditing] = useState<Task | null>(null);

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
    } catch (failure) {
      setActionError(failedTo("errors.save", failure));
    }
  };

  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      category={task.categoryId === null ? undefined : categoriesById.get(task.categoryId)}
      onToggle={handleToggle}
      onEdit={setEditing}
    />
  );

  const listArea = () => {
    if (isLoading) {
      return <p className="font-playful text-xl text-ink/70">{t("checklist.loading")}</p>;
    }
    if (hasFailed(loadFailures, "errors.part.tasks")) return null;
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
        <HeaderAction icon="add" label={t("checklist.add")} onClick={() => setSearchParams({ add: "task" })} />
      </PageHeader>

      {isAdding && (
        <TaskForm items={items} onSave={(draft) => planning.addTask(draft)} onClose={closeAdding} />
      )}
      {editing !== null && (
        <TaskForm
          task={editing}
          items={items}
          onSave={(draft) => planning.editTask(editing.id, draft)}
          onDelete={() => {
            if (!window.confirm(t("tasks.deleteConfirm", { title: editing.title }))) return;
            setEditing(null);
            void planning
              .removeTask(editing.id)
              .catch((failure: unknown) => setActionError(failedTo("errors.delete", failure)));
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("checklist.showLabel")} className="flex gap-2 sm:mr-4">
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
          {problemText(actionError)}
        </p>
      )}

      <div className={`${outlinedCard} p-4 sm:p-6`}>
        {!isLoading && <LoadProblems failures={loadFailures} onRetry={planning.reload} />}
        {listArea()}
      </div>
    </>
  );
}
