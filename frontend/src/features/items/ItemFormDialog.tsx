import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Category, Item, ItemDraft, ItemStatus } from "../../api/types";
import { SearchableSelect } from "../../components/form/SearchableSelect";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { StyledSelect } from "../../components/form/StyledSelect";
import { fieldLabel, pillField, textArea } from "../../components/form/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { primaryButton, secondaryButton } from "../households/dialogStyles";
import { categoryLabel } from "../planning/CategoryChips";
import { itemStatuses } from "./itemStatus";

interface ItemFormDialogProps {
  /** The item being edited, or null to create one. */
  item: Item | null;
  categories: Category[];
  onSave: (draft: ItemDraft) => Promise<void>;
  onClose: () => void;
}

type Channel = "phone" | "instagramUrl" | "email" | "websiteUrl";

/** The ways to reach a vendor, the usual one first: it is the one a new item asks for. */
const channels: { name: Channel; labelKey: TranslationKey; type: string; icon: string }[] = [
  { name: "phone", labelKey: "items.phone", type: "tel", icon: "📱" },
  { name: "instagramUrl", labelKey: "items.instagram", type: "text", icon: "📷" },
  { name: "email", labelKey: "items.email", type: "email", icon: "✉️" },
  { name: "websiteUrl", labelKey: "items.website", type: "url", icon: "🌐" },
];

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());

/**
 * A vendor, place or anything else being decided on, in a panel beside the list.
 * It asks for one way to reach them and offers the rest on demand, so a new item
 * stays a short form.
 */
export function ItemFormDialog({ item, categories, onSave, onClose }: ItemFormDialogProps) {
  const { t } = useTranslation();
  const formId = useId();

  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId?.toString() ?? "");
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "idea");
  const [contactName, setContactName] = useState(item?.contactName ?? "");
  const [contacts, setContacts] = useState<Record<Channel, string>>({
    phone: item?.phone ?? "",
    instagramUrl: item?.instagramUrl ?? "",
    email: item?.email ?? "",
    websiteUrl: item?.websiteUrl ?? "",
  });
  // The ones already filled in, or just the phone for a new item.
  const [shown, setShown] = useState<Set<Channel>>(() => {
    const filled = channels.filter(({ name: channel }) => contacts[channel] !== "").map(({ name: channel }) => channel);
    return new Set(filled.length > 0 ? filled : ["phone"]);
  });
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const idFor = (fieldName: string) => `${formId}-${fieldName}`;
  const categoryOptions = [
    { value: "", label: t("planning.uncategorized") },
    ...categories.map((category) => ({ value: String(category.id), label: categoryLabel(category) })),
  ];

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
        contactName: blankToNull(contactName),
        phone: blankToNull(contacts.phone),
        email: blankToNull(contacts.email),
        instagramUrl: blankToNull(contacts.instagramUrl),
        websiteUrl: blankToNull(contacts.websiteUrl),
        notes: blankToNull(notes),
      });
    } catch {
      setError("planning.saveFailed");
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t(item === null ? "items.new" : "items.editTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor={idFor("name")} className={fieldLabel}>
              {t("items.name")}
            </label>
            <input id={idFor("name")} value={name} onChange={(e) => setName(e.target.value)} className={pillField} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label={t("items.category")}
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
            />
            <div>
              <label htmlFor={idFor("status")} className={fieldLabel}>
                {t("items.statusLabel")}
              </label>
              <StyledSelect id={idFor("status")} value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
                {itemStatuses.map((each) => (
                  <option key={each} value={each}>
                    {t(`items.status.${each}`)}
                  </option>
                ))}
              </StyledSelect>
            </div>
          </div>

          <fieldset className="flex flex-col gap-3 border-t border-outline-variant/50 pt-5">
            <legend className="mb-3 font-label-lg text-label-lg text-primary">{t("items.howToReach")}</legend>
            <div>
              <label htmlFor={idFor("contactName")} className={fieldLabel}>
                {t("items.contactName")}
              </label>
              <input
                id={idFor("contactName")}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={pillField}
              />
            </div>
            {channels
              .filter(({ name: channel }) => shown.has(channel))
              .map(({ name: channel, labelKey, type, icon }) => (
                <div key={channel}>
                  <label htmlFor={idFor(channel)} className={fieldLabel}>
                    {t(labelKey)}
                  </label>
                  <div className="relative">
                    <span aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2">
                      {icon}
                    </span>
                    <input
                      id={idFor(channel)}
                      type={type}
                      value={contacts[channel]}
                      onChange={(e) => setContacts((current) => ({ ...current, [channel]: e.target.value }))}
                      className={`${pillField} pl-12`}
                    />
                  </div>
                </div>
              ))}
            <div className="flex flex-wrap gap-2">
              {channels
                .filter(({ name: channel }) => !shown.has(channel))
                .map(({ name: channel, labelKey }) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setShown((current) => new Set(current).add(channel))}
                    className="rounded-full border border-dashed border-primary px-4 py-1.5 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
                  >
                    + {t(labelKey)}
                  </button>
                ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={idFor("notes")} className={fieldLabel}>
              {t("items.notes")}
            </label>
            <textarea id={idFor("notes")} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={textArea} />
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
