import { useId, useState } from "react";
import type { ReactNode } from "react";

import type { Category, Item, ItemStatus, Task, TaskDraft } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { AddTaskForm } from "../planning/AddTaskForm";
import { categoryLabel } from "../planning/CategoryChips";
import { formatDueDate, formatDueTime, isOverdue } from "../planning/schedule";
import { itemStatuses, statusPill } from "./itemStatus";

interface ItemDetailProps {
  item: Item;
  category: Category | null;
  /** This item's tasks, soonest first. */
  tasks: Task[];
  onChangeStatus: (status: ItemStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: (draft: TaskDraft) => Promise<void>;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

/** "https://instagram.com/luzdeagua" (or "@luzdeagua") as "@luzdeagua", linking to the profile. */
export function instagramHandle(value: string): { handle: string; href: string } {
  const name = value.startsWith("http") ? (new URL(value).pathname.split("/").find(Boolean) ?? value) : value;
  const bare = name.replace(/^@/, "");
  return { handle: `@${bare}`, href: value.startsWith("http") ? value : `https://instagram.com/${bare}` };
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-surface-variant py-3 last:border-b-0">
      <dt className="font-body-sm text-body-sm text-on-surface-variant">{label}</dt>
      <dd className="font-body-sm text-body-sm text-on-surface">{children}</dd>
    </div>
  );
}

const linkStyle = "font-label-md text-label-md text-primary hover:underline";

/** Everything about one item: how to reach them, where things stand, and what's left to do. */
export function ItemDetail({
  item,
  category,
  tasks,
  onChangeStatus,
  onEdit,
  onDelete,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: ItemDetailProps) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const statusId = useId();
  const [isAdding, setIsAdding] = useState(false);

  // Done tasks sink to the bottom, the rest keep the API's soonest-first order.
  const ordered = [...tasks.filter((task) => !task.isDone), ...tasks.filter((task) => task.isDone)];
  const next = item.nextTask;
  const instagram = item.instagramUrl ? instagramHandle(item.instagramUrl) : null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-6 rounded-[40px_20px_30px_10px] bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
    >
      <header className="flex flex-col items-start gap-2">
        {category && (
          <span
            className="rounded-full px-3 py-0.5 font-label-md text-[11px] uppercase tracking-wide text-on-surface"
            style={{ backgroundColor: `${category.color}26` }}
          >
            {categoryLabel(category)}
          </span>
        )}
        <h2 id={titleId} className="font-headline-md text-headline-md text-on-surface">
          {item.name}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={statusId} className="sr-only">
            {t("items.statusLabel")}
          </label>
          <select
            id={statusId}
            value={item.status}
            onChange={(e) => onChangeStatus(e.target.value as ItemStatus)}
            className={`${statusPill(item.status)} cursor-pointer border-0 pr-8`}
          >
            {itemStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`items.status.${status}`)}
              </option>
            ))}
          </select>
          <button type="button" onClick={onEdit} className={linkStyle}>
            {t("planning.edit")}
          </button>
          <button type="button" onClick={onDelete} className="font-label-md text-label-md text-error hover:underline">
            {t("planning.delete")}
          </button>
        </div>
      </header>

      <dl>
        {item.contactName && <Fact label={t("items.contactName")}>{item.contactName}</Fact>}
        {item.phone && <Fact label={t("items.phone")}>{item.phone}</Fact>}
        {item.email && (
          <Fact label={t("items.email")}>
            <a href={`mailto:${item.email}`} className={linkStyle}>
              {item.email}
            </a>
          </Fact>
        )}
        {instagram && (
          <Fact label={t("items.instagram")}>
            <a href={instagram.href} target="_blank" rel="noreferrer" className={linkStyle}>
              {instagram.handle} ↗
            </a>
          </Fact>
        )}
        {item.websiteUrl && (
          <Fact label={t("items.website")}>
            <a href={item.websiteUrl} target="_blank" rel="noreferrer" className={`${linkStyle} break-all`}>
              {item.websiteUrl} ↗
            </a>
          </Fact>
        )}
        {next && (
          <Fact label={t("items.nextDate")}>
            {[formatDueDate(next.dueDate, language), next.dueTime && formatDueTime(next.dueTime)]
              .filter(Boolean)
              .join(", ")}
            {` · ${next.title}`}
          </Fact>
        )}
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="font-label-lg text-label-lg text-primary">☑ {t("tasks.heading")}</h3>
        {ordered.length === 0 && !isAdding && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">{t("tasks.none")}</p>
        )}
        <ul className="flex flex-col">
          {ordered.map((task) => (
            <li key={task.id} className="group flex items-center gap-3 py-2">
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.isDone}
                  onChange={() => onToggleTask(task)}
                  className="h-5 w-5 cursor-pointer accent-primary"
                />
                <span
                  className={`font-body-sm text-body-sm ${
                    task.isDone ? "text-on-surface-variant line-through" : "text-on-surface"
                  }`}
                >
                  {task.title}
                </span>
              </label>
              {task.dueDate && !task.isDone && (
                <span
                  className={`font-label-md text-label-md ${
                    isOverdue(task) ? "text-error" : "text-on-surface-variant"
                  }`}
                >
                  {formatDueDate(task.dueDate, language)}
                  {task.dueTime && ` · ${formatDueTime(task.dueTime)}`}
                </span>
              )}
              <button
                type="button"
                aria-label={t("tasks.delete", { title: task.title })}
                onClick={() => onDeleteTask(task)}
                className="px-1 text-on-surface-variant opacity-40 transition-opacity hover:text-error hover:opacity-100 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {isAdding ? (
          <AddTaskForm itemId={item.id} onAdd={onAddTask} onClose={() => setIsAdding(false)} />
        ) : (
          <button type="button" onClick={() => setIsAdding(true)} className={`${linkStyle} self-start`}>
            {t("tasks.addOpen")}
          </button>
        )}
      </div>

      {item.notes && (
        <p className="whitespace-pre-line rounded-2xl bg-surface-container-low p-4 font-body-sm text-body-sm italic text-on-surface-variant">
          {item.notes}
        </p>
      )}
    </section>
  );
}
