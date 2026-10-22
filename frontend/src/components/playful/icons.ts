/**
 * Where the hand-drawn icons are served from: public/icons, shipped with the
 * app, unless VITE_ICONS_URL points somewhere else.
 */
export function iconUrl(fileName: string): string {
  const iconsUrl = import.meta.env.VITE_ICONS_URL?.replace(/\/+$/, "") ?? "/icons";
  return `${iconsUrl}/${fileName}`;
}
