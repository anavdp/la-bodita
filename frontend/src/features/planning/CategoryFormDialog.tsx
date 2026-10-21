import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { CategoryDraft } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import {
  backdrop,
  dialogTitle,
  field,
  fieldLabel,
  panel,
  primaryButton,
  secondaryButton,
  useCloseOnEscape,
} from "../households/dialogStyles";

/** Soft colors that read well behind dark text, offered in turn as a new category's default. */
const palette = ["#624cab", "#7189ff", "#f39237", "#e56399", "#3fa796", "#c49b2e"];

interface CategoryFormDialogProps {
  /** How many categories exist, to start each new one on the next color. */
  existingCount: number;
  onSave: (draft: CategoryDraft) => Promise<void>;
  onClose: () => void;
}

/** A quick way to add a tag while filling in items; the Category Manager will do the rest. */
export function CategoryFormDialog({ existingCount, onSave, onClose }: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  useCloseOnEscape(onClose);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState(palette[existingCount % palette.length]);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("planning.nameRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), emoji: emoji.trim() || null, color });
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  return (
    <div className={backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`${panel} max-w-sm`}>
        <h2 id={titleId} className={dialogTitle}>
          {t("categories.new")}
        </h2>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="category-name" className={fieldLabel}>
              {t("categories.name")}
            </label>
            <input id="category-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="category-emoji" className={fieldLabel}>
                {t("categories.emoji")}
              </label>
              <input
                id="category-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="category-color" className={fieldLabel}>
                {t("categories.color")}
              </label>
              <input
                id="category-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value.toLowerCase())}
                className="h-12 w-16 cursor-pointer rounded-lg border border-outline-variant bg-surface-container-low"
              />
            </div>
          </div>
          {error !== null && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {t(error)}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className={secondaryButton}>
              {t("planning.cancel")}
            </button>
            <button type="submit" disabled={isSaving} className={primaryButton}>
              {t("planning.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
