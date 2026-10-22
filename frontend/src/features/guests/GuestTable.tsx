import { useState } from "react";

import type { Guest, Household, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { avatarTones, menuItem, menuPanel } from "../../components/playful/styles";
import { fullName } from "./filtering";
import { statusDotClass } from "./GuestStats";
import { NotSpecified } from "./NotSpecified";
import {
  relationshipLabelKey,
  rsvpLabelKey,
  rsvpStatuses,
  sideFlag,
  sideLabelKey,
} from "./vocabulary";

interface GuestTableProps {
  guests: Guest[];
  /** Names the household column. Someone on their own shows blank: their household is just them. */
  households?: Household[];
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onChangeRsvp: (guest: Guest, status: RsvpStatus) => void;
}

/** Both columns open a menu, and only ever one at a time. */
type OpenMenu = { guestId: number; kind: "rsvp" | "actions" } | null;

/** The RSVP pill's fill: soft green, butter, or soft coral. */
const rsvpPillClass: Record<RsvpStatus, string> = {
  confirmed: "bg-mint-soft",
  pending: "bg-butter",
  declined: "bg-coral-soft",
};

/** "Maria Rossi" reads as MR, a guest with only a first name as its first letter. */
export function initialsOf(guest: Guest): string {
  return [guest.firstName, guest.lastName]
    .map((part) => part.trim().charAt(0))
    .join("")
    .toUpperCase();
}

const headerCell = "px-4 py-4 font-normal";
const cell = "px-4 py-3";

export function GuestTable({ guests, households = [], onEdit, onDelete, onChangeRsvp }: GuestTableProps) {
  const { t } = useTranslation();
  const householdNames = new Map(
    households
      .filter((household) => household.guestIds.length > 1)
      .map((household) => [household.id, household.name]),
  );
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
      <table className="w-full border-collapse text-left font-playful text-ink">
        <thead>
          <tr className="border-b-[2.5px] border-ink bg-cream text-[15px] uppercase tracking-wider">
            <th className={`${headerCell} border-r-2 border-ink/20 pl-6`}>{t("guests.column.name")}</th>
            <th className={headerCell}>{t("guests.column.household")}</th>
            <th className={headerCell}>{t("guests.column.type")}</th>
            <th className={headerCell}>{t("guests.column.relationship")}</th>
            <th className={headerCell}>{t("guests.column.side")}</th>
            <th className={`${headerCell} text-center`}>{t("guests.column.rsvp")}</th>
            <th className={`${headerCell} pr-6 text-right`}>{t("guests.column.actions")}</th>
          </tr>
        </thead>
        <tbody className="text-lg">
          {guests.map((guest) => {
            const name = fullName(guest);
            const statusLabel = t(rsvpLabelKey(guest.rsvpStatus));

            return (
              <tr
                key={guest.id}
                className="border-b-2 border-ink/15 transition-colors last:border-b-0 hover:bg-periwinkle/25"
              >
                <td className={`${cell} border-r-2 border-ink/20 pl-6`}>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-playful-display text-base ${
                        avatarTones[guest.id % avatarTones.length]
                      }`}
                    >
                      {initialsOf(guest)}
                    </span>
                    <span>{name}</span>
                  </span>
                </td>
                <td className={cell}>{householdNames.get(guest.householdId)}</td>
                <td className={cell}>{t(guest.isChild ? "guests.type.child" : "guests.type.adult")}</td>
                <td className={cell}>
                  {guest.relationshipType === null ? (
                    <NotSpecified />
                  ) : (
                    t(relationshipLabelKey(guest.relationshipType))
                  )}
                </td>
                <td className={cell}>
                  {/* The flag is the label: the country's name is what it is announced
                      as, and what it says on hover. */}
                  {guest.side === null ? (
                    <NotSpecified />
                  ) : (
                    <span
                      role="img"
                      aria-label={t(sideLabelKey(guest.side))}
                      title={t(sideLabelKey(guest.side))}
                      className="text-2xl leading-none"
                    >
                      {sideFlag[guest.side]}
                    </span>
                  )}
                </td>

                {/* The status pill is also how you change it. */}
                <td className={`${cell} text-center`}>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("guests.rsvp.change", { name, status: statusLabel })}
                      title={statusLabel}
                      aria-expanded={isOpen(guest, "rsvp")}
                      onClick={() => toggleMenu(guest, "rsvp")}
                      data-status={guest.rsvpStatus}
                      className={`inline-flex items-center gap-2 rounded-[14px] border-2 border-ink px-4 py-1 text-lg transition-[filter] hover:brightness-95 ${
                        rsvpPillClass[guest.rsvpStatus]
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-3 w-3 rounded-full border-2 border-ink ${statusDotClass[guest.rsvpStatus]}`}
                      />
                      {statusLabel}
                    </button>

                    {isOpen(guest, "rsvp") && (
                      <div className={`${menuPanel} right-0`}>
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
                                aria-hidden="true"
                                className={`h-3 w-3 rounded-full border-2 border-ink ${statusDotClass[status]}`}
                              />
                              {t("guests.rsvp.markAs", { status: t(rsvpLabelKey(status)) })}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className={`${cell} pr-6 text-right`}>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("guests.actions.open", { name })}
                      aria-expanded={isOpen(guest, "actions")}
                      onClick={() => toggleMenu(guest, "actions")}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-periwinkle/60"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        more_vert
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
                              className={`${menuItem} text-coral hover:bg-coral-soft`}
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
                              className={`${menuItem} !text-coral`}
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
