/**
 * Where the hand-drawn icons are served from: public/icons, shipped with the
 * app, unless VITE_ICONS_URL points somewhere else.
 */
export function iconUrl(fileName: string): string {
  const iconsUrl = import.meta.env.VITE_ICONS_URL?.replace(/\/+$/, "") ?? "/icons";
  return `${iconsUrl}/${fileName}`;
}

/**
 * Each screen's illustration: beside its title, and on the title band of every
 * drawer it opens, so a drawer always says which screen it belongs to.
 */
export const screenIcons = {
  guests: "title-cheers.png",
  items: "title-car.png",
  checklist: "title-checklist.png",
  calendar: "title-calendar.png",
  budget: "title-budget.png",
  documents: "title-documents.png",
  categories: "generic.png",
  settings: "engagement.png",
} as const;
