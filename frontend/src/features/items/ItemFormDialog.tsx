import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Category, Item, ItemDraft, ItemStatus } from "../../api/types";
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
import { categoryLabel } from "../planning/CategoryChips";
import { itemStatuses } from "./itemStatus";

interface ItemFormDialogProps {
  /** The item being edited, or null to create one. */
  item: Item | null;
  categories: Category[];
  onSave: (draft: ItemDraft) => Promise<void>;
  onClose: () => void;
}

type TextField = "contactName" | "phone" | "email" | "instagramUrl" | "websiteUrl";

const textFields: { name: TextField; labelKey: TranslationKey; type: string }[] = [
  { name: "contactName", labelKey: "items.contactName", type: "text" },
  { name: "phone", labelKey: "items.phone", type: "tel" },
  { name: "email", labelKey: "items.email", type: "email" },
  { name: "instagramUrl", labelKey: "items.instagram", type: "text" },
  { name: "websiteUrl", labelKey: "items.website", type: "url" },
];

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());

/** A vendor, place or anything else being decided on, with how to reach them. */
export function ItemFormDialog({ item, categories, onSave, onClose }: ItemFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  useCloseOnEscape(onClose);

  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId?.toString() ?? "");
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "idea");
  const [texts, setTexts] = useState<Record<TextField, string>>({
    contactName: item?.contactName ?? "",
    phone: item?.phone ?? "",
    email: item?.email ?? "",
    instagramUrl: item?.instagramUrl ?? "",
    websiteUrl: item?.websiteUrl ?? "",
  });
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const idFor = (fieldName: string) => `${formId}-${fieldName}`;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("planning.nameRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    const pickedCategoryId = categoryId === "" ? null : Number(categoryId);
    try {
      await onSave({
        name: name.trim(),
        categoryId: pickedCategoryId,
        // A subcategory only stays while its category does.
        subcategoryId: item !== null && item.categoryId === pickedCategoryId ? item.subcategoryId : null,
        status,
        contactName: blankToNull(texts.contactName),
        phone: blankToNull(texts.phone),
        email: blankToNull(texts.email),
        instagramUrl: blankToNull(texts.instagramUrl),
        websiteUrl: blankToNull(texts.websiteUrl),
        notes: blankToNull(notes),
      });
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  return (
    <div className={backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={idFor("title")} className={panel}>
        <h2 id={idFor("title")} className={dialogTitle}>
          {t(item === null ? "items.new" : "items.editTitle")}
        </h2>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor={idFor("name")} className={fieldLabel}>
              {t("items.name")}
            </label>
            <input id={idFor("name")} value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-40 flex-1">
              <label htmlFor={idFor("category")} className={fieldLabel}>
                {t("items.category")}
              </label>
              <select
                id={idFor("category")}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
              >
                <option value="">{t("planning.uncategorized")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-40 flex-1">
              <label htmlFor={idFor("status")} className={fieldLabel}>
                {t("items.statusLabel")}
              </label>
              <select
                id={idFor("status")}
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className={field}
              >
                {itemStatuses.map((each) => (
                  <option key={each} value={each}>
                    {t(`items.status.${each}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {textFields.map(({ name: fieldName, labelKey, type }) => (
            <div key={fieldName}>
              <label htmlFor={idFor(fieldName)} className={fieldLabel}>
                {t(labelKey)}
              </label>
              <input
                id={idFor(fieldName)}
                type={type}
                value={texts[fieldName]}
                onChange={(e) => setTexts((current) => ({ ...current, [fieldName]: e.target.value }))}
                className={field}
              />
            </div>
          ))}
          <div>
            <label htmlFor={idFor("notes")} className={fieldLabel}>
              {t("items.notes")}
            </label>
            <textarea
              id={idFor("notes")}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={field}
            />
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
