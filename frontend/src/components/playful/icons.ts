/**
 * Where the hand-drawn icons are served from: a bucket once VITE_ICONS_URL is
 * set, otherwise public/icons. They replace the emoji stand-ins one by one.
 */
export function iconUrl(fileName: string): string {
  const iconsUrl = import.meta.env.VITE_ICONS_URL?.replace(/\/+$/, "") ?? "/icons";
  return `${iconsUrl}/${fileName}`;
}
