import { useEffect, useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { documentFileUrl } from "../../api/documents";
import type { DocumentChanges, DocumentKind, DocumentUpload, Item, Person, WeddingDocument } from "../../api/types";
import { DatePicker } from "../../components/form/DatePicker";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { compactButton, primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { uploadErrorKey } from "./uploadErrors";
import { useItemTasks } from "./useItemTasks";

/** Where an upload starts from: a missing paper's cell knows what it is, whose, and what it answers. */
export interface FilesPreset {
  kind?: DocumentKind;
  itemId?: number | null;
  requirementId?: number | null;
  personId?: number | null;
  title?: string;
  /** The requests the uploaded paper answers. */
  answers?: number[];
}

interface AddFilesFormProps {
  weddingId: number;
  items: Item[];
  people: Person[];
  /** The file being edited, or null to upload new ones. */
  document: WeddingDocument | null;
  preset?: FilesPreset;
  onUpload: (files: File[], details: DocumentUpload, answers: number[]) => Promise<void>;
  onSave: (changes: DocumentChanges) => Promise<void>;
  /** Offered only while editing. */
  onDelete?: () => void;
  onClose: () => void;
}

const accepted = "image/*,application/pdf";
const isPdf = (file: File) => file.type === "application/pdf";

/** A picked file before it goes up: a photo shows itself, a PDF its name. */
function PickedFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/") || typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <li className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-[2.5px] border-ink bg-accent/40 p-1 text-center">
      {preview !== null ? (
        <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">
            {isPdf(file) ? "description" : "image"}
          </span>
          <span className="w-full truncate text-xs">{file.name}</span>
        </>
      )}
      <button
        type="button"
        aria-label={t("documents.form.remove", { name: file.name })}
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-cream-light text-base leading-none"
      >
        ×
      </button>
    </li>
  );
}

/**
 * New files, or one file's details, in the side drawer like every other form.
 * Photos and PDFs go up together; whatever is picked here applies to each.
 */
export function AddFilesForm({
  weddingId,
  items,
  people,
  document,
  preset = {},
  onUpload,
  onSave,
  onDelete,
  onClose,
}: AddFilesFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEditing = document !== null;

  const [files, setFiles] = useState<File[]>([]);
  const [itemId, setItemId] = useState(String(document?.itemId ?? preset.itemId ?? ""));
  const [requirementId, setRequirementId] = useState(String(document?.requirementId ?? preset.requirementId ?? ""));
  const [kind, setKind] = useState<DocumentKind>(document?.kind ?? preset.kind ?? "photo");
  const [isKindChosen, setIsKindChosen] = useState(isEditing || preset.kind !== undefined);
  const [personId, setPersonId] = useState(String(document?.personId ?? preset.personId ?? ""));
  const [title, setTitle] = useState(document?.title ?? preset.title ?? "");
  const [expiresOn, setExpiresOn] = useState<string | null>(document?.expiresOn ?? null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tasks = useItemTasks(weddingId, itemId === "" ? null : Number(itemId));
  const pickedItem = items.find((item) => String(item.id) === itemId) ?? null;

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const next = [...files, ...Array.from(event.target.files ?? [])];
    // Let the same file be picked again after it was removed.
    event.target.value = "";
    setFiles(next);
    if (!isKindChosen) setKind(next.length > 0 && next.every(isPdf) ? "paper" : "photo");
  };

  const chooseItem = (value: string) => {
    setItemId(value);
    setRequirementId("");
  };

  const asId = (value: string) => (value === "" ? null : Number(value));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isEditing && files.length === 0) {
      setError("documents.form.noFiles");
      return;
    }
    const details = {
      title: title.trim() === "" ? (isEditing ? document.title : null) : title.trim(),
      kind,
      itemId: asId(itemId),
      requirementId: asId(requirementId),
      personId: kind === "paper" ? asId(personId) : null,
      expiresOn: kind === "paper" ? expiresOn : null,
    };
    setError(null);
    setIsSaving(true);
    try {
      if (isEditing) {
        await onSave({ ...details, title: details.title as string });
      } else {
        await onUpload(files, details, preset.answers ?? []);
      }
    } catch (failure) {
      setError(uploadErrorKey(failure));
      setIsSaving(false);
    }
  };

  const saveLabel = () => {
    if (isEditing || files.length === 0) return t("planning.save");
    return files.length === 1 ? t("documents.form.saveOne") : t("documents.form.saveMany", { count: files.length });
  };

  return (
    <SidePanel
      title={t(isEditing ? "documents.form.edit" : "documents.form.add")}
      icon={screenIcons.documents}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          {isEditing ? (
            <a
              href={documentFileUrl(weddingId, document.id)}
              target="_blank"
              rel="noreferrer"
              className="self-start text-lg text-sky-deep underline-offset-4 hover:underline"
            >
              {t("documents.form.openFile", { name: document.fileName })}
            </a>
          ) : (
            <div>
              <p className={fieldLabel}>
                {files.length === 0
                  ? t("documents.form.files")
                  : files.length === 1
                    ? t("documents.form.pickedOne")
                    : t("documents.form.pickedMany", { count: files.length })}
              </p>
              {files.length > 0 && (
                <ul className="mb-3 flex gap-3 overflow-x-auto pb-1 pt-1">
                  {files.map((file, index) => (
                    <PickedFile
                      key={`${file.name}-${index}`}
                      file={file}
                      onRemove={() => setFiles(files.filter((_, at) => at !== index))}
                    />
                  ))}
                </ul>
              )}
              <label className={`${compactButton} cursor-pointer focus-within:ring-4 focus-within:ring-sky/25`}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  add_photo_alternate
                </span>
                {t(files.length === 0 ? "documents.form.pick" : "documents.form.pickMore")}
                <input type="file" multiple accept={accepted} onChange={pick} className="sr-only" />
              </label>
            </div>
          )}

          <div>
            <Dropdown
              searchable
              label={t("documents.form.item")}
              value={itemId}
              options={[
                { value: "", label: t("documents.form.noItem") },
                ...items.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              onChange={chooseItem}
            />
            <p className="mt-1.5 text-base text-ink/70">{t("documents.form.itemHint")}</p>
          </div>

          {pickedItem !== null && (tasks.length > 0 || requirementId !== "") && (
            <Dropdown
              label={t("documents.form.task")}
              value={requirementId}
              options={[
                { value: "", label: t("documents.form.noTask") },
                ...tasks.map((task) => ({ value: String(task.id), label: task.title })),
                ...(requirementId !== "" && !tasks.some((task) => String(task.id) === requirementId)
                  ? [{ value: requirementId, label: document?.requirementTitle ?? requirementId }]
                  : []),
              ]}
              onChange={setRequirementId}
            />
          )}

          <div>
            <Dropdown
              label={t("documents.form.kind")}
              value={kind}
              options={[
                { value: "photo", label: t("documents.kind.photo") },
                { value: "paper", label: t("documents.kind.paper") },
              ]}
              onChange={(value) => {
                setKind(value as DocumentKind);
                setIsKindChosen(true);
              }}
            />
            <p className="mt-1.5 text-base text-ink/70">{t("documents.form.kindHint")}</p>
          </div>

          {kind === "paper" && (
            <Dropdown
              label={t("documents.form.person")}
              value={personId}
              options={[
                { value: "", label: t("documents.both") },
                ...people.map((person) => ({ value: String(person.id), label: person.displayName })),
              ]}
              onChange={setPersonId}
            />
          )}

          <div>
            <label htmlFor={`${formId}-title`} className={fieldLabel}>
              {t("documents.form.name")}
            </label>
            <input
              id={`${formId}-title`}
              value={title}
              placeholder={files[0]?.name.replace(/\.[^.]+$/, "")}
              onChange={(event) => setTitle(event.target.value)}
              className={pillField}
            />
          </div>

          {kind === "paper" && (
            <DatePicker label={t("documents.form.expires")} value={expiresOn} onChange={setExpiresOn} />
          )}

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
            {saveLabel()}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
