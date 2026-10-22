import { useState } from "react";
import type { FormEvent } from "react";

import type { Category, CategoryDraft } from "../../api/types";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { IconPicker } from "../../components/playful/IconPicker";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";

/** Soft colors that read well behind dark text, offered in turn as a new category's default. */
const palette = ["#624cab", "#7189ff", "#f39237", "#e56399", "#3fa796", "#c49b2e"];

interface CategoryFormDialogProps {
  /** The category to edit, or left out to create one. */
  category?: Category | null;
  /** How many categories exist, to start each new one on the next color. */
  existingCount: number;
  onSave: (draft: CategoryDraft) => Promise<void>;
  onClose: () => void;
}

/** The one drawer for a category: added inline from Items, or added and edited in the Category Manager. */
export function CategoryFormDialog({ category = null, existingCount, onSave, onClose }: CategoryFormDialogProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(category?.emoji ?? "");
  const [color, setColor] = useState(category?.color ?? palette[existingCount % palette.length]);
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
    <SidePanel title={t(category === null ? "categories.new" : "categories.edit")} sticker="🏷️" onClose={onClose}>
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
              <IconPicker label={t("categories.icon")} value={emoji} onChange={setEmoji} />
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
                className="h-12 w-16 cursor-pointer rounded-[18px] border-[2.5px] border-ink bg-cream-light p-1.5 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
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
            {t("planning.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
