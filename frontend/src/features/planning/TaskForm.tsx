import { useCallback, useEffect, useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  createPaperRequest,
  deletePaperRequest,
  documentFileUrl,
  listDocuments,
  listPaperRequests,
  listPeople,
  updatePaperRequest,
  uploadDocument,
} from "../../api/documents";
import type { Item, PaperRequest, Person, Task, TaskDraft, WeddingDocument } from "../../api/types";
import { DatePicker } from "../../components/form/DatePicker";
import { Dropdown } from "../../components/form/Dropdown";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { compactButton, primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useWedding } from "../../wedding/WeddingProvider";
import { uploadErrorKey } from "../documents/uploadErrors";

interface TaskFormProps {
  /** The task being edited; omitted, the form adds one. */
  task?: Task | null;
  /** The item the task is for; omitted, the form offers a picker over `items`. */
  itemId?: number;
  items?: Item[];
  /** Saves the task (`taskId` null adds it) and answers with it as saved, so its papers and files can follow. */
  onSave: (draft: TaskDraft, taskId: number | null) => Promise<Task>;
  /** Offered only while editing. */
  onDelete?: () => void;
  onClose: () => void;
}

/** A paper to ask for once the task exists. */
interface PendingPaper {
  name: string;
  personId: number | null;
}

const accepted = "image/*,application/pdf";
const isPdf = (file: File) => file.type === "application/pdf";
const linkStyle = "text-lg text-sky-deep underline-offset-4 hover:underline";
const removeButton =
  "px-1 text-xl text-ink opacity-50 transition-opacity hover:text-coral hover:opacity-100";

/** The people a paper can be for, and an existing task's own papers and files. */
function useTaskPapers(weddingId: number | null, task: Task | null | undefined) {
  const [people, setPeople] = useState<Person[]>([]);
  const [requests, setRequests] = useState<PaperRequest[]>([]);
  const [documents, setDocuments] = useState<WeddingDocument[]>([]);
  const taskId = task?.id;
  const taskItemId = task?.itemId ?? undefined;

  const load = useCallback(async () => {
    if (weddingId === null) return;
    try {
      setPeople(await listPeople(weddingId));
      if (taskId === undefined) return;
      const [loadedRequests, loadedDocuments] = await Promise.all([
        taskItemId === undefined ? Promise.resolve([]) : listPaperRequests(weddingId, { itemId: taskItemId }),
        listDocuments(weddingId, { requirementId: taskId }),
      ]);
      setRequests(loadedRequests.filter((request) => request.requirementId === taskId));
      setDocuments(loadedDocuments);
    } catch {
      // Papers and files are extras here: the task itself can still be saved.
    }
  }, [weddingId, taskId, taskItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { people, requests, documents, reload: load };
}

/**
 * A task, or with a date and time an appointment, in the same side drawer as
 * every other form. It can bring its papers along ("bring your baptism
 * certificates") and keep the files it produced; editing shows both.
 */
export function TaskForm({ task = null, itemId, items = [], onSave, onDelete, onClose }: TaskFormProps) {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const weddingId = wedding?.id ?? null;
  const formId = useId();
  const idFor = (name: string) => `${formId}-${name}`;
  const isEditing = task !== null;

  const [title, setTitle] = useState(task?.title ?? "");
  const [pickedItemId, setPickedItemId] = useState(task?.itemId?.toString() ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task?.dueTime?.slice(0, 5) ?? "");
  const [paperName, setPaperName] = useState("");
  const [paperPersonId, setPaperPersonId] = useState("");
  const [pendingPapers, setPendingPapers] = useState<PendingPaper[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  // Once saved, a retry after a failed upload saves the same task again instead of adding another.
  const [savedId, setSavedId] = useState<number | null>(task?.id ?? null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const papers = useTaskPapers(weddingId, task);
  const chosenItemId = itemId ?? (pickedItemId === "" ? null : Number(pickedItemId));
  const personName = (personId: number | null) =>
    papers.people.find((person) => person.id === personId)?.displayName ?? t("documents.both");

  const addPaper = () => {
    if (paperName.trim() === "") return;
    setPendingPapers([
      ...pendingPapers,
      { name: paperName.trim(), personId: paperPersonId === "" ? null : Number(paperPersonId) },
    ]);
    setPaperName("");
  };

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles([...files, ...Array.from(event.target.files ?? [])]);
    event.target.value = "";
  };

  const attempt = async (change: () => Promise<unknown>) => {
    setError(null);
    try {
      await change();
      await papers.reload();
    } catch (failure) {
      setError(uploadErrorKey(failure));
    }
  };

  /** Uploads a paper straight into a request this task already has. */
  const answer = (request: PaperRequest, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || weddingId === null || task === null) return;
    void attempt(async () => {
      const document = await uploadDocument(weddingId, file, {
        title: request.name,
        kind: "paper",
        itemId: request.itemId,
        requirementId: task.id,
        personId: request.personId,
        expiresOn: null,
      });
      await updatePaperRequest(weddingId, request.id, { documentId: document.id });
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") {
      setError("planning.nameRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const saved = await onSave(
        { title: title.trim(), itemId: chosenItemId, dueDate: dueDate || null, dueTime: dueDate && dueTime ? dueTime : null },
        savedId,
      );
      setSavedId(saved.id);
      if (weddingId !== null) {
        // One at a time, each dropped once done, so a retry only sends what is left.
        let papersLeft = pendingPapers;
        for (const paper of pendingPapers) {
          if (saved.itemId === null) break;
          await createPaperRequest(weddingId, { ...paper, itemId: saved.itemId, requirementId: saved.id });
          papersLeft = papersLeft.slice(1);
          setPendingPapers(papersLeft);
        }
        let filesLeft = files;
        for (const file of files) {
          await uploadDocument(weddingId, file, {
            title: null,
            kind: isPdf(file) ? "paper" : "photo",
            itemId: saved.itemId,
            requirementId: saved.id,
            personId: null,
            expiresOn: null,
          });
          filesLeft = filesLeft.slice(1);
          setFiles(filesLeft);
        }
      }
      onClose();
    } catch (failure) {
      setError(uploadErrorKey(failure));
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t(isEditing ? "tasks.editTitle" : "tasks.new")} sticker="📝" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          <div>
            <label htmlFor={idFor("title")} className={fieldLabel}>
              {t("tasks.title")}
            </label>
            <input
              id={idFor("title")}
              value={title}
              placeholder={t("tasks.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
              className={pillField}
              autoFocus
            />
          </div>
          {itemId === undefined && (
            <div>
              <Dropdown
                searchable
                label={t("tasks.item")}
                value={pickedItemId}
                options={[
                  { value: "", label: t("tasks.general") },
                  ...items.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  })),
                ]}
                onChange={setPickedItemId}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <div className="min-w-44 flex-1">
              <DatePicker label={t("tasks.date")} value={dueDate || null} onChange={(next) => setDueDate(next ?? "")} />
            </div>
            <div>
              <label htmlFor={idFor("time")} className={fieldLabel}>
                {t("tasks.time")}
              </label>
              <input
                id={idFor("time")}
                type="time"
                value={dueTime}
                disabled={dueDate === ""}
                onChange={(e) => setDueTime(e.target.value)}
                className={`${pillField} disabled:cursor-not-allowed disabled:opacity-50`}
              />
            </div>
          </div>

          <section aria-labelledby={idFor("papers")} className="flex flex-col gap-2">
            <h3 id={idFor("papers")} className={fieldLabel}>
              {t("tasks.papers")}
            </h3>
            {papers.requests.length > 0 && (
              <ul className="flex flex-col">
                {papers.requests.map((request) => (
                  <li key={request.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[2.5px] text-[14px] ${
                        request.isMissing ? "border-coral bg-cream-light" : "border-ink bg-mint text-white"
                      }`}
                    >
                      {request.isMissing ? "" : "✓"}
                    </span>
                    <span className="text-lg">{request.name}</span>
                    <span className="text-[15px] text-ink/60">{personName(request.personId)}</span>
                    <span className="ml-auto flex items-center gap-2">
                      {request.isMissing ? (
                        <label className={`${compactButton} cursor-pointer !px-3 !py-0.5 !text-[15px]`}>
                          {t("documents.uploadShort")}
                          <input
                            type="file"
                            accept={accepted}
                            aria-label={t("documents.uploadFor", {
                              paper: request.name,
                              person: personName(request.personId),
                            })}
                            onChange={(event) => answer(request, event)}
                            className="sr-only"
                          />
                        </label>
                      ) : (
                        weddingId !== null && (
                          <a
                            href={documentFileUrl(weddingId, request.documentId as number)}
                            target="_blank"
                            rel="noreferrer"
                            className={linkStyle}
                          >
                            {t("documents.item.view")} ↗
                          </a>
                        )
                      )}
                      <button
                        type="button"
                        aria-label={t("documents.item.removeRequest", { name: request.name })}
                        onClick={() => weddingId !== null && void attempt(() => deletePaperRequest(weddingId, request.id))}
                        className={removeButton}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {pendingPapers.length > 0 && (
              <ul className="flex flex-col">
                {pendingPapers.map((paper, index) => (
                  <li key={`${paper.name}-${index}`} className="flex items-center gap-3 py-1.5">
                    <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-md border-[2.5px] border-coral" />
                    <span className="text-lg">{paper.name}</span>
                    <span className="text-[15px] text-ink/60">{personName(paper.personId)}</span>
                    <button
                      type="button"
                      aria-label={t("documents.form.remove", { name: paper.name })}
                      onClick={() => setPendingPapers(pendingPapers.filter((_, at) => at !== index))}
                      className={`${removeButton} ml-auto`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {chosenItemId === null ? (
              <p className="text-base text-ink/70">{t("tasks.papersNeedItem")}</p>
            ) : (
              <div className="flex flex-col gap-3 rounded-[20px] border-2 border-dashed border-ink/30 p-3">
                <div>
                  <label htmlFor={idFor("paper")} className="sr-only">
                    {t("tasks.paperName")}
                  </label>
                  <input
                    id={idFor("paper")}
                    value={paperName}
                    placeholder={`${t("tasks.paperName")}: ${t("documents.ask.namePlaceholder")}`}
                    onChange={(e) => setPaperName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPaper();
                      }
                    }}
                    className={pillField}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-40 flex-1">
                    <Dropdown
                      label={t("documents.form.person")}
                      value={paperPersonId}
                      options={[
                        { value: "", label: t("documents.both") },
                        ...papers.people.map((person) => ({ value: String(person.id), label: person.displayName })),
                      ]}
                      onChange={setPaperPersonId}
                    />
                  </div>
                  <button type="button" onClick={addPaper} className={compactButton}>
                    {t("tasks.addPaper")}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby={idFor("files")} className="flex flex-col gap-2">
            <h3 id={idFor("files")} className={fieldLabel}>
              {t("tasks.files")}
            </h3>
            {(papers.documents.length > 0 || files.length > 0) && (
              <ul className="flex flex-col gap-1">
                {papers.documents.map((document) => (
                  <li key={document.id} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-ink/60" aria-hidden="true">
                      {document.kind === "photo" ? "image" : "description"}
                    </span>
                    {weddingId !== null && (
                      <a
                        href={documentFileUrl(weddingId, document.id)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("documents.open", { title: document.title })}
                        className={linkStyle}
                      >
                        {document.title}
                      </a>
                    )}
                  </li>
                ))}
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-ink/60" aria-hidden="true">
                      {isPdf(file) ? "description" : "image"}
                    </span>
                    <span className="truncate text-lg">{file.name}</span>
                    <button
                      type="button"
                      aria-label={t("documents.form.remove", { name: file.name })}
                      onClick={() => setFiles(files.filter((_, at) => at !== index))}
                      className={`${removeButton} ml-auto`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className={`${compactButton} cursor-pointer self-start focus-within:ring-4 focus-within:ring-sky/25`}>
              <span className="material-symbols-outlined" aria-hidden="true">
                add_photo_alternate
              </span>
              {t("tasks.attach")}
              <input
                type="file"
                multiple
                accept={accepted}
                aria-label={t("tasks.attach")}
                onChange={pick}
                className="sr-only"
              />
            </label>
          </section>

          {error !== null && (
            <p role="alert" className="text-lg text-coral">
              {t(error)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          {onDelete !== undefined && isEditing && (
            <button type="button" onClick={onDelete} className="mr-auto text-lg text-coral underline-offset-4 hover:underline">
              {t("planning.delete")}
            </button>
          )}
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("planning.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t(isEditing ? "planning.save" : "tasks.add")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
