import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { CalendarEvent, CalendarEventDraft, Item } from "../../api/types";
import { DatePicker } from "../../components/form/DatePicker";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField, textArea } from "../../components/form/styles";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";

interface CalendarEventFormProps {
  /** The event being edited, or null to add one. */
  event: CalendarEvent | null;
  /** A new event's first day: the day it was added from, if any. */
  startDate?: string | null;
  items: Item[];
  onSave: (draft: CalendarEventDraft) => Promise<void>;
  /** Offered only while editing. */
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * An event in the side drawer like every other form: one day, or a range when
 * it has an end. Picking its item is enough to name it.
 */
export function CalendarEventForm({ event, startDate = null, items, onSave, onDelete, onClose }: CalendarEventFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const idFor = (name: string) => `${formId}-${name}`;

  const [title, setTitle] = useState(event?.title ?? "");
  const [itemId, setItemId] = useState(event?.itemId?.toString() ?? "");
  const [start, setStart] = useState(event?.startDate ?? startDate);
  const [end, setEnd] = useState(event?.endDate ?? null);
  const [time, setTime] = useState(event?.startTime?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (submitted: FormEvent) => {
    submitted.preventDefault();
    const pickedItem = items.find((item) => String(item.id) === itemId) ?? null;
    const name = title.trim() || pickedItem?.name || "";
    if (name === "") {
      setError("planning.nameRequired");
      return;
    }
    if (start === null) {
      setError("calendar.startRequired");
      return;
    }
    if (end !== null && end < start) {
      setError("calendar.endBeforeStart");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        title: name,
        startDate: start,
        // A range that ends the day it starts is just that day.
        endDate: end === start ? null : end,
        startTime: time === "" ? null : time,
        itemId: pickedItem?.id ?? null,
        notes: notes.trim() === "" ? null : notes.trim(),
      });
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t(event === null ? "calendar.new" : "calendar.editTitle")} sticker="🗓️" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor={idFor("title")} className={fieldLabel}>
              {t("calendar.eventTitle")}
            </label>
            <input
              id={idFor("title")}
              value={title}
              placeholder={t("calendar.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
              className={pillField}
              autoFocus
            />
          </div>
          <div>
            <Dropdown
              searchable
              label={t("calendar.item")}
              value={itemId}
              options={[
                { value: "", label: t("calendar.noItem") },
                ...items.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              onChange={setItemId}
            />
            <p className="mt-1.5 text-base text-ink/70">{t("calendar.itemHint")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-44 flex-1">
              <DatePicker label={t("calendar.starts")} value={start} onChange={setStart} />
            </div>
            <div>
              <label htmlFor={idFor("time")} className={fieldLabel}>
                {t("calendar.time")}
              </label>
              <input
                id={idFor("time")}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={pillField}
              />
            </div>
          </div>
          <div>
            <DatePicker label={t("calendar.ends")} value={end} onChange={setEnd} />
            <p className="mt-1.5 text-base text-ink/70">{t("calendar.endsHint")}</p>
          </div>
          <div>
            <label htmlFor={idFor("notes")} className={fieldLabel}>
              {t("calendar.notes")}
            </label>
            <textarea
              id={idFor("notes")}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={textArea}
            />
          </div>
          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          {onDelete !== undefined && (
            <button type="button" onClick={onDelete} className="mr-auto text-lg text-coral underline-offset-4 hover:underline">
              {t("planning.delete")}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("planning.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t("planning.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
