import { useState } from "react";
import type { ChangeEvent } from "react";

import { ApiError } from "../../api/client";
import { guestImportTemplateUrl, previewGuestImport } from "../../api/guests";
import type { GuestImportDraft, GuestImportRow } from "../../api/types";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "./filtering";
import { NotSpecified } from "./NotSpecified";
import { relationshipLabelKey, sideLabelKey } from "./vocabulary";

interface GuestImportDialogProps {
  weddingId: number;
  /** Saves the previewed guests; the dialog stays open and explains if it throws. */
  onImport: (drafts: GuestImportDraft[]) => Promise<void>;
  onClose: () => void;
}

/** File-level rejections the API names by code, so they can be said in either language. */
const fileErrorKeys: Record<string, TranslationKey> = {
  csv_missing_columns: "guests.import.csv_missing_columns",
  csv_not_utf8: "guests.import.csv_not_utf8",
  csv_too_large: "guests.import.csv_too_large",
};

const cell = "px-3 py-2";

/**
 * Bulk-adds guests from the fixed CSV template: upload, preview, confirm.
 * Nothing is saved until the preview is confirmed, and rows with problems are
 * shown and skipped rather than failing the whole file.
 */
export function GuestImportDialog({ weddingId, onImport, onClose }: GuestImportDialogProps) {
  const { t } = useTranslation();

  const [rows, setRows] = useState<GuestImportRow[] | null>(null);
  const [error, setError] = useState<Problem | null>(null);
  const problemText = useProblemText();
  const [isBusy, setIsBusy] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }

    setError(null);
    setIsBusy(true);
    try {
      setRows(await previewGuestImport(weddingId, file));
    } catch (failure) {
      const fileErrorKey = failure instanceof ApiError ? fileErrorKeys[failure.message] : undefined;
      setError(fileErrorKey ?? "guests.import.previewFailed");
    } finally {
      setIsBusy(false);
    }
  };

  const readyGuests = (rows ?? []).flatMap((row) => (row.guest === null ? [] : [row.guest]));
  const problemRows = (rows ?? []).filter((row) => row.guest === null);

  const handleConfirm = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await onImport(readyGuests);
    } catch (failure) {
      setError(failedTo("guests.import.importFailed", failure));
    } finally {
      setIsBusy(false);
    }
  };

  const describeProblems = (row: GuestImportRow) =>
    t("guests.import.rowProblems", {
      row: row.rowNumber,
      problems: row.errors
        .map((problem) => t(`guests.import.error.${problem.code}`, { field: problem.field }))
        .join(" "),
    });

  const count = (one: TranslationKey, many: TranslationKey, value: number) =>
    value === 1 ? t(one) : t(many, { count: value });

  const stepBadge =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-butter font-playful-display text-lg";

  const filePicker = (
    <div className="flex flex-col gap-5">
      <p className="text-lg">{t("guests.import.intro")}</p>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className={stepBadge}>
          1
        </span>
        <a href={guestImportTemplateUrl(weddingId)} download className={`${secondaryButton} !py-2 !text-lg`}>
          <span className="material-symbols-outlined" aria-hidden="true">
            download
          </span>
          {t("guests.import.template")}
        </a>
      </div>
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className={stepBadge}>
          2
        </span>
        {/* The whole dashed card is the file picker: the invisible input covers it. */}
        <div className="relative flex flex-1 flex-col items-center gap-2 rounded-[24px] border-[2.5px] border-dashed border-ink bg-cream-light px-6 py-10 text-center transition-colors focus-within:border-sky hover:bg-accent/30">
          <span className="text-5xl" aria-hidden="true">
            📄
          </span>
          <label htmlFor="guest-import-file" className="font-playful-display text-2xl uppercase tracking-wide">
            {t("guests.import.file")}
          </label>
          <span aria-hidden="true" className="material-symbols-outlined text-3xl text-sky">
            upload
          </span>
          <input
            id="guest-import-file"
            type="file"
            accept=".csv,text/csv"
            disabled={isBusy}
            onChange={handleFile}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      </div>
      {isBusy && <p className="text-lg text-ink/70">{t("guests.import.checking")}</p>}
    </div>
  );

  const preview = (previewRows: GuestImportRow[]) =>
    previewRows.length === 0 ? (
      <p className="text-xl text-ink/70">{t("guests.import.empty")}</p>
    ) : (
      <div className="flex flex-col gap-4">
        <p className="font-playful-display text-2xl">
          {count("guests.import.readyOne", "guests.import.readyMany", readyGuests.length)}
        </p>
        {readyGuests.length > 0 && (
          <div className="max-h-[45vh] overflow-y-auto rounded-[20px] border-[2.5px] border-ink bg-cream-light">
            <table aria-label={t("guests.import.readyTable")} className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-cream">
                <tr className="border-b-[2.5px] border-ink text-sm uppercase tracking-wider">
                  <th className={cell}>{t("guests.import.row")}</th>
                  <th className={cell}>{t("guests.column.name")}</th>
                  <th className={cell}>{t("guests.column.type")}</th>
                  <th className={cell}>{t("guests.column.relationship")}</th>
                  <th className={cell}>{t("guests.column.side")}</th>
                  <th className={cell}>{t("guests.column.household")}</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {previewRows.map(
                  ({ rowNumber, guest }) =>
                    guest !== null && (
                      <tr key={rowNumber} className="border-b-2 border-ink/10 last:border-b-0">
                        <td className={cell}>{rowNumber}</td>
                        <td className={`${cell} text-lg`}>{fullName(guest)}</td>
                        <td className={cell}>
                          {t(guest.isChild ? "guests.type.child" : "guests.type.adult")}
                        </td>
                        <td className={cell}>
                          {guest.relationshipType === null ? (
                            <NotSpecified />
                          ) : (
                            t(relationshipLabelKey(guest.relationshipType))
                          )}
                        </td>
                        <td className={cell}>
                          {guest.side === null ? <NotSpecified /> : t(sideLabelKey(guest.side))}
                        </td>
                        <td className={cell}>{guest.household ?? t("guests.household.alone")}</td>
                      </tr>
                    ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {problemRows.length > 0 && (
          <div className="rounded-[20px] border-[2.5px] border-ink bg-coral-soft p-4">
            <p className="mb-2 font-playful-display text-lg">
              {count("guests.import.problemsOne", "guests.import.problemsMany", problemRows.length)}
            </p>
            <ul
              aria-label={t("guests.import.problemsList")}
              className="flex max-h-40 flex-col gap-1 overflow-y-auto text-base"
            >
              {problemRows.map((row) => (
                <li key={row.rowNumber}>{describeProblems(row)}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-base text-ink/70">{t("guests.import.duplicatesNote")}</p>
      </div>
    );

  return (
    <SidePanel title={t("guests.import.title")} sticker="📋" wide onClose={onClose}>
      <div className={panelBody}>
        {rows === null ? filePicker : preview(rows)}

        {error !== null && (
          <p role="alert" className="text-lg text-coral">
            {problemText(error)}
          </p>
        )}
      </div>
      <div className={panelFooter}>
        <button type="button" onClick={onClose} className={secondaryButton}>
          {t("guests.import.cancel")}
        </button>
        {rows !== null && (
          <button
            type="button"
            onClick={() => {
              setRows(null);
              setError(null);
            }}
            className={secondaryButton}
          >
            {t("guests.import.chooseAnother")}
          </button>
        )}
        {rows !== null && rows.length > 0 && (
          <button
            type="button"
            disabled={isBusy || readyGuests.length === 0}
            onClick={handleConfirm}
            className={primaryButton}
          >
            {isBusy
              ? t("guests.import.importing")
              : count("guests.import.confirmOne", "guests.import.confirmMany", readyGuests.length)}
          </button>
        )}
      </div>
    </SidePanel>
  );
}
