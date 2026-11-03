import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "../../api/client";
import type { RoomType, RoomTypeDraft } from "../../api/types";
import { failedTo } from "../../components/feedback/problems";
import type { Problem } from "../../components/feedback/problems";
import { useProblemText } from "../../components/feedback/useProblemText";
import { SidePanel, panelBody, panelFooter } from "../../components/form/SidePanel";
import { fieldLabel, pillField } from "../../components/form/styles";
import { screenIcons } from "../../components/playful/icons";
import { primaryButton, secondaryButton } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";

interface RoomTypesDialogProps {
  roomTypes: RoomType[];
  onCreate: (draft: RoomTypeDraft) => Promise<unknown>;
  onUpdate: (roomTypeId: number, draft: RoomTypeDraft) => Promise<unknown>;
  onDelete: (roomTypeId: number) => Promise<unknown>;
  /** Everything saved: the page reloads the room types and closes the drawer. */
  onSaved: () => void;
  onClose: () => void;
}

/** A row being edited: a room type the hotel has (with its id) or a new one. */
interface Row {
  key: string;
  id: number | null;
  name: string;
  beds: string;
  available: number;
}

const toRow = (roomType: RoomType): Row => ({
  key: `saved-${roomType.id}`,
  id: roomType.id,
  name: roomType.name,
  beds: roomType.beds ?? "",
  available: roomType.available,
});
const toDraft = (row: Row): RoomTypeDraft => ({ name: row.name.trim(), beds: row.beds.trim(), available: row.available });

/**
 * The hotel's room types and how many of each it holds for the wedding night.
 * Changes are saved together; a type still booked for a household cannot go.
 */
export function RoomTypesDialog({ roomTypes, onCreate, onUpdate, onDelete, onSaved, onClose }: RoomTypesDialogProps) {
  const { t } = useTranslation();
  const problemText = useProblemText();
  const [rows, setRows] = useState<Row[]>(roomTypes.map(toRow));
  const [nextKey, setNextKey] = useState(0);
  const [error, setError] = useState<Problem | null>(null);
  const [inUse, setInUse] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const edit = (key: string, changes: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));

  const add = () => {
    setRows((current) => [...current, { key: `new-${nextKey}`, id: null, name: "", beds: "", available: 0 }]);
    setNextKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setInUse(null);
    if (rows.some((row) => row.name.trim() === "")) {
      setError("roomTypes.nameRequired");
      return;
    }
    setError(null);
    setIsSaving(true);
    const kept = new Set(rows.map((row) => row.id));
    const removed = roomTypes.filter((roomType) => !kept.has(roomType.id));
    const changed = rows.filter((row) => {
      const before = roomTypes.find((roomType) => roomType.id === row.id);
      return before !== undefined && JSON.stringify(toDraft(toRow(before))) !== JSON.stringify(toDraft(row));
    });
    let deleting: RoomType | null = null;
    try {
      for (const row of changed) await onUpdate(row.id as number, toDraft(row));
      for (const row of rows.filter((each) => each.id === null)) await onCreate(toDraft(row));
      for (const roomType of removed) {
        deleting = roomType;
        await onDelete(roomType.id);
      }
      onSaved();
    } catch (failure) {
      if (deleting !== null && failure instanceof ApiError && failure.status === 409) {
        setInUse(t("roomTypes.inUse", { name: deleting.name }));
      } else {
        setError(failedTo("roomTypes.saveFailed", failure));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel title={t("roomTypes.title")} icon={screenIcons.guests} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className={panelBody}>
          {rows.length === 0 && <p className="font-playful text-lg text-ink/60">{t("roomTypes.empty")}</p>}
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li key={row.key} className="flex flex-col gap-2 rounded-[20px] border-[2.5px] border-ink bg-cream-light p-3">
                <div className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className={fieldLabel}>{t("roomTypes.name")}</span>
                    <input
                      className={pillField}
                      value={row.name}
                      onChange={(event) => edit(row.key, { name: event.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={t("roomTypes.remove", { name: row.name })}
                    onClick={() => setRows((current) => current.filter((each) => each.key !== row.key))}
                    className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-ink/70 hover:bg-coral/20 hover:text-coral"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className={fieldLabel}>{t("roomTypes.beds")}</span>
                    <input
                      className={pillField}
                      value={row.beds}
                      onChange={(event) => edit(row.key, { beds: event.target.value })}
                    />
                  </label>
                  <label className="w-28">
                    <span className={fieldLabel}>{t("roomTypes.available")}</span>
                    <input
                      type="number"
                      min={0}
                      className={pillField}
                      value={row.available}
                      onChange={(event) => edit(row.key, { available: Math.max(0, Number(event.target.value) || 0) })}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={add} className={`${secondaryButton} self-start !px-4 !py-2 !text-lg`}>
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>
            {t("roomTypes.add")}
          </button>

          {(error !== null || inUse !== null) && (
            <p role="alert" className="font-playful text-lg text-coral">
              {inUse ?? problemText(error as Problem)}
            </p>
          )}
        </div>
        <div className={panelFooter}>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("guests.form.cancel")}
          </button>
          <button type="submit" disabled={isSaving} className={primaryButton}>
            {t(isSaving ? "guests.form.saving" : "guests.form.save")}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}
