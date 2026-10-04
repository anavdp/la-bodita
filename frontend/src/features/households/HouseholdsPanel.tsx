import { useState } from "react";

import type { Household } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";

interface HouseholdsPanelProps {
  households: Household[];
  onDetails: (household: Household) => void;
  onEdit: (household: Household) => void;
  onDelete: (household: Household) => void;
}

const menuItem =
  "flex items-center gap-2 rounded px-3 py-2 text-left font-label-md text-label-md transition-colors hover:bg-surface-container-high";

/**
 * The households, by name and size. Someone invited alone is a household too,
 * but listing every one of them would bury the families, so they are hidden
 * until asked for.
 */
export function HouseholdsPanel({ households, onDetails, onEdit, onDelete }: HouseholdsPanelProps) {
  const { t } = useTranslation();
  const [showSolo, setShowSolo] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const visible = showSolo ? households : households.filter((household) => household.guestIds.length > 1);

  const act = (action: (household: Household) => void, household: Household) => {
    setOpenMenuId(null);
    action(household);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-max items-center gap-3 font-body-sm text-body-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={showSolo}
          onChange={(event) => setShowSolo(event.target.checked)}
          className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
        />
        {t("households.showSolo")}
      </label>

      {visible.length === 0 ? (
        <p className="font-body-lg text-body-lg text-on-surface-variant">{t("households.emptyFamilies")}</p>
      ) : (
        <div className={`overflow-x-auto ${openMenuId === null ? "" : "pb-36"}`}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-variant font-label-md text-label-md uppercase text-on-surface-variant">
                <th className="px-4 py-4 font-semibold">{t("households.column.name")}</th>
                <th className="px-4 py-4 font-semibold">{t("households.column.guests")}</th>
                <th className="px-4 py-4 text-right font-semibold">{t("households.column.actions")}</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm">
              {visible.map((household) => (
                <tr key={household.id} className="table-row-hover border-b border-surface-container transition-colors">
                  <td className="px-4 py-4">
                    <span className="font-title-lg text-title-lg text-on-surface">{household.name}</span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">{household.guestIds.length}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        aria-label={t("households.actions.open", { name: household.name })}
                        aria-expanded={openMenuId === household.id}
                        onClick={() => setOpenMenuId((current) => (current === household.id ? null : household.id))}
                        className="text-outline transition-colors hover:text-primary"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          more_horiz
                        </span>
                      </button>
                      {openMenuId === household.id && (
                        <div className="absolute right-0 z-10 mt-2 flex w-max flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
                          <button type="button" onClick={() => act(onDetails, household)} className={menuItem}>
                            {t("households.actions.details")}
                          </button>
                          <button type="button" onClick={() => act(onEdit, household)} className={menuItem}>
                            {t("households.actions.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => act(onDelete, household)}
                            className={`${menuItem} text-error`}
                          >
                            {t("households.actions.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
