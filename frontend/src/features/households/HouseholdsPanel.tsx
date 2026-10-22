import { useState } from "react";

import type { BroadcastList, Household } from "../../api/types";
import { iconUrl } from "../../components/playful/icons";
import { menuItem, menuPanel } from "../../components/playful/styles";
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
/** The bride's list is her dress, the groom's his suit. */
const broadcastIcon: Record<BroadcastList, string> = { bride: iconUrl("dress.png"), groom: iconUrl("suit.png") };
const broadcastLabelKey = (list: BroadcastList | null): TranslationKey => `households.broadcast.${list ?? "none"}`;

const headerCell = "px-4 py-4 font-normal";
const cell = "px-4 py-3";

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
    <div className="flex flex-col font-playful text-ink">
      <label className="flex w-max items-center gap-3 px-6 py-4 text-lg">
        <input
          type="checkbox"
          checked={showSolo}
          onChange={(event) => setShowSolo(event.target.checked)}
          className="h-5 w-5 rounded border-2 border-ink text-sky focus:ring-sky"
        />
        {t("households.showSolo")}
      </label>

      {visible.length === 0 ? (
        <p className="px-6 pb-6 text-lg">{t("households.emptyFamilies")}</p>
      ) : (
        <div className={`overflow-x-auto ${openMenu === null ? "" : "pb-36"}`}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y-[2.5px] border-ink bg-cream text-[15px] uppercase tracking-wider">
                <th className={`${headerCell} border-r-2 border-ink/20 pl-6`}>{t("households.column.name")}</th>
                <th className={headerCell}>{t("households.column.guests")}</th>
                <th className={`${headerCell} text-center`}>{t("households.column.broadcast")}</th>
                <th className={`${headerCell} pr-6 text-right`}>{t("households.column.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-lg">
              {visible.map((household) => (
                <tr
                  key={household.id}
                  className="border-b-2 border-ink/15 transition-colors last:border-b-0 hover:bg-accent/25"
                >
                  <td className={`${cell} border-r-2 border-ink/20 pl-6`}>{household.name}</td>
                  <td className={cell}>{household.guestIds.length}</td>

                  {/* Like the guests' RSVP: the list is the emoji itself, and the emoji is
                      how you change it. A household on no list gets a faint circle, so the
                      cell is still something to click. */}
                  <td className={`${cell} text-center`}>
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
                        className="flex h-10 w-10 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-accent/60 hover:text-ink"
                      >
                        {household.broadcastList === null ? (
                          <span className="material-symbols-outlined" aria-hidden="true">
                            radio_button_unchecked
                          </span>
                        ) : (
                          <img src={broadcastIcon[household.broadcastList]} alt="" className="h-8 w-8 object-contain" />
                        )}
                      </button>

                      {isOpen(household, "broadcast") && (
                        <div className={`${menuPanel} left-1/2 -translate-x-1/2`}>
                          {broadcastLists
                            .filter((list) => list !== household.broadcastList)
                            .map((list) => (
                              <button
                                key={list}
                                type="button"
                                onClick={() => changeBroadcastList(household, list)}
                                className={menuItem}
                              >
                                <img src={broadcastIcon[list]} alt="" className="h-6 w-6 object-contain" />
                                {t(broadcastLabelKey(list))}
                              </button>
                            ))}
                          {household.broadcastList !== null && (
                            <button
                              type="button"
                              onClick={() => changeBroadcastList(household, null)}
                              className={menuItem}
                            >
                              <span className="material-symbols-outlined text-ink/40" aria-hidden="true">
                                radio_button_unchecked
                              </span>
                              {t("households.broadcast.clear")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className={`${cell} pr-6 text-right`}>
                    <div className="relative inline-block">
                      <button
                        type="button"
                        aria-label={t("households.actions.open", { name: household.name })}
                        aria-expanded={isOpen(household, "actions")}
                        onClick={() => toggleMenu(household, "actions")}
                        className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-accent/60"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          more_vert
                        </span>
                      </button>
                      {isOpen(household, "actions") && (
                        <div className={`${menuPanel} right-0`}>
                          <button type="button" onClick={() => act(onDetails, household)} className={menuItem}>
                            {t("households.actions.details")}
                          </button>
                          <button type="button" onClick={() => act(onEdit, household)} className={menuItem}>
                            {t("households.actions.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => act(onDelete, household)}
                            className={`${menuItem} !text-coral`}
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
