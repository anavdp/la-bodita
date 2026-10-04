import { useEffect, useId, useState } from "react";
import type { ChangeEvent } from "react";

import { ApiError } from "../../api/client";
import { guestImportTemplateUrl, previewGuestImport } from "../../api/guests";
import type { GuestDraft, GuestImportRow } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "./filtering";
import { NotSpecified } from "./NotSpecified";
import { relationshipLabelKey, sideLabelKey } from "./vocabulary";

interface GuestImportDialogProps {
  weddingId: number;
  /** Saves the previewed guests; the dialog stays open and explains if it throws. */
  onImport: (drafts: GuestDraft[]) => Promise<void>;
  onClose: () => void;
}

/** File-level rejections the API names by code, so they can be said in either language. */
const fileErrorKeys: Record<string, TranslationKey> = {
  csv_missing_columns: "guests.import.csv_missing_columns",
  csv_not_utf8: "guests.import.csv_not_utf8",
  csv_too_large: "guests.import.csv_too_large",
};

const secondaryButton =
  "rounded-full border border-primary px-6 py-3 font-label-md text-label-md text-primary transition-colors hover:bg-primary/5";
const cell = "px-3 py-2";

/**
 * Bulk-adds guests from the fixed CSV template: upload, preview, confirm.
 * Nothing is saved until the preview is confirmed, and rows with problems are
 * shown and skipped rather than failing the whole file.
 */
export function GuestImportDialog({ weddingId, onImport, onClose }: GuestImportDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();

  const [rows, setRows] = useState<GuestImportRow[] | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

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
    } catch {
      setError("guests.import.importFailed");
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

  const filePicker = (
    <div className="flex flex-col gap-4">
      <p className="font-body-sm text-body-sm text-on-surface-variant">{t("guests.import.intro")}</p>
      <a
        href={guestImportTemplateUrl(weddingId)}
        download
        className="flex w-max items-center gap-2 font-label-md text-label-md text-primary underline-offset-4 hover:underline"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          download
        </span>
        {t("guests.import.template")}
      </a>
      <div>
        <label
          className="mb-1 block font-label-md text-label-md uppercase text-on-surface-variant"
          htmlFor="guest-import-file"
        >
          {t("guests.import.file")}
        </label>
        <input
          id="guest-import-file"
          type="file"
          accept=".csv,text/csv"
          disabled={isBusy}
          onChange={handleFile}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:font-label-md file:text-label-md file:text-on-primary"
        />
      </div>
      {isBusy && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("guests.import.checking")}</p>
      )}
    </div>
  );

  const preview = (previewRows: GuestImportRow[]) =>
    previewRows.length === 0 ? (
      <p className="font-body-lg text-body-lg text-on-surface-variant">{t("guests.import.empty")}</p>
    ) : (
      <div className="flex flex-col gap-4">
        <p className="font-title-lg text-title-lg text-on-surface">
          {count("guests.import.readyOne", "guests.import.readyMany", readyGuests.length)}
        </p>
        {readyGuests.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-surface-variant">
            <table aria-label={t("guests.import.readyTable")} className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-surface-container-lowest">
                <tr className="border-b border-surface-variant font-label-md text-label-md uppercase text-on-surface-variant">
                  <th className={cell}>{t("guests.import.row")}</th>
                  <th className={cell}>{t("guests.column.name")}</th>
                  <th className={cell}>{t("guests.column.type")}</th>
                  <th className={cell}>{t("guests.column.relationship")}</th>
                  <th className={cell}>{t("guests.column.side")}</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface-variant">
                {previewRows.map(
                  ({ rowNumber, guest }) =>
                    guest !== null && (
                      <tr key={rowNumber} className="border-b border-surface-container">
                        <td className={cell}>{rowNumber}</td>
                        <td className={`${cell} text-on-surface`}>{fullName(guest)}</td>
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
                      </tr>
                    ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {problemRows.length > 0 && (
          <div className="rounded-lg bg-error/5 p-4">
            <p className="mb-2 font-label-md text-label-md text-error">
              {count("guests.import.problemsOne", "guests.import.problemsMany", problemRows.length)}
            </p>
            <ul
              aria-label={t("guests.import.problemsList")}
              className="flex max-h-40 flex-col gap-1 overflow-y-auto font-body-sm text-body-sm text-on-surface-variant"
            >
              {problemRows.map((row) => (
                <li key={row.rowNumber}>{describeProblems(row)}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("guests.import.duplicatesNote")}</p>
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-[30px_10px_40px_20px] bg-surface-container-lowest p-8 shadow-lg"
      >
        <h2 id={titleId} className="mb-6 font-headline-md text-headline-md text-primary">
          {t("guests.import.title")}
        </h2>

        {rows === null ? filePicker : preview(rows)}

        {error !== null && (
          <p role="alert" className="mt-4 font-body-sm text-body-sm text-error">
            {t(error)}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
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
              className="rounded-full bg-primary px-8 py-3 font-label-md text-label-md text-on-primary shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isBusy
                ? t("guests.import.importing")
                : count("guests.import.confirmOne", "guests.import.confirmMany", readyGuests.length)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
