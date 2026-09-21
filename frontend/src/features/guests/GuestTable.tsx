import { useState } from "react";

import type { Guest } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { fullName } from "./filtering";
import { relationshipLabelKey, rsvpLabelKey, rsvpPillClass, sideDotColor, sideLabelKey } from "./vocabulary";

interface GuestTableProps {
  guests: Guest[];
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}

const menuItem =
  "rounded px-3 py-2 text-left font-label-md text-label-md transition-colors hover:bg-surface-container-high";

export function GuestTable({ guests, onEdit, onDelete }: GuestTableProps) {
  const { t } = useTranslation();
  const [openMenuFor, setOpenMenuFor] = useState<number | null>(null);
  const [confirmingDeleteFor, setConfirmingDeleteFor] = useState<number | null>(null);

  const closeMenu = () => {
    setOpenMenuFor(null);
    setConfirmingDeleteFor(null);
  };

  const toggleMenu = (guest: Guest) => {
    setConfirmingDeleteFor(null);
    setOpenMenuFor((current) => (current === guest.id ? null : guest.id));
  };

  return (
    // The table scrolls sideways on narrow screens, and `overflow-x: auto` makes
    // the browser clip vertically too - which cuts off a row menu opened near the
    // bottom. Reserving room while a menu is open keeps it reachable.
    <div className={`overflow-x-auto ${openMenuFor === null ? "" : "pb-28"}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-variant font-label-md text-label-md uppercase text-on-surface-variant">
            <th className="px-4 py-4 font-semibold">{t("guests.column.name")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.type")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.rsvp")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.relationship")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.side")}</th>
            <th className="px-4 py-4 text-right font-semibold">{t("guests.column.actions")}</th>
          </tr>
        </thead>
        <tbody className="font-body-sm text-body-sm">
          {guests.map((guest) => {
            const name = fullName(guest);
            const isMenuOpen = openMenuFor === guest.id;

            return (
              <tr key={guest.id} className="table-row-hover border-b border-surface-container transition-colors">
                <td className="flex items-center gap-3 px-4 py-4">
                  <div
                    className="h-8 w-8 rounded-full border-2 border-outline-variant"
                    aria-hidden="true"
                  />
                  <span className="font-title-lg text-title-lg text-on-surface">{name}</span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {t(guest.isChild ? "guests.type.child" : "guests.type.adult")}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 font-label-md text-label-md ${
                      rsvpPillClass[guest.rsvpStatus]
                    }`}
                  >
                    {t(rsvpLabelKey(guest.rsvpStatus))}
                  </span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {t(relationshipLabelKey(guest.relationshipType))}
                </td>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: sideDotColor[guest.side] }}
                      aria-hidden="true"
                    />
                    {t(sideLabelKey(guest.side))}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("guests.actions.open", { name })}
                      aria-expanded={isMenuOpen}
                      onClick={() => toggleMenu(guest)}
                      className="text-outline transition-colors hover:text-primary"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        more_horiz
                      </span>
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 z-10 mt-2 flex w-max flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
                        {confirmingDeleteFor === guest.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                onDelete(guest);
                              }}
                              className={`${menuItem} text-error hover:bg-error-container`}
                            >
                              {t("guests.deleteConfirm", { name })}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteFor(null)}
                              className={menuItem}
                            >
                              {t("guests.form.cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                onEdit(guest);
                              }}
                              className={menuItem}
                            >
                              {t("guests.actions.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteFor(guest.id)}
                              className={`${menuItem} text-error`}
                            >
                              {t("guests.actions.delete")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
