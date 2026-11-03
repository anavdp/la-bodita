import { useState } from "react";

import type { Guest, Household, RoomType } from "../../api/types";
import { useIsPhone } from "../../components/layout/useIsPhone";
import { menuItem, menuPanel } from "../../components/playful/styles";
import { useTranslation } from "../../i18n/LanguageProvider";
import { statusDotClass } from "../guests/GuestStats";
import { comingMembers, roomCount, roomUsage } from "./weBook";
import { hotelIcon, rideIcon } from "./WeBookStats";

interface WeBookPanelProps {
  /** The booked households to show, already filtered. */
  households: Household[];
  guests: Guest[];
  roomTypes: RoomType[];
  onEdit: (household: Household) => void;
  onRemove: (household: Household) => void;
}

const nothing = <span className="text-ink/30">—</span>;

/**
 * The households we book for, each with its guests by name and RSVP dot: on the
 * day, this is the list to check against the hotel's and to plan the cars from.
 */
export function WeBookPanel({ households, guests, roomTypes, onEdit, onRemove }: WeBookPanelProps) {
  const { t } = useTranslation();
  // A phone has no room for the column words, so the icons stand in for them.
  const isPhone = useIsPhone();
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const roomName = new Map(roomTypes.map((roomType) => [roomType.id, roomType.name]));
  const usage = roomUsage(households, roomTypes);
  const pad = isPhone ? "px-3" : "px-4";
  const headerCell = `${pad} py-4 font-normal`;
  const cell = `${pad} py-3 align-top`;
  const iconStyle = isPhone ? "mx-auto h-7 w-7 object-contain" : "h-8 w-8 object-contain";

  const act = (action: (household: Household) => void, household: Household) => {
    setOpenMenu(null);
    action(household);
  };

  return (
    <div className={`font-playful text-ink ${openMenu === null ? "" : "pb-24"}`}>
      {/* The hotel's room types in one compact line: booked of available, red when over. */}
      {usage.length > 0 && (
        <div className={`flex items-center gap-3 border-b-[2.5px] border-ink py-3 ${isPhone ? "px-4" : "px-6"}`}>
          {!isPhone && <img src={hotelIcon} alt="" className="h-7 w-7 shrink-0 object-contain" />}
          <ul aria-label={t("weBook.receipt.label")} className="flex flex-wrap gap-x-3 gap-y-1 text-base">
            {usage.map(({ roomType, used, isOver }, index) => (
              <li
                key={roomType.id}
                className={`flex items-baseline gap-1.5 ${isOver ? "text-coral" : used > 0 ? "" : "text-ink/50"}`}
              >
                {index > 0 && (
                  <span aria-hidden="true" className="pr-1.5 text-ink/30">
                    |
                  </span>
                )}
                <b>
                  {used}/{roomType.available}
                </b>
                <span>{roomType.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[2.5px] border-ink bg-cream text-[15px] uppercase tracking-wider">
            <th className={`${headerCell} border-r-2 border-ink/20 pl-6`}>{t("weBook.column.household")}</th>
            <th className={`${headerCell} text-center`}>
              {isPhone ? <img src={hotelIcon} alt={t("weBook.column.rooms")} className={iconStyle} /> : t("weBook.column.rooms")}
            </th>
            <th className={`${headerCell} text-center`}>
              {isPhone ? <img src={rideIcon} alt={t("weBook.column.ride")} className={iconStyle} /> : t("weBook.column.ride")}
            </th>
            <th className={`${headerCell} pr-6 text-right`}>
              <span className={isPhone ? "sr-only" : ""}>{t("weBook.column.actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="text-lg">
          {households.map((household) => {
            const members = guests.filter((guest) => household.guestIds.includes(guest.id));
            return (
              <tr
                key={household.id}
                className="border-b-2 border-ink/15 transition-colors last:border-b-0 hover:bg-accent/25"
              >
                <td className={`${cell} border-r-2 border-ink/20 pl-6`}>
                  {household.name}
                  <ul className="mt-1 flex flex-col gap-0.5 text-base text-ink/75">
                    {members.map((guest) => (
                      <li
                        key={guest.id}
                        className={`flex items-center gap-2 ${
                          guest.rsvpStatus === "declined" ? "line-through opacity-50" : ""
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink ${statusDotClass[guest.rsvpStatus]}`}
                        />
                        {guest.firstName} {guest.lastName}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className={`${cell} text-center`} data-testid="rooms">
                  {roomCount(household) > 0 ? (
                    <span className="inline-flex items-start gap-2 text-left">
                      {!isPhone && <img src={hotelIcon} alt="" className={iconStyle} />}
                      <ul className="flex flex-col text-base leading-snug">
                        {household.rooms.map((room) => (
                          <li key={room.roomTypeId}>
                            {room.count} {roomName.get(room.roomTypeId)}
                          </li>
                        ))}
                      </ul>
                    </span>
                  ) : (
                    nothing
                  )}
                </td>
                <td className={`${cell} text-center`} data-testid="ride">
                  {household.needsRide ? (
                    <span className="inline-flex flex-col items-center">
                      <span className="inline-flex items-center gap-2">
                        {!isPhone && <img src={rideIcon} alt="" className={iconStyle} />}
                        <span className="text-xl">{comingMembers(household, guests).length}</span>
                      </span>
                      {household.rideWith !== null && (
                        <span className="text-base text-ink/70">{t("weBook.rideWith", { name: household.rideWith })}</span>
                      )}
                    </span>
                  ) : (
                    nothing
                  )}
                </td>
                <td className={`${cell} pr-6 text-right`}>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      aria-label={t("weBook.actions.open", { name: household.name })}
                      aria-expanded={openMenu === household.id}
                      onClick={() => setOpenMenu((current) => (current === household.id ? null : household.id))}
                      className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-accent/60"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        more_vert
                      </span>
                    </button>
                    {openMenu === household.id && (
                      <div className={`${menuPanel} right-0`}>
                        <button type="button" onClick={() => act(onEdit, household)} className={menuItem}>
                          {t("weBook.actions.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => act(onRemove, household)}
                          className={`${menuItem} !text-coral`}
                        >
                          {t("weBook.actions.remove")}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t-2 border-ink/15 px-6 py-3 text-base text-ink/60">{t("weBook.footnote")}</p>
    </div>
  );
}
