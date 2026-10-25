import { useState } from "react";
import { NavLink } from "react-router-dom";

import type { WeddingDocument } from "../../api/types";
import { HeaderAction, PageHeader } from "../../components/playful/PageHeader";
import { folderTab, outlinedCard, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { useSearch } from "../../search/SearchProvider";
import { useWedding } from "../../wedding/WeddingProvider";
import { toIso } from "../calendar/calendarMath";
import { AddFilesForm } from "./AddFilesForm";
import type { FilesPreset } from "./AddFilesForm";
import { AllFilesTab } from "./AllFilesTab";
import { AskForPaperForm } from "./AskForPaperForm";
import { PapersTab } from "./PapersTab";
import { useDocuments } from "./useDocuments";

export type DocumentsTab = "papers" | "all";

/** Which drawer is open: files to add or one to edit, or a paper to ask for. */
type Panel = { kind: "files"; document: WeddingDocument | null; preset?: FilesPreset } | { kind: "ask" } | null;

/** The phone's tab bar pills; the open one is pink, like the folder tabs. */
const phoneTab = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 items-center justify-center gap-2 rounded-full border-[2.5px] py-2 font-playful text-lg text-ink transition-colors ${
    isActive ? "border-ink bg-accent" : "border-transparent"
  }`;

/**
 * Documents, in two tabs: the papers each office asks for (who has what, what
 * is missing), and every file on a shelf per category. On a phone the tabs sit
 * at the bottom beside a camera button, where a thumb reaches them.
 */
export function DocumentsPage({ tab }: { tab: DocumentsTab }) {
  const { t } = useTranslation();
  const { wedding } = useWedding();
  const { term } = useSearch();
  const weddingId = wedding?.id ?? null;
  const state = useDocuments(weddingId);
  const [panel, setPanel] = useState<Panel>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const missingCount = state.requests.filter((request) => request.isMissing).length;
  const openUpload = (preset?: FilesPreset) => setPanel({ kind: "files", document: null, preset });

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

  const tabLabel = (key: DocumentsTab) => (
    <>
      {t(key === "papers" ? "documents.tabs.papers" : "documents.tabs.all")}
      {key === "papers" && missingCount > 0 && (
        <span className="rounded-full border-2 border-ink bg-coral-soft px-2 text-[15px] leading-tight">
          {missingCount}
        </span>
      )}
    </>
  );

  const body = () => {
    if (state.isLoading || weddingId === null) {
      return <p className={`${outlinedCard} p-6 font-playful text-xl text-ink/70`}>{t("documents.loading")}</p>;
    }
    if (state.hasLoadError) {
      return (
        <div className={`${outlinedCard} flex flex-col items-start gap-4 p-6`}>
          <p className="font-playful text-xl text-coral">{t("planning.loadFailed")}</p>
          <button type="button" onClick={state.reload} className={secondaryButton}>
            {t("planning.retry")}
          </button>
        </div>
      );
    }
    if (tab === "papers") {
      return (
        <PapersTab
          weddingId={weddingId}
          categories={state.categories}
          documents={state.documents}
          requests={state.requests}
          people={state.people}
          today={toIso(new Date())}
          searchTerm={term}
          onUpload={openUpload}
          onAsk={() => setPanel({ kind: "ask" })}
          onAnswer={(requestIds, documentId) => void attempt(() => state.answer(requestIds, documentId))}
        />
      );
    }
    return (
      <AllFilesTab
        weddingId={weddingId}
        categories={state.categories}
        documents={state.documents}
        searchTerm={term}
        onEdit={(document) => setPanel({ kind: "files", document })}
      />
    );
  };

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title={t("documents.title")}
        subtitle={t(tab === "papers" ? "documents.subtitle.papers" : "documents.subtitle.all")}
        art="title-documents.png"
      >
        {/* On a phone the camera button in the bottom bar does this. */}
        <div className="hidden md:block">
          <HeaderAction icon="upload" label={t("documents.upload")} onClick={() => openUpload()} />
        </div>
      </PageHeader>

      <nav aria-label={t("documents.tabs.label")} className="mb-6 hidden md:flex">
        <NavLink to="/documents" end className={folderTab("rounded-l-[18px] inline-flex items-center gap-2")}>
          {tabLabel("papers")}
        </NavLink>
        <NavLink to="/documents/all" className={folderTab("-ml-[2.5px] rounded-r-[18px]")}>
          {tabLabel("all")}
        </NavLink>
      </nav>

      {actionError !== null && (
        <p role="alert" className="mb-4 font-playful text-lg text-coral">
          {t(actionError)}
        </p>
      )}

      {body()}

      <div className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-3 md:hidden">
        <nav
          aria-label={t("documents.tabs.label")}
          className="flex flex-1 gap-1 rounded-full border-[2.5px] border-ink bg-cream-light p-1.5 shadow-[3px_3px_0_rgba(31,29,43,0.2)]"
        >
          <NavLink to="/documents" end className={phoneTab}>
            {tabLabel("papers")}
          </NavLink>
          <NavLink to="/documents/all" className={phoneTab}>
            {tabLabel("all")}
          </NavLink>
        </nav>
        <button
          type="button"
          aria-label={t("documents.addFiles")}
          onClick={() => openUpload()}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-sky text-white shadow-[3px_3px_0_rgba(31,29,43,0.2)]"
        >
          <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
            add_a_photo
          </span>
        </button>
      </div>

      {panel?.kind === "files" && weddingId !== null && (
        <AddFilesForm
          weddingId={weddingId}
          items={state.items}
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
      {panel?.kind === "ask" && weddingId !== null && (
        <AskForPaperForm
          weddingId={weddingId}
          items={state.items}
          people={state.people}
          onSave={async (draft) => {
            await state.askForPaper(draft);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
