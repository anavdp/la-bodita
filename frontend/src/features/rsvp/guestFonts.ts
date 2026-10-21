import { photoUrl } from "./photos";

const styleId = "guest-fonts";

/**
 * Declares the signature script for the guest pages. Like the photos, the
 * font file lives in the public bucket rather than in git, its licence does
 * not allow passing it around; public/fonts holds a local copy (ignored by
 * git) for when no bucket is configured.
 */
export function addGuestFonts() {
  if (document.getElementById(styleId) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `@font-face { font-family: "Brigovin"; src: url("${photoUrl("fonts/Brigovin.woff2")}") format("woff2"); font-display: swap; }`;
  document.head.appendChild(style);
}
