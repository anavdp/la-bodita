import { useState } from "react";

import type { Guest, Household, RsvpStatus } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { avatarTones, menuItem, menuPanel } from "../../components/playful/styles";
import { ColumnFilterHeader } from "./ColumnFilterHeader";
import { fullName } from "./filtering";
import type { GuestColumnFilters, GuestFilterColumn } from "./filtering";
import { statusDotClass } from "./GuestStats";
import { NotSpecified } from "./NotSpecified";
import { householdNamesOf } from "./households";
import { firstDirectionOf } from "./sorting";
import type { GuestSort, GuestSortKey } from "./sorting";
import {
  relationshipLabelKey,
  rsvpLabelKey,
  rsvpStatuses,
  sideCode,
  sideLabelKey,
  sideTone,
} from "./vocabulary";

interface GuestTableProps {
  guests: Guest[];
  /** Names the household column. Someone on their own shows blank: their household is just them. */
  households?: Household[];
  /** The column the rows are sorted by; sorting by answer also shows when each guest answered. */
  sort: GuestSort;
  /** A sortable column's header was clicked. */
  onSort: (key: GuestSortKey) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onChangeRsvp: (guest: Guest, status: RsvpStatus) => void;
  /** What is ticked under the Type, Relationship and Side funnels. */
  filters: GuestColumnFilters;
  onChangeFilters: (filters: GuestColumnFilters) => void;
}

/** Rows and filterable headers open menus, and only ever one at a time. */
type OpenMenu = { guestId: number; kind: "rsvp" | "actions" } | { kind: "filter"; column: GuestFilterColumn } | null;

const filterColumns: GuestFilterColumn[] = ["type", "relationship", "side"];

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

/** The arrow says which way a column sorts; the others show they can. */
const sortIcon = { ascending: "arrow_upward", descending: "arrow_downward" } as const;

function SortableHeader({
  sortKey,
  sort,
  onSort,
  label,
  className,
}: {
  sortKey: GuestSortKey;
  sort: GuestSort;
  onSort: (key: GuestSortKey) => void;
  label: string;
  className: string;
}) {
  const { t } = useTranslation();
  const isActive = sort.key === sortKey;
  return (
    <th className={className} aria-sort={isActive ? sort.direction : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={t(`guests.sort.${sortKey}.${isActive && sort.direction === firstDirectionOf(sortKey) ? "reverse" : "first"}` as const)}
        className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-ink/70"
      >
        {label}
        <span
          className={`material-symbols-outlined text-[18px] ${isActive ? "" : "text-ink/40"}`}
          aria-hidden="true"
        >
          {isActive ? sortIcon[sort.direction] : "swap_vert"}
        </span>
      </button>
    </th>
  );
}

export function GuestTable({
  guests,
  households = [],
  sort,
  onSort,
  onEdit,
  onDelete,
  onChangeRsvp,
  filters,
  onChangeFilters,
}: GuestTableProps) {
  const { t, language } = useTranslation();
  const isByAnswer = sort.key === "answered";
  const answeredDay = new Intl.DateTimeFormat(language, { month: "short", day: "numeric" });
  const answeredMoment = new Intl.DateTimeFormat(language, { dateStyle: "long", timeStyle: "short" });
  const householdNames = householdNamesOf(households);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const closeMenus = () => {
    setOpenMenu(null);
    setIsConfirmingDelete(false);
  };

  const isOpen = (guest: Guest, kind: "rsvp" | "actions") =>
    openMenu !== null && openMenu.kind === kind && openMenu.guestId === guest.id;

  const toggleMenu = (guest: Guest, kind: "rsvp" | "actions") => {
    setIsConfirmingDelete(false);
    setOpenMenu((current) =>
      current !== null && current.kind === kind && current.guestId === guest.id ? null : { guestId: guest.id, kind },
    );
  };

  const isFilterOpen = (column: GuestFilterColumn) => openMenu?.kind === "filter" && openMenu.column === column;

  const toggleFilter = (column: GuestFilterColumn) => {
    setIsConfirmingDelete(false);
    setOpenMenu(isFilterOpen(column) ? null : { kind: "filter", column });
  };

  /** A filter menu is taller than a row menu, and a filtered table can be one row short. */
  const roomForMenu = openMenu === null ? "" : openMenu.kind === "filter" ? "min-h-[30rem]" : "pb-28";

  return (
    // The table scrolls sideways on narrow screens, and `overflow-x: auto` makes
    // the browser clip vertically too - which cuts off a row menu opened near the
    // bottom. Reserving room while a menu is open keeps it reachable.
    <div className={`overflow-x-auto ${roomForMenu}`}>
      <table className="w-full border-collapse text-left font-playful text-ink">
        <thead>
          <tr className="border-b-[2.5px] border-ink bg-cream text-[15px] uppercase tracking-wider">
            <SortableHeader
              sortKey="name"
              sort={sort}
              onSort={onSort}
              label={t("guests.column.name")}
              className={`${headerCell} border-r-2 border-ink/20 pl-6`}
            />
            <SortableHeader
              sortKey="household"
              sort={sort}
              onSort={onSort}
              label={t("guests.column.household")}
              className={headerCell}
            />
            {filterColumns.map((column) => (
              <ColumnFilterHeader
                key={column}
                column={column}
                label={t(`guests.column.${column}` as const)}
                filters={filters}
                isOpen={isFilterOpen(column)}
                onChange={onChangeFilters}
                onToggle={() => toggleFilter(column)}
                onClose={() => setOpenMenu(null)}
                className={headerCell}
              />
            ))}
            <SortableHeader
              sortKey="answered"
              sort={sort}
              onSort={onSort}
              label={t("guests.column.rsvp")}
              className={`${headerCell} text-center`}
            />
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
                className="border-b-2 border-ink/15 transition-colors last:border-b-0 hover:bg-accent/25"
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
                  {/* The code is the label: the country's name is what it is announced
                      as, and what it says on hover. */}
                  {guest.side === null ? (
                    <NotSpecified />
                  ) : (
                    <span
                      role="img"
                      aria-label={t(sideLabelKey(guest.side))}
                      title={t(sideLabelKey(guest.side))}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full font-playful-display text-base ${
                        sideTone[guest.side]
                      }`}
                    >
                      {sideCode[guest.side]}
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
                    {isByAnswer && guest.rsvpAnsweredAt !== null && (
                      <time
                        dateTime={guest.rsvpAnsweredAt}
                        title={answeredMoment.format(new Date(guest.rsvpAnsweredAt))}
                        className="mt-1 block text-sm text-ink/60"
                      >
                        {answeredDay.format(new Date(guest.rsvpAnsweredAt))}
                      </time>
                    )}

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
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-accent/60"
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
