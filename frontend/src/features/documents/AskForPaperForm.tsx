import { useId, useState } from "react";
import type { FormEvent } from "react";

import type { Item, PaperRequestDraft, Person } from "../../api/types";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useItemTasks } from "./useItemTasks";

interface AskForPaperFormProps {
  weddingId: number;
  items: Item[];
  people: Person[];
  /** Asked from an item's own detail: that item, with no picking. */
  item?: Item;
  onSave: (draft: PaperRequestDraft) => Promise<void>;
  onClose: () => void;
}

/** "The church wants baptism certificates": a paper an item needs, so it shows as missing until it is uploaded. */
export function AskForPaperForm({ weddingId, items, people, item, onSave, onClose }: AskForPaperFormProps) {
  const { t } = useTranslation();
  const formId = useId();

  const [name, setName] = useState("");
  const [itemId, setItemId] = useState(item ? String(item.id) : "");
  const [requirementId, setRequirementId] = useState("");
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState<Problem | null>(null);
  const problemText = useProblemText();
  const [isSaving, setIsSaving] = useState(false);

  const tasks = useItemTasks(weddingId, itemId === "" ? null : Number(itemId));
  const asId = (value: string) => (value === "" ? null : Number(value));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("documents.ask.nameRequired");
      return;
    }
    if (itemId === "") {
      setError("documents.ask.itemRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        itemId: Number(itemId),
        requirementId: asId(requirementId),
        personId: asId(personId),
      });
    } catch (failure) {
      setError(failedTo("errors.save", failure));
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t("documents.ask.title")} sticker="📋" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor={`${formId}-name`} className={fieldLabel}>
              {t("documents.ask.name")}
            </label>
            <input
              id={`${formId}-name`}
              value={name}
              placeholder={t("documents.ask.namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
              className={pillField}
            />
          </div>
          {item === undefined && (
            <Dropdown
              searchable
              label={t("documents.form.item")}
              value={itemId}
              options={[
                { value: "", label: "—" },
                ...items.map((each) => ({ value: String(each.id), label: each.name })),
              ]}
              onChange={(value) => {
                setItemId(value);
                setRequirementId("");
              }}
            />
          )}
          {tasks.length > 0 && (
            <Dropdown
              label={t("documents.form.task")}
              value={requirementId}
              options={[
                { value: "", label: t("documents.form.noTask") },
                ...tasks.map((task) => ({ value: String(task.id), label: task.title })),
              ]}
              onChange={setRequirementId}
            />
          )}
          <div>
            <Dropdown
              label={t("documents.form.person")}
              value={personId}
              options={[
                { value: "", label: t("documents.both") },
                ...people.map((person) => ({ value: String(person.id), label: person.displayName })),
              ]}
              onChange={setPersonId}
            />
            <p className="mt-1.5 text-base text-ink/70">{t("documents.ask.whoseHint")}</p>
          </div>
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
