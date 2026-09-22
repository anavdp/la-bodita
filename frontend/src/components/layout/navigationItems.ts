import type { TranslationKey } from "../../i18n/translations";

export interface NavigationItem {
  path: string;
  labelKey: TranslationKey;
  /** A Material Symbols ligature, as used in the mockups. */
  icon: string;
}

/** The sidebar's order is the mockup's order. */
export const navigationItems: NavigationItem[] = [
  { path: "/dashboard", labelKey: "nav.dashboard", icon: "dashboard" },
  { path: "/items", labelKey: "nav.items", icon: "inventory_2" },
  { path: "/checklist", labelKey: "nav.checklist", icon: "checklist" },
  { path: "/calendar", labelKey: "nav.calendar", icon: "calendar_today" },
  { path: "/budget", labelKey: "nav.budget", icon: "payments" },
  { path: "/guests", labelKey: "nav.guests", icon: "group" },
  { path: "/documents", labelKey: "nav.documents", icon: "description" },
  { path: "/categories", labelKey: "nav.categories", icon: "category" },
];
