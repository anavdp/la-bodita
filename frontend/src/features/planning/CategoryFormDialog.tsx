import { useState } from "react";
import type { FormEvent } from "react";

import type { CategoryDraft } from "../../api/types";
import { EmojiPicker } from "../../components/form/EmojiPicker";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { primaryButton, secondaryButton } from "../households/dialogStyles";

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
    <SidePanel title={t("categories.new")} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor="category-name" className={fieldLabel}>
              {t("categories.name")}
            </label>
            <input id="category-name" value={name} onChange={(e) => setName(e.target.value)} className={pillField} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <EmojiPicker label={t("categories.emoji")} value={emoji} onChange={setEmoji} />
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
                className="h-12 w-16 cursor-pointer rounded-full border-0 bg-surface-container-low p-1.5 dark:bg-surface-container-highest [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
              />
            </div>
          </div>
          {error !== null && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
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
