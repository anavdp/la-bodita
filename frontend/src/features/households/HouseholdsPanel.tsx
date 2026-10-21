import { useState } from "react";

import type { BroadcastList, Household } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";

interface HouseholdsPanelProps {
  households: Household[];
  onDetails: (household: Household) => void;
  onEdit: (household: Household) => void;
  onDelete: (household: Household) => void;
  onChangeBroadcastList: (household: Household, broadcastList: BroadcastList | null) => void;
}

type OpenMenu = { householdId: number; kind: "broadcast" | "actions" } | null;

const broadcastLists: BroadcastList[] = ["bride", "groom"];
const broadcastEmoji: Record<BroadcastList, string> = { bride: "👰🏼‍♀️", groom: "🤵🏼‍♂️" };
const broadcastLabelKey = (list: BroadcastList | null): TranslationKey => `households.broadcast.${list ?? "none"}`;

const menuItem =
  "flex items-center gap-2 rounded px-3 py-2 text-left font-label-md text-label-md transition-colors hover:bg-surface-container-high";

/**
 * The households, by name and size. Someone invited alone is a household too,
 * but listing every one of them would bury the families, so they are hidden
 * until asked for.
 */
export function HouseholdsPanel({
  households,
  onDetails,
  onEdit,
  onDelete,
  onChangeBroadcastList,
}: HouseholdsPanelProps) {
  const { t } = useTranslation();
  const [showSolo, setShowSolo] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  const visible = showSolo ? households : households.filter((household) => household.guestIds.length > 1);

  const isOpen = (household: Household, kind: "broadcast" | "actions") =>
    openMenu?.householdId === household.id && openMenu.kind === kind;

  const toggleMenu = (household: Household, kind: "broadcast" | "actions") =>
    setOpenMenu((current) =>
      current?.householdId === household.id && current.kind === kind ? null : { householdId: household.id, kind },
    );

  const act = (action: (household: Household) => void, household: Household) => {
    setOpenMenu(null);
    action(household);
  };

  const changeBroadcastList = (household: Household, broadcastList: BroadcastList | null) => {
    setOpenMenu(null);
    onChangeBroadcastList(household, broadcastList);
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
        <div className={`overflow-x-auto ${openMenu === null ? "" : "pb-36"}`}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-variant font-label-md text-label-md uppercase text-on-surface-variant">
                <th className="px-4 py-4 font-semibold">{t("households.column.name")}</th>
                <th className="px-4 py-4 font-semibold">{t("households.column.guests")}</th>
                <th className="px-4 py-4 text-center font-semibold">{t("households.column.broadcast")}</th>
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

                  {/* Like the guests' RSVP: the list is the emoji itself, and the emoji is
                      how you change it. A household on no list gets a faint circle, so the
                      cell is still something to click. */}
                  <td className="px-4 py-4 text-center">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        aria-label={t("households.broadcast.change", {
                          name: household.name,
                          list: t(broadcastLabelKey(household.broadcastList)),
                        })}
                        title={t(broadcastLabelKey(household.broadcastList))}
                        aria-expanded={isOpen(household, "broadcast")}
                        onClick={() => toggleMenu(household, "broadcast")}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-outline-variant transition-opacity hover:opacity-70 hover:text-primary"
                      >
                        {household.broadcastList === null ? (
                          <span className="material-symbols-outlined" aria-hidden="true">
                            radio_button_unchecked
                          </span>
                        ) : (
                          <span className="text-[1.5rem] leading-none" aria-hidden="true">
                            {broadcastEmoji[household.broadcastList]}
                          </span>
                        )}
                      </button>

                      {isOpen(household, "broadcast") && (
                        <div className="absolute left-1/2 z-10 mt-2 flex w-max -translate-x-1/2 flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
                          {broadcastLists
                            .filter((list) => list !== household.broadcastList)
                            .map((list) => (
                              <button
                                key={list}
                                type="button"
                                onClick={() => changeBroadcastList(household, list)}
                                className={menuItem}
                              >
                                <span className="text-[1.25rem] leading-none" aria-hidden="true">
                                  {broadcastEmoji[list]}
                                </span>
                                {t(broadcastLabelKey(list))}
                              </button>
                            ))}
                          {household.broadcastList !== null && (
                            <button
                              type="button"
                              onClick={() => changeBroadcastList(household, null)}
                              className={menuItem}
                            >
                              <span className="material-symbols-outlined text-outline-variant" aria-hidden="true">
                                radio_button_unchecked
                              </span>
                              {t("households.broadcast.clear")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        aria-label={t("households.actions.open", { name: household.name })}
                        aria-expanded={isOpen(household, "actions")}
                        onClick={() => toggleMenu(household, "actions")}
                        className="text-outline transition-colors hover:text-primary"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          more_horiz
                        </span>
                      </button>
                      {isOpen(household, "actions") && (
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
