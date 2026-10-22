import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Item, TaskDraft } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { DatePicker } from "../../components/form/DatePicker";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { Dropdown } from "../../components/form/Dropdown";
import { fieldLabel, pillField } from "../../components/form/styles";
import { primaryButton, secondaryButton } from "../../components/playful/styles";

interface AddTaskFormProps {
  /** The item the task is for; omitted, the form offers a picker over `items`. */
  itemId?: number;
  items?: Item[];
  onAdd: (draft: TaskDraft) => Promise<void>;
  onClose: () => void;
}

/**
 * A task, or with a date and time an appointment, in the same side drawer as
 * every other form. The time only goes in once there is a date.
 */
export function AddTaskForm({ itemId, items = [], onAdd, onClose }: AddTaskFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [title, setTitle] = useState("");
  const [pickedItemId, setPickedItemId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") {
      setError("planning.nameRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        itemId: itemId ?? (pickedItemId === "" ? null : Number(pickedItemId)),
        dueDate: dueDate || null,
        dueTime: dueDate && dueTime ? dueTime : null,
      });
      onClose();
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  const idFor = (name: string) => `${formId}-${name}`;

  return (
    <SidePanel title={t("tasks.new")} sticker="📝" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor={idFor("title")} className={fieldLabel}>
              {t("tasks.title")}
            </label>
            <input
              id={idFor("title")}
              value={title}
              placeholder={t("tasks.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
              className={pillField}
              autoFocus
            />
          </div>
          {itemId === undefined && (
            <div>
              <Dropdown
                searchable
                label={t("tasks.item")}
                value={pickedItemId}
                options={[
                  { value: "", label: t("tasks.general") },
                  ...items.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  })),
                ]}
                onChange={setPickedItemId}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <div className="min-w-44 flex-1">
              <DatePicker label={t("tasks.date")} value={dueDate || null} onChange={(next) => setDueDate(next ?? "")} />
            </div>
            <div>
              <label htmlFor={idFor("time")} className={fieldLabel}>
                {t("tasks.time")}
              </label>
              <input
                id={idFor("time")}
                type="time"
                value={dueTime}
                disabled={dueDate === ""}
                onChange={(e) => setDueTime(e.target.value)}
                className={`${pillField} disabled:cursor-not-allowed disabled:opacity-50`}
              />
            </div>
          </div>
          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("planning.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t("tasks.add")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
