import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Category, Item, ItemDraft, ItemStatus } from "../../api/types";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField, textArea } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { useTranslation } from "../../i18n/LanguageProvider";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { categoryLabel, iconChip } from "../planning/CategoryChips";
import { PrivacySwitch } from "../planning/Privacy";
import { ContactIcon, contactLabelKey } from "./ContactIcon";
import { contactChannels } from "./contactLinks";
import type { ContactChannel } from "./contactLinks";
import { itemStatuses } from "./itemStatus";

interface ItemFormDialogProps {
  /** The item being edited, or null to create one. */
  item: Item | null;
  categories: Category[];
  onSave: (draft: ItemDraft) => Promise<void>;
  onClose: () => void;
}

type Channel = ContactChannel;

/** The input type for each way to reach a vendor. */
const inputType: Record<Channel, string> = {
  phone: "tel",
  instagramUrl: "text",
  email: "email",
  websiteUrl: "url",
};

interface ContactRow {
  channel: Channel;
  value: string;
}

const defaultChannelKey = "la-bodita.contactType";

/** The way the last new item was first reached, so the next one starts there. */
function rememberedChannel(): Channel {
  try {
    const saved = localStorage.getItem(defaultChannelKey);
    return contactChannels.some((channel) => channel === saved) ? (saved as Channel) : "phone";
  } catch {
    return "phone";
  }
}

function rememberChannel(channel: Channel): void {
  try {
    localStorage.setItem(defaultChannelKey, channel);
  } catch {
    // Private windows refuse storage; the default just stays WhatsApp.
  }
}

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());

/**
 * A vendor, place or anything else being decided on, in a panel beside the list.
 * The ways to reach them are a row of icons: each one pressed opens its field,
 * so a new item stays a short form.
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
    const filled = contactChannels
      .map((channel) => ({ channel, value: item?.[channel] ?? "" }))
      .filter((row) => row.value !== "");
    return filled.length > 0 ? filled : [{ channel: rememberedChannel(), value: "" }];
  });
  const isPicked = (channel: Channel) => contacts.some((row) => row.channel === channel);
  const toggleChannel = (channel: Channel) =>
    setContacts((current) =>
      current.some((row) => row.channel === channel)
        ? current.filter((row) => row.channel !== channel)
        : [...current, { channel, value: "" }],
    );
  const changeContact = (channel: Channel, value: string) =>
    setContacts((current) => current.map((row) => (row.channel === channel ? { ...row, value } : row)));
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(item?.isPrivate ?? false);
  const [error, setError] = useState<Problem | null>(null);
  const problemText = useProblemText();
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
    if (item === null && contacts.length > 0) rememberChannel(contacts[0].channel);
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
        isPrivate,
      });
    } catch (failure) {
      setError(failedTo("errors.save", failure));
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t(item === null ? "items.new" : "items.editTitle")} icon={screenIcons.items} onClose={onClose}>
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
            <div role="group" aria-label={t("items.contactType")} className="flex flex-wrap gap-2">
              {contactChannels.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={isPicked(channel)}
                  title={t(contactLabelKey[channel])}
                  onClick={() => toggleChannel(channel)}
                  className={iconChip(isPicked(channel))}
                >
                  <ContactIcon channel={channel} />
                  <span className="sr-only">{t(contactLabelKey[channel])}</span>
                </button>
              ))}
            </div>
            {contacts.map((row) => (
              <div key={row.channel} className="flex items-center gap-3">
                <ContactIcon channel={row.channel} size="sm" />
                <input
                  aria-label={t(contactLabelKey[row.channel])}
                  type={inputType[row.channel]}
                  value={row.value}
                  onChange={(e) => changeContact(row.channel, e.target.value)}
                  className={`${pillField} min-w-0 flex-1`}
                />
              </div>
            ))}
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
          <PrivacySwitch
            isPrivate={isPrivate}
            canChange={item?.isMine ?? true}
            hiddenHintKey="privacy.itemHidden"
            hiddenByCategory={categories.some((category) => String(category.id) === categoryId && category.isPrivate)}
            onChange={setIsPrivate}
          />
          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {problemText(error)}
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
