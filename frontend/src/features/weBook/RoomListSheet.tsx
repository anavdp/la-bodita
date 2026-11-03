import type { Guest, Household, RoomType } from "../../api/types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { comingMembers, roomCount, roomUsage } from "./weBook";

interface RoomListSheetProps {
  households: Household[];
  guests: Guest[];
  roomTypes: RoomType[];
}

const cell = "border border-black/30 px-2 py-1 text-left align-top";

/**
 * The room list on paper (or a PDF, from the print dialog): what we book of each
 * type, then each household with its rooms and who is coming. Plain black on
 * white, so it prints the same in light and dark mode, and works as the
 * wedding-day fallback if the hotel's own system fails.
 */
export function RoomListSheet({ households, guests, roomTypes }: RoomListSheetProps) {
  const { t } = useTranslation();
  const roomName = new Map(roomTypes.map((roomType) => [roomType.id, roomType.name]));
  const withRooms = households.filter((household) => roomCount(household) > 0);

  return (
    <div className="bg-white p-6 font-sans text-sm text-black">
      <h1 className="mb-4 text-2xl font-bold">{t("roomTypes.title")}</h1>

      <table aria-label={t("weBook.receipt.label")} className="mb-6 w-full border-collapse">
        <thead>
          <tr>
            <th className={cell}>{t("roomTypes.name")}</th>
            <th className={cell}>{t("roomTypes.beds")}</th>
            <th className={cell}>{t("roomTypes.available")}</th>
          </tr>
        </thead>
        <tbody>
          {roomUsage(households, roomTypes).map(({ roomType, used }) => (
            <tr key={roomType.id}>
              <td className={cell}>{roomType.name}</td>
              <td className={cell}>{roomType.beds ?? ""}</td>
              <td className={cell}>
                {used}/{roomType.available}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table aria-label={t("weBook.column.rooms")} className="w-full border-collapse">
        <thead>
          <tr>
            <th className={cell}>{t("weBook.column.household")}</th>
            <th className={cell}>{t("weBook.column.rooms")}</th>
            <th className={cell}>{t("weBook.summary.guests")}</th>
          </tr>
        </thead>
        <tbody>
          {withRooms.map((household) => (
            <tr key={household.id}>
              <td className={cell}>{household.name}</td>
              <td className={cell}>
                {household.rooms.map((room) => (
                  <div key={room.roomTypeId}>
                    {room.count} {roomName.get(room.roomTypeId)}
                  </div>
                ))}
              </td>
              <td className={cell}>
                {comingMembers(household, guests).map((guest) => (
                  <div key={guest.id}>
                    {guest.firstName} {guest.lastName}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
