import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Category, Item, ItemDraft, ItemStatus } from "../../api/types";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField, textArea } from "../../components/form/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
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
const channels: { name: Channel; labelKey: TranslationKey; type: string }[] = [
  { name: "phone", labelKey: "items.phone", type: "tel" },
  { name: "instagramUrl", labelKey: "items.instagram", type: "text" },
  { name: "email", labelKey: "items.email", type: "email" },
  { name: "websiteUrl", labelKey: "items.website", type: "url" },
];

interface ContactRow {
  channel: Channel;
  value: string;
}

const defaultChannelKey = "la-bodita.contactType";

/** The type picked for the last new item's first contact, so the next one starts there. */
function rememberedChannel(): Channel {
  try {
    const saved = localStorage.getItem(defaultChannelKey);
    return channels.some(({ name }) => name === saved) ? (saved as Channel) : "phone";
  } catch {
    return "phone";
  }
}

function rememberChannel(channel: Channel): void {
  try {
    localStorage.setItem(defaultChannelKey, channel);
  } catch {
    // Private windows refuse storage; the default just stays the phone.
  }
}

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
  // The ones already filled in, or one empty contact of the type picked last time.
  const [contacts, setContacts] = useState<ContactRow[]>(() => {
    const filled = channels
      .map(({ name: channel }) => ({ channel, value: item?.[channel] ?? "" }))
      .filter((row) => row.value !== "");
    return filled.length > 0 ? filled : [{ channel: rememberedChannel(), value: "" }];
  });
  const unused = channels.filter(({ name: channel }) => !contacts.some((row) => row.channel === channel));

  const changeContact = (index: number, change: Partial<ContactRow>) => {
    if (change.channel && item === null && index === 0) rememberChannel(change.channel);
    setContacts((current) => current.map((row, at) => (at === index ? { ...row, ...change } : row)));
  };
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const idFor = (fieldName: string) => `${formId}-${fieldName}`;
  const categoryOptions = [
    { value: "", label: t("planning.uncategorized") },
    ...categories.map((category) => ({
      value: String(category.id),
      label: categoryLabel(category),
    })),
  ];

  const contactValue = (channel: Channel) => blankToNull(contacts.find((row) => row.channel === channel)?.value ?? "");

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
        phone: contactValue("phone"),
        email: contactValue("email"),
        instagramUrl: contactValue("instagramUrl"),
        websiteUrl: contactValue("websiteUrl"),
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
            <Dropdown
              searchable
              label={t("items.category")}
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
            />
            <Dropdown
              label={t("items.statusLabel")}
              value={status}
              options={itemStatuses.map((each) => ({
                value: each,
                label: t(`items.status.${each}`),
              }))}
              onChange={(next) => setStatus(next as ItemStatus)}
            />
          </div>

          <fieldset className="flex flex-col gap-3 border-t-2 border-ink/15 pt-5">
            <legend className="mb-3 font-playful-display text-xl uppercase tracking-wide text-ink">{t("items.howToReach")}</legend>
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
            {contacts.map((row, index) => {
              const own = channels.find(({ name }) => name === row.channel)!;
              return (
                <div key={row.channel} className="flex items-center gap-2">
                  <div className="w-52 shrink-0">
                    <Dropdown
                      hideLabel
                      label={t("items.contactType")}
                      value={row.channel}
                      options={[own, ...unused].map(({ name, labelKey }) => ({
                        value: name,
                        label: t(labelKey),
                      }))}
                      onChange={(next) => changeContact(index, { channel: next as Channel })}
                    />
                  </div>
                  <input
                    aria-label={t(own.labelKey)}
                    type={own.type}
                    value={row.value}
                    onChange={(e) => changeContact(index, { value: e.target.value })}
                    className={`${pillField} min-w-0 flex-1`}
                  />
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      aria-label={t("items.removeContact", {
                        label: t(own.labelKey),
                      })}
                      onClick={() => setContacts((current) => current.filter((_, at) => at !== index))}
                      className="h-10 w-10 rounded-full text-xl text-ink/70 transition-colors hover:bg-coral-soft hover:text-ink"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            {unused.length > 0 && (
              <button
                type="button"
                onClick={() => setContacts((current) => [...current, { channel: unused[0].name, value: "" }])}
                className="self-start rounded-full border-[2.5px] border-dashed border-ink px-4 py-1.5 text-lg text-ink transition-colors hover:bg-accent/40"
              >
                {t("items.addContact")}
              </button>
            )}
          </fieldset>

          <div>
            <label htmlFor={idFor("notes")} className={fieldLabel}>
              {t("items.notes")}
            </label>
            <textarea
              id={idFor("notes")}
              rows={4}
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
