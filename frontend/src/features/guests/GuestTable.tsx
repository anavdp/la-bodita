import { useState } from "react";

import type { Guest, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { fullName } from "./filtering";
import {
  relationshipLabelKey,
  rsvpChipClass,
  rsvpIcon,
  rsvpLabelKey,
  rsvpStatuses,
  rsvpToneClass,
  sideFlag,
  sideLabelKey,
} from "./vocabulary";

interface GuestTableProps {
  guests: Guest[];
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onChangeRsvp: (guest: Guest, status: RsvpStatus) => void;
}

/** Both columns open a menu, and only ever one at a time. */
type OpenMenu = { guestId: number; kind: "rsvp" | "actions" } | null;

const menuPanel =
  "absolute z-10 mt-2 flex w-max flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg";
const menuItem =
  "flex items-center gap-2 rounded px-3 py-2 text-left font-label-md text-label-md transition-colors hover:bg-surface-container-high";

export function GuestTable({ guests, onEdit, onDelete, onChangeRsvp }: GuestTableProps) {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const closeMenus = () => {
    setOpenMenu(null);
    setIsConfirmingDelete(false);
  };

  const isOpen = (guest: Guest, kind: OpenMenu extends null ? never : "rsvp" | "actions") =>
    openMenu?.guestId === guest.id && openMenu.kind === kind;

  const toggleMenu = (guest: Guest, kind: "rsvp" | "actions") => {
    setIsConfirmingDelete(false);
    setOpenMenu((current) =>
      current?.guestId === guest.id && current.kind === kind ? null : { guestId: guest.id, kind },
    );
  };

  return (
    // The table scrolls sideways on narrow screens, and `overflow-x: auto` makes
    // the browser clip vertically too - which cuts off a row menu opened near the
    // bottom. Reserving room while a menu is open keeps it reachable.
    <div className={`overflow-x-auto ${openMenu === null ? "" : "pb-28"}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-variant font-label-md text-label-md uppercase text-on-surface-variant">
            <th className="px-4 py-4 font-semibold">{t("guests.column.name")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.type")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.relationship")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.side")}</th>
            <th className="px-4 py-4 font-semibold">{t("guests.column.rsvp")}</th>
            <th className="px-4 py-4 text-right font-semibold">{t("guests.column.actions")}</th>
          </tr>
        </thead>
        <tbody className="font-body-sm text-body-sm">
          {guests.map((guest) => {
            const name = fullName(guest);
            const statusLabel = t(rsvpLabelKey(guest.rsvpStatus));

            return (
              <tr
                key={guest.id}
                className="table-row-hover border-b border-surface-container transition-colors"
              >
                <td className="px-4 py-4">
                  {/* The mockup starts each row with the design system's circular
                      checkbox, but with nothing selectable behind it. It comes back
                      with batch confirmation (issue #37). */}
                  <span className="font-title-lg text-title-lg text-on-surface">{name}</span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {t(guest.isChild ? "guests.type.child" : "guests.type.adult")}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {t(relationshipLabelKey(guest.relationshipType))}
                </td>
                <td className="px-4 py-4">
                  {/* The flag is the label: the country's name is what it is announced
                      as, and what it says on hover. */}
                  <span
                    role="img"
                    aria-label={t(sideLabelKey(guest.side))}
                    title={t(sideLabelKey(guest.side))}
                    className="text-2xl leading-none"
                  >
                    {sideFlag[guest.side]}
                  </span>
                </td>

                {/* The status is the icon itself, and the icon is how you change it. */}
                <td className="px-4 py-4">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("guests.rsvp.change", { name, status: statusLabel })}
                      title={statusLabel}
                      aria-expanded={isOpen(guest, "rsvp")}
                      onClick={() => toggleMenu(guest, "rsvp")}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70 ${
                        rsvpChipClass[guest.rsvpStatus]
                      } ${rsvpToneClass[guest.rsvpStatus]}`}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {rsvpIcon[guest.rsvpStatus]}
                      </span>
                    </button>

                    {isOpen(guest, "rsvp") && (
                      <div className={`${menuPanel} left-0`}>
                        {rsvpStatuses
                          .filter((status) => status !== guest.rsvpStatus)
                          .map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                closeMenus();
                                onChangeRsvp(guest, status);
                              }}
                              className={menuItem}
                            >
                              <span
                                className={`material-symbols-outlined ${rsvpToneClass[status]}`}
                                aria-hidden="true"
                              >
                                {rsvpIcon[status]}
                              </span>
                              {t("guests.rsvp.markAs", { status: t(rsvpLabelKey(status)) })}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4 text-right">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("guests.actions.open", { name })}
                      aria-expanded={isOpen(guest, "actions")}
                      onClick={() => toggleMenu(guest, "actions")}
                      className="text-outline transition-colors hover:text-primary"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        more_horiz
                      </span>
                    </button>

                    {isOpen(guest, "actions") && (
                      <div className={`${menuPanel} right-0`}>
                        {isConfirmingDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                closeMenus();
                                onDelete(guest);
                              }}
                              className={`${menuItem} text-error hover:bg-error-container`}
                            >
                              {t("guests.deleteConfirm", { name })}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingDelete(false)}
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
                                closeMenus();
                                onEdit(guest);
                              }}
                              className={menuItem}
                            >
                              {t("guests.actions.edit")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingDelete(true)}
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
