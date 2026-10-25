import { useId, useState } from "react";
import type { ReactNode } from "react";

import type { Category, Item, ItemStatus, Task, TaskDraft } from "../../api/types";
import { Dropdown } from "../../components/form/Dropdown";
import { useTranslation } from "../../i18n/LanguageProvider";
import { CategoryIcon } from "../../components/playful/IconPicker";
import { outlinedCard } from "../../components/playful/styles";
import { TaskForm } from "../planning/TaskForm";
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
  onAddTask: (draft: TaskDraft) => Promise<Task>;
  onEditTask: (taskId: number, draft: TaskDraft) => Promise<Task>;
  /** A task form closed: its papers and files may have changed. */
  onTaskFormClosed?: () => void;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  /** More sections under the tasks: the item's papers and files. */
  children?: ReactNode;
}

/** "https://instagram.com/luzdeagua" (or "@luzdeagua") as "@luzdeagua", linking to the profile. */
export function instagramHandle(value: string): { handle: string; href: string } {
  const name = value.startsWith("http") ? (new URL(value).pathname.split("/").find(Boolean) ?? value) : value;
  const bare = name.replace(/^@/, "");
  return { handle: `@${bare}`, href: value.startsWith("http") ? value : `https://instagram.com/${bare}` };
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b-2 border-ink/10 py-3 last:border-b-0">
      <dt className="text-base text-ink/70">{label}</dt>
      <dd className="text-lg text-ink">{children}</dd>
    </div>
  );
}

const linkStyle = "text-lg text-sky-deep underline-offset-4 hover:underline";

/** Everything about one item: how to reach them, where things stand, and what's left to do. */
export function ItemDetail({
  item,
  category,
  tasks,
  onChangeStatus,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onTaskFormClosed,
  onToggleTask,
  onDeleteTask,
  children,
}: ItemDetailProps) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Done tasks sink to the bottom, the rest keep the API's soonest-first order.
  const ordered = [...tasks.filter((task) => !task.isDone), ...tasks.filter((task) => task.isDone)];
  const next = item.nextTask;
  const instagram = item.instagramUrl ? instagramHandle(item.instagramUrl) : null;

  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col gap-6 ${outlinedCard} p-8 font-playful text-ink`}
    >
      <header className="flex flex-col items-start gap-2">
        {category && (
          <span
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-3 py-0.5 text-base"
            style={{ backgroundColor: `${category.color}33` }}
          >
            <CategoryIcon value={category.emoji} />
            {categoryLabel(category)}
          </span>
        )}
        <h2 id={titleId} className="font-playful-display text-[32px] leading-tight text-ink">
          {item.name}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            hideLabel
            label={t("items.statusLabel")}
            value={item.status}
            options={itemStatuses.map((status) => ({ value: status, label: t(`items.status.${status}`) }))}
            onChange={(status) => onChangeStatus(status as ItemStatus)}
            triggerClassName={`${statusPill(item.status)} cursor-pointer border-0 pr-3`}
          />
          <button type="button" onClick={onEdit} className={linkStyle}>
            {t("planning.edit")}
          </button>
          <button type="button" onClick={onDelete} className="text-lg text-coral underline-offset-4 hover:underline">
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
        <h3 className="font-playful-display text-xl uppercase tracking-wide">{t("tasks.heading")}</h3>
        {ordered.length === 0 && !isAdding && (
          <p className="text-lg text-ink/70">{t("tasks.none")}</p>
        )}
        <ul className="flex flex-col">
          {ordered.map((task) => (
            <li key={task.id} className="group flex items-center gap-3 py-2">
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.isDone}
                  onChange={() => onToggleTask(task)}
                  className="h-6 w-6 cursor-pointer rounded-md border-[2.5px] border-ink bg-cream-light text-sky focus:ring-sky"
                />
                <span className={`text-lg ${task.isDone ? "text-ink/50 line-through" : ""}`}>
                  {task.title}
                </span>
              </label>
              {task.dueDate && !task.isDone && (
                <span
                  className={`text-base ${isOverdue(task) ? "text-coral" : "text-ink/70"}`}
                >
                  {formatDueDate(task.dueDate, language)}
                  {task.dueTime && ` · ${formatDueTime(task.dueTime)}`}
                </span>
              )}
              <button
                type="button"
                aria-label={t("tasks.edit", { title: task.title })}
                onClick={() => setEditing(task)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-accent/40 hover:text-ink"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  edit
                </span>
              </button>
              <button
                type="button"
                aria-label={t("tasks.delete", { title: task.title })}
                onClick={() => onDeleteTask(task)}
                className="px-1 text-xl text-ink opacity-40 transition-opacity hover:text-coral hover:opacity-100 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {isAdding ? (
          <TaskForm
            itemId={item.id}
            onSave={(draft) => onAddTask(draft)}
            onClose={() => {
              setIsAdding(false);
              onTaskFormClosed?.();
            }}
          />
        ) : (
          <button type="button" onClick={() => setIsAdding(true)} className={`${linkStyle} self-start`}>
            {t("tasks.addOpen")}
          </button>
        )}
      </div>

      {editing !== null && (
        <TaskForm
          task={editing}
          itemId={item.id}
          onSave={(draft) => onEditTask(editing.id, draft)}
          onDelete={() => {
            if (!window.confirm(t("tasks.deleteConfirm", { title: editing.title }))) return;
            setEditing(null);
            onDeleteTask(editing);
          }}
          onClose={() => {
            setEditing(null);
            onTaskFormClosed?.();
          }}
        />
      )}

      {children}

      {item.notes && (
        <p className="whitespace-pre-line rounded-[20px] border-2 border-dashed border-ink/40 bg-butter/40 p-4 text-lg text-ink">
          {item.notes}
        </p>
      )}
    </section>
  );
}
