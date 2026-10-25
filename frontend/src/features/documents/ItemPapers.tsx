import { useId, useState } from "react";

import { documentFileUrl } from "../../api/documents";
import type { Item, PaperRequest, WeddingDocument } from "../../api/types";
import { compactButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { AddFilesForm } from "./AddFilesForm";
import type { FilesPreset } from "./AddFilesForm";
import { AskForPaperForm } from "./AskForPaperForm";
import { DocumentTile } from "./DocumentTile";
import { useDocuments } from "./useDocuments";

interface ItemPapersProps {
  weddingId: number;
  item: Item;
  /** Every item, for moving a file to another one. */
  items: Item[];
}

type Panel = { kind: "files"; document: WeddingDocument | null; preset?: FilesPreset } | { kind: "ask" } | null;

const linkStyle = "text-lg text-sky-deep underline-offset-4 hover:underline";
const heading = "font-playful-display text-xl uppercase tracking-wide";

/**
 * An item's paperwork in its detail: the papers it asks for, ticked off as
 * they are uploaded, and every photo and file filed under it.
 */
export function ItemPapers({ weddingId, item, items }: ItemPapersProps) {
  const { t } = useTranslation();
  const papersId = useId();
  const filesId = useId();
  const state = useDocuments(weddingId, item.id);
  const [panel, setPanel] = useState<Panel>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const missing = state.requests.filter((request) => request.isMissing);
  const whose = (request: PaperRequest) =>
    state.people.find((person) => person.id === request.personId)?.displayName ?? t("documents.both");

  const attempt = async (change: () => Promise<void>) => {
    setActionError(null);
    try {
      await change();
    } catch {
      setActionError("planning.saveFailed");
    }
  };

  const handleDelete = (document: WeddingDocument) => {
    if (!window.confirm(t("documents.deleteConfirm", { title: document.title }))) return;
    setPanel(null);
    void attempt(() => state.removeDocument(document.id));
  };

  if (state.isLoading) return null;

  return (
    <>
      <section aria-labelledby={papersId} className="flex flex-col gap-1">
        <h3 id={papersId} className={heading}>
          {t("documents.item.papers")}
          {missing.length > 0 && (
            <span className="ml-2 align-middle font-playful text-[15px] normal-case tracking-normal text-coral">
              {t("documents.item.missingCount", { count: missing.length })}
            </span>
          )}
        </h3>
        {state.requests.length === 0 && <p className="text-lg text-ink/70">{t("documents.item.none")}</p>}
        <ul className="flex flex-col">
          {state.requests.map((request) => (
            <li key={request.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              {request.isMissing ? (
                <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-md border-[2.5px] border-coral bg-cream-light" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink bg-mint text-[14px] text-white"
                >
                  ✓
                </span>
              )}
              <span className="text-lg">{request.name}</span>
              <span className="text-[15px] text-ink/60">
                {whose(request)}
                {request.requirementTitle && ` · ${request.requirementTitle}`}
              </span>
              <span className="ml-auto flex items-center gap-2">
                {request.isMissing ? (
                  <button
                    type="button"
                    aria-label={t("documents.uploadFor", { paper: request.name, person: whose(request) })}
                    onClick={() =>
                      setPanel({
                        kind: "files",
                        document: null,
                        preset: {
                          kind: "paper",
                          itemId: item.id,
                          requirementId: request.requirementId,
                          personId: request.personId,
                          title: request.name,
                          answers: [request.id],
                        },
                      })
                    }
                    className={`${compactButton} !px-3 !py-0.5 !text-[15px]`}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      upload
                    </span>
                    {t("documents.uploadShort")}
                  </button>
                ) : (
                  <a
                    href={documentFileUrl(weddingId, request.documentId as number)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("documents.open", { title: request.documentTitle ?? request.name })}
                    className={linkStyle}
                  >
                    {t("documents.item.view")} ↗
                  </a>
                )}
                <button
                  type="button"
                  aria-label={t("documents.item.removeRequest", { name: request.name })}
                  onClick={() => void attempt(() => state.removeRequest(request.id))}
                  className="px-1 text-xl text-ink opacity-40 transition-opacity hover:text-coral hover:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setPanel({ kind: "ask" })} className={`${linkStyle} self-start`}>
          {t("documents.papers.ask")}
        </button>
      </section>

      <section aria-labelledby={filesId} className="flex flex-col gap-2">
        <h3 id={filesId} className={heading}>
          {t("documents.item.files")}
        </h3>
        {state.documents.length === 0 && <p className="text-lg text-ink/70">{t("documents.item.noFiles")}</p>}
        <ul className="flex flex-wrap gap-4 pt-2">
          {state.documents.map((document) => (
            <DocumentTile
              key={document.id}
              weddingId={weddingId}
              document={document}
              onEdit={(each) => setPanel({ kind: "files", document: each })}
            />
          ))}
          <li>
            <button
              type="button"
              onClick={() => setPanel({ kind: "files", document: null, preset: { itemId: item.id } })}
              className="flex h-24 w-[140px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/50 text-[15px] text-ink/70 transition-colors hover:bg-accent/25"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add_photo_alternate
              </span>
              {t("documents.addFiles")}
            </button>
          </li>
        </ul>
      </section>

      {actionError !== null && (
        <p role="alert" className="text-lg text-coral">
          {t(actionError)}
        </p>
      )}

      {panel?.kind === "files" && (
        <AddFilesForm
          weddingId={weddingId}
          items={items}
          people={state.people}
          document={panel.document}
          preset={panel.preset}
          onUpload={async (files, details, answers) => {
            await state.upload(files, details, answers);
            setPanel(null);
          }}
          onSave={async (changes) => {
            await state.editDocument((panel.document as WeddingDocument).id, changes);
            setPanel(null);
          }}
          onDelete={panel.document ? () => handleDelete(panel.document as WeddingDocument) : undefined}
          onClose={() => setPanel(null)}
        />
      )}
      {panel?.kind === "ask" && (
        <AskForPaperForm
          weddingId={weddingId}
          items={items}
          people={state.people}
          item={item}
          onSave={async (draft) => {
            await state.askForPaper(draft);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  );
}
