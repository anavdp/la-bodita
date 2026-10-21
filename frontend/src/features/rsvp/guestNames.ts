import type { TranslationKey } from "../../i18n/translations";
import { fullName } from "../guests/filtering";

type Named = { firstName: string; lastName: string };

/**
 * A plus-one the couple does not know by name yet is saved as "Novia de Manuel"
 * or "Esposa de Pedro": a note for the planner, not a name to show the guest.
 */
export const isUnnamedPlusOne = (guest: Named): boolean =>
  /^(novia|novio|esposa|esposo|pareja) de /i.test(guest.firstName.trim());

/** How a guest is named on the guest pages: their own name, or the plus-one label. */
export function guestName(guest: Named, t: (key: TranslationKey) => string, plusOneLabel: TranslationKey): string {
  return isUnnamedPlusOne(guest) ? t(plusOneLabel) : fullName(guest);
}
