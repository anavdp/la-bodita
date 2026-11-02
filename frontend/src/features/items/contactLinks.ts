/** Most vendors are in Venezuela, so a number written the local way (0414…) gets its code. */
const localCountryCode = "58";

/** A pasted link, with or without its https://. */
const linkPattern = /^(https?:\/\/|wa\.me\/|(api|web)\.whatsapp\.com\/)/i;

/**
 * A vendor's phone as a WhatsApp chat: a number typed any way (+58 414…, 0039…,
 * 0414-…) becomes a wa.me link, and a pasted WhatsApp link opens as it is.
 * Null when there is nothing to dial.
 */
export function whatsappLink(value: string): { label: string; href: string } | null {
  const trimmed = value.trim();
  if (linkPattern.test(trimmed)) {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(href);
    const number = url.hostname === "wa.me" ? url.pathname.split("/").find(Boolean) : url.searchParams.get("phone");
    const digits = number?.replace(/\D/g, "");
    return { label: digits ? `+${digits}` : "WhatsApp", href };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return { label: trimmed, href: `https://wa.me/${internationalDigits(trimmed, digits)}` };
}

function internationalDigits(typed: string, digits: string): string {
  if (typed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return localCountryCode + digits.slice(1);
  return digits;
}
