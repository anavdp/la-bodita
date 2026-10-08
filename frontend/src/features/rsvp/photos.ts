/**
 * Where an RSVP photo is served from. The real photos are personal, so they
 * live in a public bucket rather than in git; the repo only carries blurry
 * placeholders in public/, which are used when no bucket is configured.
 */
export function photoUrl(fileName: string): string {
  const photosUrl = import.meta.env.VITE_PHOTOS_URL?.replace(/\/+$/, "") ?? "";
  return `${photosUrl}/${fileName}`;
}
